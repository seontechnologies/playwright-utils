import * as fs from 'node:fs'
import * as path from 'node:path'
// The package's own TypeScript dependency (5.x or 6.x), never the project's when the project
// uses TypeScript 7, which ships no JS API.
import * as ts from 'typescript'

/** Runtime files a TypeScript declaration file can describe */
const DECLARATION_RUNTIME_EXTENSIONS: Array<[RegExp, string[]]> = [
  [/\.d\.ts$/, ['.js', '.jsx']],
  [/\.d\.mts$/, ['.mjs']],
  [/\.d\.cts$/, ['.cjs']]
]

/** The alias settings of one tsconfig */
type AliasConfig = {
  paths: ts.MapLike<string[]>
  baseUrl: string | undefined
  /** Directory `paths` targets are relative to */
  pathsBase: string
}

type ResolutionContext = {
  options: ts.CompilerOptions
  cache: ts.ModuleResolutionCache
  /** The config, then the configs it references, in the order Playwright tries them */
  aliasConfigs: AliasConfig[]
}

/**
 * Resolves the files a source file imports, using TypeScript's import scanner and module
 * resolution. Like Playwright, each file resolves with its nearest tsconfig.json or
 * jsconfig.json, so `paths` aliases of nested configs apply. Works the same whatever TypeScript version the project uses.
 */
export class DependencyResolver {
  private readonly dependencyCache = new Map<string, string[]>()
  /** Keyed by tsconfig or jsconfig path; '' when no config applies */
  private readonly contexts = new Map<string, ResolutionContext>()
  private readonly configByDirectory = new Map<string, string>()

  /** Absolute paths of the project files `file` imports directly (node_modules excluded) */
  getDependencies(file: string): string[] {
    const cached = this.dependencyCache.get(file)
    if (cached) return cached

    const dependencies = this.resolveDependencies(file)
    this.dependencyCache.set(file, dependencies)
    return dependencies
  }

  private resolveDependencies(file: string): string[] {
    let source: string
    try {
      source = fs.readFileSync(file, 'utf-8')
    } catch {
      return []
    }

    const { importedFiles, referencedFiles } = ts.preProcessFile(
      source,
      true, // include `/// <reference>` directives
      true // include require() calls and dynamic import() of string literals
    )

    const specifiers = new Set(importedFiles.map(({ fileName }) => fileName))
    // preProcessFile misses `export * as name from '...'`
    const { statements } = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest
    )
    for (const statement of statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        specifiers.add(statement.moduleSpecifier.text)
      }
    }

    const dependencies = new Set<string>()
    for (const specifier of specifiers) {
      for (const resolved of this.resolveModule(specifier, file)) {
        dependencies.add(resolved)
      }
    }
    for (const { fileName: reference } of referencedFiles) {
      const resolved = path.resolve(path.dirname(file), reference)
      if (fs.existsSync(resolved)) dependencies.add(resolved)
    }
    return [...dependencies]
  }

  private resolveModule(specifier: string, containingFile: string): string[] {
    const resolved = new Set<string>()

    const typeScriptFile = this.resolveWithTypeScript(specifier, containingFile)
    if (typeScriptFile) {
      resolved.add(typeScriptFile)
      // TypeScript prefers a declaration file over the JavaScript next to it, but the
      // JavaScript is what runs, so both count as dependencies.
      findRuntimeFiles(typeScriptFile).forEach((file) => resolved.add(file))
    }

    // The file Playwright loads, which differs from TypeScript's pick when for example
    // helper.js and helper.ts both exist. Also covers assets TypeScript does not resolve.
    // `bases` are the paths the import names before extensions are applied.
    const { runtimeFile, bases } = isRelative(specifier)
      ? resolveRelativeImport(
          path.resolve(path.dirname(containingFile), specifier)
        )
      : resolveAliasImport(
          specifier,
          this.getContext(containingFile).aliasConfigs
        )
    if (runtimeFile) resolved.add(runtimeFile)

    // Edges to the paths the import could load that do not exist. When one of them is a
    // deleted file, the deletion changed what the import loads (or broke it), so the specs
    // importing it are selected.
    bases
      .flatMap(importCandidates)
      .filter((file) => !fs.existsSync(file))
      .forEach((file) => resolved.add(file))

    return [...resolved].filter((file) => !isInNodeModules(file))
  }

  private resolveWithTypeScript(
    specifier: string,
    containingFile: string
  ): string | undefined {
    const { options, cache } = this.getContext(containingFile)
    const { resolvedModule } = ts.resolveModuleName(
      specifier,
      containingFile,
      options,
      ts.sys,
      cache
    )
    return resolvedModule && path.resolve(resolvedModule.resolvedFileName)
  }

  private getContext(file: string): ResolutionContext {
    const directory = path.dirname(file)
    let configFile = this.configByDirectory.get(directory)
    if (configFile === undefined) {
      configFile = findNearestConfig(directory)
      this.configByDirectory.set(directory, configFile)
    }

    let context = this.contexts.get(configFile)
    if (!context) {
      const { options } = loadConfig(configFile)
      context = {
        options,
        aliasConfigs: loadAliasConfigs(configFile),
        cache: ts.createModuleResolutionCache(
          path.dirname(configFile || file),
          (fileName) => toComparablePath(fileName),
          options
        )
      }
      this.contexts.set(configFile, context)
    }
    return context
  }
}

/** Normalizes an absolute path for equality checks on this platform's file system */
export function toComparablePath(file: string): string {
  const normalized = path.normalize(file)
  return ts.sys.useCaseSensitiveFileNames
    ? normalized
    : normalized.toLowerCase()
}

function isInNodeModules(file: string): boolean {
  return file.split(path.sep).includes('node_modules')
}

type ImportResolution = {
  /** The file the import loads, if it exists */
  runtimeFile: string | undefined
  /** Paths the import names before extensions are applied */
  bases: string[]
}

function resolveRelativeImport(base: string): ImportResolution {
  return { runtimeFile: resolveLikePlaywright(base), bases: [base] }
}

/**
 * Mirrors Playwright's resolution of a bare specifier through tsconfig `paths`, with `baseUrl`
 * acting as a final `*` pattern. Configs are tried in order and the first one that resolves
 * wins; within a config the pattern with the longest prefix wins, and among its targets the
 * last one that exists.
 */
function resolveAliasImport(
  specifier: string,
  aliasConfigs: AliasConfig[]
): ImportResolution {
  let runtimeFile: string | undefined
  const bases: string[] = []

  for (const { paths, baseUrl, pathsBase } of aliasConfigs) {
    const patterns = Object.entries(paths)
    if (baseUrl) patterns.push(['*', ['*']])

    let configFile: string | undefined
    let longestPrefix = -1
    for (const [pattern, targets] of patterns) {
      const [prefix = '', suffix = ''] = pattern.split('*')
      let capture = specifier
      if (pattern.includes('*')) {
        if (
          specifier.length < prefix.length + suffix.length ||
          !specifier.startsWith(prefix) ||
          !specifier.endsWith(suffix)
        ) {
          continue
        }
        capture = specifier.slice(
          prefix.length,
          specifier.length - suffix.length
        )
      } else if (pattern !== specifier) {
        continue
      }

      const patternBases = targets.map((target) =>
        path.resolve(pathsBase, target.replace('*', capture))
      )
      bases.push(...patternBases)
      if (prefix.length <= longestPrefix) continue

      for (const base of patternBases) {
        const file = resolveLikePlaywright(base)
        if (file) {
          longestPrefix = prefix.length
          configFile = file
        }
      }
    }
    runtimeFile ??= configFile
  }
  return { runtimeFile, bases }
}

/**
 * Alias settings of a config and, after it, of the configs it references (each config's own
 * references before it), the order Playwright loads them in
 */
function loadAliasConfigs(configFile: string): AliasConfig[] {
  if (!configFile) return []

  const referenced: AliasConfig[] = []
  const visited = new Set<string>()
  const load = (file: string): AliasConfig => {
    visited.add(file)
    const { options, references } = loadConfig(file)
    for (const reference of references) {
      if (!visited.has(reference)) referenced.push(load(reference))
    }
    return {
      paths: options.paths ?? {},
      baseUrl: options.baseUrl,
      pathsBase:
        options.baseUrl ??
        (options as { pathsBasePath?: string }).pathsBasePath ??
        path.dirname(file)
    }
  }
  const main = load(configFile)
  return [main, ...referenced]
}

/** The nearest tsconfig.json or jsconfig.json, in Playwright's order; '' when none */
function findNearestConfig(directory: string): string {
  for (let current = directory; ; current = path.dirname(current)) {
    for (const name of ['tsconfig.json', 'jsconfig.json']) {
      const config = path.join(current, name)
      if (isFile(config)) return config
    }
    if (path.dirname(current) === current) return ''
  }
}

function isRelative(specifier: string): boolean {
  return /^\.\.?(\/|$)/.test(specifier)
}

/** Extensions Playwright tries for an import specifier, keyed by the specifier's extension */
const PLAYWRIGHT_EXTENSION_LOOKUPS: Array<[string, string[]]> = [
  ['.js', ['.jsx', '.ts', '.tsx']],
  ['.jsx', ['.tsx']],
  ['.cjs', ['.cts']],
  ['.mjs', ['.mts']],
  ['', ['.js', '.ts', '.jsx', '.tsx', '.cjs', '.mjs', '.cts', '.mts']]
]

/** The specifier itself, then the alternatives Playwright tries for it, in Playwright's order */
function extensionCandidates(base: string): string[] {
  const [extension, alternatives] = PLAYWRIGHT_EXTENSION_LOOKUPS.find(
    ([extension]) => base.endsWith(extension)
  )!
  const stem = base.slice(0, base.length - extension.length)
  return [base, ...alternatives.map((alternative) => stem + alternative)]
}

function isFile(file: string): boolean {
  return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false
}

function isDirectory(file: string): boolean {
  return fs.statSync(file, { throwIfNoEntry: false })?.isDirectory() ?? false
}

/** The `main` entry of a directory's package.json, resolved against the directory */
function packageMain(directory: string): string | undefined {
  try {
    const { main } = JSON.parse(
      fs.readFileSync(path.join(directory, 'package.json'), 'utf-8')
    )
    return typeof main === 'string' ? path.resolve(directory, main) : undefined
  } catch {
    return undefined
  }
}

/** Files Playwright (then Node, for a package directory) tries for an import, in order */
function importCandidates(base: string): string[] {
  const candidates = extensionCandidates(base)
  if (isDirectory(base)) {
    const main = packageMain(base)
    if (main) candidates.push(...extensionCandidates(main))
  }
  candidates.push(...extensionCandidates(path.join(base, 'index')))
  return candidates
}

/** The file an import loads at runtime, mirroring Playwright's resolution */
function resolveLikePlaywright(base: string): string | undefined {
  return importCandidates(base).find(isFile)
}

function findRuntimeFiles(declarationFile: string): string[] {
  for (const [pattern, extensions] of DECLARATION_RUNTIME_EXTENSIONS) {
    if (pattern.test(declarationFile)) {
      return extensions
        .map((extension) => declarationFile.replace(pattern, extension))
        .filter((file) => fs.existsSync(file))
    }
  }
  return []
}

function loadConfig(configFile: string): {
  options: ts.CompilerOptions
  references: string[]
} {
  let projectOptions: ts.CompilerOptions = {}
  let references: string[] = []

  if (configFile) {
    const { config, error } = ts.readConfigFile(configFile, ts.sys.readFile)
    if (error) {
      console.warn(
        `⚠️  Could not read ${configFile}, resolving imports without it: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`
      )
    } else {
      // Option errors (for example options only newer TypeScript versions know) are ignored:
      // only the options that affect module resolution matter here.
      const parsed = ts.parseJsonConfigFileContent(
        config,
        ts.sys,
        path.dirname(configFile),
        undefined,
        configFile
      )
      projectOptions = parsed.options
      references = (parsed.projectReferences ?? [])
        .map((reference) => ts.resolveProjectReferencePath(reference))
        .filter(isFile)
    }
  }

  const options: ts.CompilerOptions = {
    ...projectOptions,
    // Bundler resolution accepts every import style test runners load: extensionless relative
    // imports, `.js` specifiers pointing at `.ts` files, `.ts` specifiers, directory indexes,
    // and `paths` aliases.
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    noEmit: true
  }
  return { options, references }
}
