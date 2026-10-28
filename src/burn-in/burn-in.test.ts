import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { BurnInAnalyzer, toFileFilter } from './core/analyzer'
import { DependencyResolver, toComparablePath } from './core/dependency-graph'
import { parseShard, parseTestWeights, partitionTests } from './core/shard'
import { runBurnIn } from './runner'
import type { BurnInConfig, BurnInShardOption } from './core/types'

/**
 * Each test builds a throwaway git repository shaped like a consumer project: a `main` branch,
 * a feature branch with changes, and burn-in running from inside the project.
 */

const config: BurnInConfig = {
  testPatterns: ['**/*.spec.ts'],
  skipBurnInPatterns: []
}

let repo: string
const originalCwd = process.cwd()
const originalEnv = {
  PW_SHARD: process.env.PW_SHARD,
  PW_BURN_IN: process.env.PW_BURN_IN,
  PLAYWRIGHT_JSON_OUTPUT_FILE: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE
}

function restoreEnv() {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
}

function git(...args: string[]) {
  execFileSync('git', args, { cwd: repo, stdio: 'pipe' })
}

function write(files: Record<string, string>) {
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(repo, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
}

function commit(message: string) {
  git('add', '-A')
  git(
    '-c',
    'user.email=t@t',
    '-c',
    'user.name=t',
    'commit',
    '--allow-empty',
    '-qm',
    message
  )
}

/** Commits `base` on main, then commits `change` on a feature branch */
function createRepo(
  base: Record<string, string>,
  change: Record<string, string>
) {
  repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'burn-in-')))
  git('init', '-q', '-b', 'main')
  write(base)
  commit('base')
  git('checkout', '-qb', 'feature')
  write(change)
  commit('change')
}

async function selectTests(cwd = repo): Promise<string[] | null> {
  process.chdir(cwd)
  const analyzer = new BurnInAnalyzer(config, {})
  const plan = await analyzer.analyzeTestableDependencies(
    analyzer.getChangedFiles('main')
  )
  return plan.tests && [...plan.tests].sort()
}

beforeEach(() => {
  // Each test starts without the variables, even if the shell or CI job exports them
  for (const name of Object.keys(originalEnv)) delete process.env[name]
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  restoreEnv()
  process.chdir(originalCwd)
  jest.restoreAllMocks()
  if (repo) fs.rmSync(repo, { recursive: true, force: true })
})

describe('burn-in test selection', () => {
  it('selects specs that import a changed helper, directly or transitively', async () => {
    createRepo(
      {
        'tsconfig.json': '{}',
        'tests/support/helper.ts': 'export const helper = 1\n',
        'tests/support/fixtures.ts':
          'import { helper } from "./helper"\nexport const fixture = helper\n',
        'tests/direct.spec.ts': 'import { helper } from "./support/helper"\n',
        'tests/nested/transitive.spec.ts':
          'import { fixture } from "../support/fixtures"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/helper.ts': 'export const helper = 2\n' }
    )

    expect(await selectTests()).toEqual([
      'tests/direct.spec.ts',
      'tests/nested/transitive.spec.ts'
    ])
  })

  it('resolves tsconfig path aliases, .js specifiers and type-only imports', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({
          compilerOptions: { paths: { '@support/*': ['./tests/support/*'] } }
        }),
        'tests/support/alias.ts': 'export const alias = 1\n',
        'tests/support/esm.ts': 'export const esm = 1\n',
        'tests/support/shape.ts': 'export type Shape = { a: number }\n',
        'tests/alias.spec.ts': 'import { alias } from "@support/alias"\n',
        'tests/esm.spec.ts': 'import { esm } from "./support/esm.js"\n',
        'tests/type.spec.ts': 'import type { Shape } from "./support/shape"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {
        'tests/support/alias.ts': 'export const alias = 2\n',
        'tests/support/esm.ts': 'export const esm = 2\n',
        'tests/support/shape.ts': 'export type Shape = { a: string }\n'
      }
    )

    expect(await selectTests()).toEqual([
      'tests/alias.spec.ts',
      'tests/esm.spec.ts',
      'tests/type.spec.ts'
    ])
  })

  it('does not select specs importing a different file with the same name', async () => {
    createRepo(
      {
        'tests/support/index.ts': 'export const a = 1\n',
        'tests/pages/index.ts': 'export const b = 1\n',
        'tests/support.spec.ts': 'import { a } from "./support"\n',
        'tests/pages.spec.ts': 'import { b } from "./pages"\n'
      },
      { 'tests/support/index.ts': 'export const a = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/support.spec.ts'])
  })

  it('selects specs whose JavaScript helper changed when a declaration file sits next to it', async () => {
    createRepo(
      {
        'tests/support/legacy.js': 'module.exports = { legacy: 1 }\n',
        'tests/support/legacy.d.ts': 'export declare const legacy: number\n',
        'tests/legacy.spec.ts': 'import { legacy } from "./support/legacy"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/legacy.js': 'module.exports = { legacy: 2 }\n' }
    )

    expect(await selectTests()).toEqual(['tests/legacy.spec.ts'])
  })

  it('follows the file Playwright loads when a .js and a .ts helper share a name', async () => {
    createRepo(
      {
        'tests/support/twin.js': 'export const twin = 1\n',
        'tests/support/twin.ts': 'export const twin = 1\n',
        'tests/twin.spec.ts': 'import { twin } from "./support/twin"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/twin.js': 'export const twin = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/twin.spec.ts'])
  })

  it('selects specs that still import a deleted helper', async () => {
    createRepo(
      {
        'tests/support/gone.ts': 'export const gone = 1\n',
        'tests/support/folder/index.ts': 'export const folder = 1\n',
        'tests/gone.spec.ts': 'import { gone } from "./support/gone.js"\n',
        'tests/folder.spec.ts': 'import { folder } from "./support/folder"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {}
    )
    git('rm', '-q', 'tests/support/gone.ts', 'tests/support/folder/index.ts')
    commit('delete helpers')

    expect(await selectTests()).toEqual([
      'tests/folder.spec.ts',
      'tests/gone.spec.ts'
    ])
  })

  it('selects specs that still import a renamed helper', async () => {
    createRepo(
      {
        'tests/support/old.ts': 'export const old = 1\n',
        'tests/old.spec.ts': 'import { old } from "./support/old"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {}
    )
    git('mv', 'tests/support/old.ts', 'tests/support/new.ts')
    commit('rename helper')

    expect(await selectTests()).toEqual(['tests/old.spec.ts'])
  })

  it('selects specs importing a deleted JavaScript helper whose declaration file remains', async () => {
    createRepo(
      {
        'tests/support/legacy.js': 'module.exports = { legacy: 1 }\n',
        'tests/support/legacy.d.ts': 'export declare const legacy: number\n',
        'tests/legacy.spec.ts': 'import { legacy } from "./support/legacy"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {}
    )
    git('rm', '-q', 'tests/support/legacy.js')
    commit('delete runtime helper')

    expect(await selectTests()).toEqual(['tests/legacy.spec.ts'])
  })

  it('applies Playwright resolution and deletion handling to tsconfig path aliases', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({
          compilerOptions: { paths: { '@support/*': ['./tests/support/*'] } }
        }),
        'tests/support/twin.js': 'export const twin = 1\n',
        'tests/support/twin.ts': 'export const twin = 1\n',
        'tests/support/gone.ts': 'export const gone = 1\n',
        'tests/twin.spec.ts': 'import { twin } from "@support/twin"\n',
        'tests/gone.spec.ts': 'import { gone } from "@support/gone"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/twin.js': 'export const twin = 2\n' }
    )
    git('rm', '-q', 'tests/support/gone.ts')
    commit('delete aliased helper')

    expect(await selectTests()).toEqual([
      'tests/gone.spec.ts',
      'tests/twin.spec.ts'
    ])
  })

  it('selects specs whose import switches files because the file it loaded was deleted', async () => {
    createRepo(
      {
        'tests/support/twin.js': 'export const twin = 1\n',
        'tests/support/twin.ts': 'export const twin = 1\n',
        'tests/twin.spec.ts': 'import { twin } from "./support/twin"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {}
    )
    git('rm', '-q', 'tests/support/twin.js')
    commit('delete the loaded twin')

    expect(await selectTests()).toEqual(['tests/twin.spec.ts'])
  })

  it('resolves imports through baseUrl without a paths entry', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({
          compilerOptions: { baseUrl: './tests' }
        }),
        'tests/support/base.ts': 'export const base = 1\n',
        'tests/base.spec.ts': 'import { base } from "support/base"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/base.ts': 'export const base = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/base.spec.ts'])
  })

  it('follows the main entry of a directory package, beside its types', async () => {
    createRepo(
      {
        'tests/lib/package.json': JSON.stringify({
          main: './dist/index.js',
          types: './types/index.d.ts'
        }),
        'tests/lib/dist/index.js': 'exports.lib = 1\n',
        'tests/lib/types/index.d.ts': 'export declare const lib: number\n',
        'tests/lib.spec.ts': 'import { lib } from "./lib"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/lib/dist/index.js': 'exports.lib = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/lib.spec.ts'])
  })

  it('follows namespace re-exports through barrel files', async () => {
    createRepo(
      {
        'tests/support/helper.ts': 'export const helper = 1\n',
        'tests/support/index.ts': 'export * as helpers from "./helper"\n',
        'tests/types/shape.ts': 'export type Shape = { a: number }\n',
        'tests/types/index.ts': 'export type * as shapes from "./shape"\n',
        'tests/barrel.spec.ts': 'import { helpers } from "./support"\n',
        'tests/type-barrel.spec.ts': 'import type { shapes } from "./types"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      {
        'tests/support/helper.ts': 'export const helper = 2\n',
        'tests/types/shape.ts': 'export type Shape = { a: string }\n'
      }
    )

    expect(await selectTests()).toEqual([
      'tests/barrel.spec.ts',
      'tests/type-barrel.spec.ts'
    ])
  })

  it('follows the alias target Playwright picks: the last existing one', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            paths: { '@lib/*': ['./first/*', './second/*'] }
          }
        }),
        'first/helper.ts': 'export const helper = 1\n',
        'second/helper.ts': 'export const helper = 1\n',
        'tests/lib.spec.ts': 'import { helper } from "@lib/helper"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'second/helper.ts': 'export const helper = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/lib.spec.ts'])
  })

  it('reads path aliases from configs a solution-style tsconfig references', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({
          files: [],
          references: [{ path: './tsconfig.e2e.json' }]
        }),
        'tsconfig.e2e.json': JSON.stringify({
          compilerOptions: { paths: { '@support/*': ['./tests/support/*'] } }
        }),
        'tests/support/helper.ts': 'export const helper = 1\n',
        'tests/ref.spec.ts': 'import { helper } from "@support/helper"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/helper.ts': 'export const helper = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/ref.spec.ts'])
  })

  it('reads path aliases from jsconfig.json', async () => {
    createRepo(
      {
        'jsconfig.json': JSON.stringify({
          compilerOptions: { paths: { '@support/*': ['./tests/support/*'] } }
        }),
        'tests/support/helper.js': 'export const helper = 1\n',
        'tests/js.spec.ts': 'import { helper } from "@support/helper"\n',
        'tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'tests/support/helper.js': 'export const helper = 2\n' }
    )

    expect(await selectTests()).toEqual(['tests/js.spec.ts'])
  })

  it('resolves each file with its nearest tsconfig, like Playwright', async () => {
    createRepo(
      {
        'tsconfig.json': JSON.stringify({ compilerOptions: {} }),
        'e2e/tsconfig.json': JSON.stringify({
          compilerOptions: { paths: { '@helpers/*': ['./helpers/*'] } }
        }),
        'e2e/helpers/login.ts': 'export const login = 1\n',
        'e2e/tests/login.spec.ts': 'import { login } from "@helpers/login"\n',
        'e2e/tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'e2e/helpers/login.ts': 'export const login = 2\n' }
    )

    expect(await selectTests()).toEqual(['e2e/tests/login.spec.ts'])
  })

  it('works from a subdirectory of the repository', async () => {
    createRepo(
      {
        'shared/helper.ts': 'export const helper = 1\n',
        'e2e/tests/uses-shared.spec.ts':
          'import { helper } from "../../shared/helper"\n',
        'e2e/tests/unrelated.spec.ts': 'export {}\n'
      },
      { 'shared/helper.ts': 'export const helper = 2\n' }
    )

    expect(await selectTests(path.join(repo, 'e2e'))).toEqual([
      'tests/uses-shared.spec.ts'
    ])
  })

  it('matches changed files against patterns from the working directory', () => {
    createRepo(
      {
        'e2e/docs/notes.md': 'old\n',
        'e2e/tests/changed.spec.ts': 'export {}\n'
      },
      {
        'e2e/docs/notes.md': 'new\n',
        'e2e/tests/changed.spec.ts': 'export const changed = true\n'
      }
    )
    process.chdir(path.join(repo, 'e2e'))
    const analyzer = new BurnInAnalyzer(
      {
        testPatterns: ['tests/*.spec.ts'],
        skipBurnInPatterns: ['docs/**']
      },
      {}
    )

    expect(analyzer.getChangedFiles('main')).toMatchObject({
      testFiles: ['e2e/tests/changed.spec.ts'],
      skipBurnInFiles: ['e2e/docs/notes.md'],
      otherFiles: []
    })
  })

  it('reads file names with spaces and shell syntax verbatim', async () => {
    const weird = 'tests/a b;$(echo x)"q".spec.ts'
    createRepo({ [weird]: 'export {}\n' }, { [weird]: 'export const x = 1\n' })

    expect(await selectTests()).toEqual([weird])
  })
})

describe('runBurnIn', () => {
  /**
   * Installs a stand-in Playwright CLI. A run records its arguments in `playwright-args.json`.
   * `--list` answers with a JSON report built from `listed` (test count per file, relative to
   * the repository) and records its arguments and the PW_BURN_IN it saw in
   * `playwright-list.json`. With `listed` null, `--list` fails.
   */
  function installFakePlaywright(
    listed: Record<string, number> | null = {},
    configuredRepeat: Record<string, number> = {}
  ) {
    const argsFile = path.join(repo, 'playwright-args.json')
    const listFile = path.join(repo, 'playwright-list.json')
    const cli = `
const fs = require('fs')
const args = process.argv.slice(2)
if (args.includes('--list')) {
  fs.writeFileSync(${JSON.stringify(listFile)}, JSON.stringify({ args, burnIn: process.env.PW_BURN_IN }))
  const listed = ${JSON.stringify(listed)}
  if (listed === null) {
    console.error('config exploded')
    process.exit(1)
  }
  // A project's configured repeatEach multiplies its tests, unless --repeat-each overrides it
  const configuredRepeat = ${JSON.stringify(configuredRepeat)}
  const suites = Object.entries(listed).map(([file, listedCount]) => ({
    file,
    specs: Array.from({ length: args.some((arg) => arg.startsWith('--repeat-each=')) ? listedCount : listedCount * (configuredRepeat[file] ?? 1) }, (_, index) => ({
      file,
      title: 'test ' + index,
      tests: [{ projectName: 'chromium' }]
    })),
    suites: []
  }))
  fs.writeFileSync(
    // Playwright gives the _FILE variable precedence over _NAME
    process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || process.env.PLAYWRIGHT_JSON_OUTPUT_NAME,
    JSON.stringify({ config: { rootDir: ${JSON.stringify(repo)} }, suites, errors: [] })
  )
} else {
  fs.writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(args))
}
`
    write({
      'node_modules/@playwright/test/package.json': JSON.stringify({
        name: '@playwright/test',
        bin: { playwright: 'cli.js' },
        exports: { './cli': './cli.js' }
      }),
      'node_modules/@playwright/test/cli.js': `#!/usr/bin/env node\n${cli}`,
      '.gitignore': 'node_modules\nplaywright-args.json\nplaywright-list.json\n'
    })
    const bin = path.join(repo, 'node_modules/.bin/playwright')
    fs.mkdirSync(path.dirname(bin), { recursive: true })
    fs.symlinkSync('../@playwright/test/cli.js', bin)
    fs.chmodSync(path.join(repo, 'node_modules/@playwright/test/cli.js'), 0o755)
    return argsFile
  }

  it('passes each selected file to Playwright as one literal argument without a shell', async () => {
    const injected = 'tests/x;touch INJECTED;.spec.ts'
    const spaced = 'tests/with space (1).spec.ts'
    const dashed = '--grep=none.spec.ts'
    const selected = [injected, spaced, dashed]
    // Unchanged specs a loose filter for a selected file would also match
    const decoys = [
      'tests/old-tests/with space (1).spec.ts',
      'tests/with space (1)Xspec.ts.spec.ts',
      'other/--grep=none.spec.ts'
    ]
    createRepo(
      Object.fromEntries(
        [...selected, ...decoys].map((file) => [file, 'export {}\n'])
      ),
      Object.fromEntries(selected.map((file) => [file, 'export const a = 1\n']))
    )
    const argsFile = installFakePlaywright()
    commit('ignore')
    process.chdir(repo)

    await runBurnIn({ baseBranch: 'main', configPath: 'missing.config.ts' })

    expect(fs.existsSync(path.join(repo, 'INJECTED'))).toBe(false)
    const args: string[] = JSON.parse(fs.readFileSync(argsFile, 'utf-8'))
    expect(args[0]).toBe('test')
    expect(args.slice(-2)).toEqual(['--repeat-each=3', '--retries=0'])

    // Playwright turns each file argument into `new RegExp(arg, 'gi')` and tests it against
    // absolute file paths: each argument must match its own file and nothing else
    expect(args[1]).toBe('--shard=1/1')
    const filters = args.slice(2, -2)
    expect(filters).toHaveLength(selected.length)
    const candidates = [...selected, ...decoys].map((file) =>
      path.join(repo, file)
    )
    const matched = filters.map((filter) =>
      candidates.filter((file) => new RegExp(filter, 'gi').test(file))
    )
    expect(matched.flat().sort()).toEqual(
      selected.map((file) => path.join(repo, file)).sort()
    )
    expect(filters.every((filter) => !filter.startsWith('-'))).toBe(true)
  })

  describe('sharding', () => {
    const counts: Record<string, number> = {
      'tests/a.spec.ts': 5,
      'tests/b.spec.ts': 4,
      'tests/c.spec.ts': 3,
      'tests/d.spec.ts': 3,
      'tests/e.spec.ts': 2,
      'tests/f.spec.ts': 2,
      'tests/g.spec.ts': 1
    }
    const files = Object.keys(counts)

    /** A feature branch where every spec changed, with the fake Playwright installed */
    function setUpChangedSpecs(listed: Record<string, number> | null = counts) {
      createRepo(
        Object.fromEntries(files.map((file) => [file, 'export {}\n'])),
        Object.fromEntries(files.map((file) => [file, 'export const a = 1\n']))
      )
      const argsFile = installFakePlaywright(listed)
      commit('fake playwright')
      process.chdir(repo)
      return argsFile
    }

    const readJson = (file: string): string[] =>
      JSON.parse(fs.readFileSync(file, 'utf-8'))

    /** The spec files a recorded Playwright run was given */
    function filesRun(args: string[]): string[] {
      return files.filter((file) => args.includes(toFileFilter(file)))
    }

    async function runLeg(
      argsFile: string,
      shard?: BurnInShardOption
    ): Promise<string[] | null> {
      fs.rmSync(argsFile, { force: true })
      await runBurnIn({
        baseBranch: 'main',
        configPath: 'missing.config.ts',
        shard
      })
      return fs.existsSync(argsFile) ? readJson(argsFile) : null
    }

    const sum = (legFiles: string[]) =>
      legFiles.reduce((total, file) => total + (counts[file] ?? 0), 0)

    it('gives each leg disjoint, balanced files whose union is the selection', async () => {
      const argsFile = setUpChangedSpecs()

      const first = await runLeg(argsFile, { index: 1, total: 2 })
      const second = await runLeg(argsFile, { index: 2, total: 2 })

      expect(first && second).not.toBeNull()
      const firstFiles = filesRun(first ?? [])
      const secondFiles = filesRun(second ?? [])
      expect(firstFiles).toEqual([
        'tests/a.spec.ts',
        'tests/d.spec.ts',
        'tests/f.spec.ts'
      ])
      expect([...firstFiles, ...secondFiles].sort()).toEqual(files)
      expect(Math.abs(sum(firstFiles) - sum(secondFiles))).toBeLessThanOrEqual(
        1
      )
      // Burn-in flags are unchanged and every leg runs under --shard=1/1, once
      for (const args of [first ?? [], second ?? []]) {
        expect(args[0]).toBe('test')
        expect(args.slice(-2)).toEqual(['--repeat-each=3', '--retries=0'])
        expect(args.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=1/1'
        ])
      }
    })

    it('reads the listing even when the consumer sets PLAYWRIGHT_JSON_OUTPUT_FILE', async () => {
      const argsFile = setUpChangedSpecs()
      const consumerReport = path.join(repo, 'consumer-report.json')
      process.env.PLAYWRIGHT_JSON_OUTPUT_FILE = consumerReport

      const args = await runLeg(argsFile, { index: 1, total: 2 })

      expect(filesRun(args ?? []).length).toBeGreaterThan(0)
      expect(fs.existsSync(consumerReport)).toBe(false)
    })

    it('leaves files Playwright lists no tests for out of the partition', async () => {
      const unlisted = ['tests/f.spec.ts', 'tests/g.spec.ts']
      const argsFile = setUpChangedSpecs(
        Object.fromEntries(
          Object.entries(counts).filter(([file]) => !unlisted.includes(file))
        )
      )
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const runs = [
        await runLeg(argsFile, { index: 1, total: 2 }),
        await runLeg(argsFile, { index: 2, total: 2 })
      ]

      const run = runs.flatMap((args) => filesRun(args ?? []))
      expect(run.sort()).toEqual(
        files.filter((file) => !unlisted.includes(file))
      )
      expect(warn).toHaveBeenCalledTimes(2)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('tests/f.spec.ts, tests/g.spec.ts')
      )
    })

    it('treats a leg holding only unlisted files as empty and succeeds', async () => {
      createRepo(
        { 'tests/a.spec.ts': 'export {}\n', 'tests/b.spec.ts': 'export {}\n' },
        {
          'tests/a.spec.ts': 'export const a = 1\n',
          'tests/b.spec.ts': 'export const a = 1\n'
        }
      )
      const argsFile = installFakePlaywright({ 'tests/a.spec.ts': 2 })
      commit('fake playwright')
      process.chdir(repo)
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      const exit = jest.spyOn(process, 'exit')

      const first = await runLeg(argsFile, { index: 1, total: 2 })
      const second = await runLeg(argsFile, { index: 2, total: 2 })

      expect(first).not.toBeNull()
      expect(second).toBeNull()
      expect(exit).not.toHaveBeenCalled()
    })

    it('weighs files by their tests before repeats, whatever repeatEach the config sets', async () => {
      const eight = Array.from({ length: 8 }, (_, i) => `tests/one${i}.spec.ts`)
      createRepo(
        Object.fromEntries(eight.map((file) => [file, 'export {}\n'])),
        Object.fromEntries(eight.map((file) => [file, 'export const a = 1\n']))
      )
      const argsFile = installFakePlaywright(
        Object.fromEntries(eight.map((file) => [file, 1])),
        { 'tests/one0.spec.ts': 20 }
      )
      commit('fake playwright')
      process.chdir(repo)

      const legs = [
        await runLeg(argsFile, { index: 1, total: 2 }),
        await runLeg(argsFile, { index: 2, total: 2 })
      ].map((args) => (args ?? []).filter((arg) => arg.startsWith('^')))

      expect(legs.map((leg) => leg.length)).toEqual([4, 4])
      expect(
        fs.readFileSync(path.join(repo, 'playwright-list.json'), 'utf-8')
      ).toContain('--repeat-each=1')
    })

    it('lists the selected tests under the burn-in environment', async () => {
      const argsFile = setUpChangedSpecs()
      delete process.env.PW_BURN_IN

      await runLeg(argsFile, { index: 1, total: 2 })

      const listed = JSON.parse(
        fs.readFileSync(path.join(repo, 'playwright-list.json'), 'utf-8')
      )
      expect(listed.burnIn).toBe('true')
      expect(listed.args.slice(0, 3)).toEqual([
        'test',
        '--list',
        '--reporter=json'
      ])
      expect(listed.args[3]).toBe('--repeat-each=1')
      // Overrides a shard in the consumer's playwright.config.ts
      expect(listed.args[4]).toBe('--shard=1/1')
      expect(listed.args.slice(5).sort()).toEqual(
        files.map((file) => toFileFilter(file)).sort()
      )
    })

    it('accepts the shard as an i/n string, like the object form', async () => {
      const argsFile = setUpChangedSpecs()
      const fromObject = await runLeg(argsFile, { index: 2, total: 2 })

      const fromString = await runLeg(argsFile, '2/2')

      expect(fromString).toEqual(fromObject)
      expect(filesRun(fromString ?? [])).toEqual([
        'tests/b.spec.ts',
        'tests/c.spec.ts',
        'tests/e.spec.ts',
        'tests/g.spec.ts'
      ])
    })

    it.each(['3/2', '0/2', 'a/b', ''])(
      'throws a clear error for the shard option %j',
      async (value) => {
        const argsFile = setUpChangedSpecs()

        await expect(runLeg(argsFile, value)).rejects.toThrow(
          new RegExp(`Invalid shard "${value}".*i/n`)
        )
        expect(fs.existsSync(argsFile)).toBe(false)
      }
    )

    describe.each([
      ['no shard', undefined],
      ['a total of 1', '1/1'],
      ['an object with a total of 1', { index: 1, total: 1 }]
    ])('with %s', (_name, shard) => {
      it('runs every selected file without listing tests', async () => {
        const argsFile = setUpChangedSpecs()

        const args = await runLeg(argsFile, shard)

        expect(filesRun(args ?? [])).toEqual(files)
        expect(args?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=1/1'
        ])
        expect(fs.existsSync(path.join(repo, 'playwright-list.json'))).toBe(
          false
        )
      })
    })

    it('runs every selected file for PW_SHARD=1/1 without listing tests', async () => {
      const argsFile = setUpChangedSpecs()
      process.env.PW_SHARD = '1/1'

      const args = await runLeg(argsFile)

      expect(filesRun(args ?? [])).toEqual(files)
      expect(fs.existsSync(path.join(repo, 'playwright-list.json'))).toBe(false)
    })

    it('reads the shard from PW_SHARD when no option is given', async () => {
      const argsFile = setUpChangedSpecs()
      const fromOption = await runLeg(argsFile, { index: 2, total: 2 })

      process.env.PW_SHARD = '2/2'
      const fromEnv = await runLeg(argsFile)

      expect(fromEnv).toEqual(fromOption)
      expect(filesRun(fromEnv ?? [])).toEqual([
        'tests/b.spec.ts',
        'tests/c.spec.ts',
        'tests/e.spec.ts',
        'tests/g.spec.ts'
      ])
    })

    it('uses the option over PW_SHARD and warns once about the ignored variable', async () => {
      const argsFile = setUpChangedSpecs()
      const fromOption = await runLeg(argsFile, { index: 1, total: 2 })
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      process.env.PW_SHARD = '2/2'
      const both = await runLeg(argsFile, { index: 1, total: 2 })

      expect(both).toEqual(fromOption)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('PW_SHARD="2/2"')
      )
    })

    it('runs nothing and succeeds for a leg beyond the number of files', async () => {
      createRepo(
        { 'tests/a.spec.ts': 'export {}\n', 'tests/b.spec.ts': 'export {}\n' },
        {
          'tests/a.spec.ts': 'export const a = 1\n',
          'tests/b.spec.ts': 'export const a = 1\n'
        }
      )
      const argsFile = installFakePlaywright({
        'tests/a.spec.ts': 1,
        'tests/b.spec.ts': 1
      })
      commit('fake playwright')
      process.chdir(repo)
      const exit = jest.spyOn(process, 'exit')

      const emptyLeg = await runLeg(argsFile, { index: 5, total: 5 })
      const busyLeg = await runLeg(argsFile, { index: 1, total: 5 })

      expect(emptyLeg).toBeNull()
      expect(exit).not.toHaveBeenCalled()
      expect(busyLeg).not.toBeNull()
    })

    it.each(['3/2', '0/2', 'a/b', '1/0', '1.5/2', '1/2/3'])(
      'throws a clear error for PW_SHARD=%s',
      async (value) => {
        const argsFile = setUpChangedSpecs()
        process.env.PW_SHARD = value

        await expect(runLeg(argsFile)).rejects.toThrow(
          new RegExp(`Invalid shard "${value}".*i/n`)
        )
        expect(fs.existsSync(argsFile)).toBe(false)
      }
    )

    it('throws a clear error for an invalid shard option', async () => {
      const argsFile = setUpChangedSpecs()

      await expect(runLeg(argsFile, { index: 3, total: 2 })).rejects.toThrow(
        /Invalid shard "3\/2".*i\/n/
      )
    })

    it('throws when the tests cannot be listed', async () => {
      const argsFile = setUpChangedSpecs(null)

      await expect(runLeg(argsFile, { index: 1, total: 2 })).rejects.toThrow(
        /Could not list tests.*config exploded/s
      )
      expect(fs.existsSync(argsFile)).toBe(false)
    })

    describe('fallback mode', () => {
      /** Specs that import a changed helper, so the analysis has to walk their imports */
      function setUpHelperChange() {
        createRepo(
          {
            'tests/helper.ts': 'export const helper = 1\n',
            ...Object.fromEntries(
              files.map((file) => [
                file,
                'import { helper } from "./helper"\nexport const a = helper\n'
              ])
            )
          },
          { 'tests/helper.ts': 'export const helper = 2\n' }
        )
        const argsFile = installFakePlaywright(counts)
        commit('fake playwright')
        process.chdir(repo)
        return argsFile
      }

      /** Makes the dependency analysis fail so burn-in falls back to --only-changed */
      function failAnalysis() {
        jest
          .spyOn(DependencyResolver.prototype, 'getDependencies')
          .mockImplementation(() => {
            throw new Error('analysis exploded')
          })
        return jest.spyOn(console, 'warn').mockImplementation(() => {})
      }

      async function fallbackCommand(
        options: ConstructorParameters<typeof BurnInAnalyzer>[1],
        percentage?: number
      ) {
        const analyzer = new BurnInAnalyzer(
          { ...config, burnInTestPercentage: percentage },
          { baseBranch: 'main', ...options }
        )
        const plan = await analyzer.analyzeTestableDependencies(
          analyzer.getChangedFiles('main')
        )
        return { plan, command: analyzer.buildCommand(plan) }
      }

      it('passes only the user shard and warns that percentage sampling is skipped', async () => {
        setUpHelperChange()
        const warn = failAnalysis()

        const { plan, command } = await fallbackCommand(
          { shard: { index: 2, total: 2 } },
          0.5
        )

        expect(plan.tests).toBeNull()
        expect(command?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=2/2'
        ])
        expect(command).toEqual(
          expect.arrayContaining(['--only-changed=main', '--repeat-each=3'])
        )
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('percentage sampling')
        )
      })

      it('takes the shard from PW_SHARD', async () => {
        setUpHelperChange()
        failAnalysis()
        process.env.PW_SHARD = '2/2'

        const { command } = await fallbackCommand({}, 0.5)

        expect(command?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=2/2'
        ])
      })

      it.each([
        ['no shard', {}],
        ['a total of 1', { shard: '1/1' }]
      ])(
        'keeps the percentage shard, once, with %s',
        async (_name, options) => {
          setUpHelperChange()
          const warn = failAnalysis()

          const { command } = await fallbackCommand(options, 0.5)

          expect(command?.filter((arg) => arg.startsWith('--shard'))).toEqual([
            '--shard=1/2'
          ])
          expect(warn).not.toHaveBeenCalledWith(
            expect.stringContaining('percentage sampling')
          )
        }
      )

      it('accepts the shard as an i/n string', async () => {
        setUpHelperChange()
        failAnalysis()

        const { command } = await fallbackCommand({ shard: '2/2' }, 0.5)

        expect(command?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=2/2'
        ])
      })

      it('keeps the percentage shard when no shard is given', async () => {
        setUpHelperChange()
        failAnalysis()

        const { command } = await fallbackCommand({}, 0.5)

        expect(command?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=1/2'
        ])
      })

      it('does not list tests and hands the shard to Playwright', async () => {
        const argsFile = setUpHelperChange()
        failAnalysis()

        const args = await runLeg(argsFile, { index: 2, total: 2 })

        expect(args?.filter((arg) => arg.startsWith('--shard'))).toEqual([
          '--shard=2/2'
        ])
        expect(fs.existsSync(path.join(repo, 'playwright-list.json'))).toBe(
          false
        )
      })

      it('fails on an invalid shard instead of falling back', async () => {
        setUpHelperChange()
        failAnalysis()
        process.env.PW_SHARD = '3/2'

        await expect(fallbackCommand({})).rejects.toThrow(
          /Invalid shard "3\/2"/
        )
      })
    })
  })
})

describe('shard partitioning', () => {
  const weightsOf = (counts: Record<string, number>) =>
    new Map(
      Object.entries(counts).map(([file, count]) => [
        toComparablePath(path.resolve(file)),
        count
      ])
    )

  // 125 files whose test counts range from 1 to 9
  const tests = Array.from(
    { length: 125 },
    (_, index) => `tests/f${index}.spec.ts`
  )
  const counts = Object.fromEntries(
    tests.map((file, index) => [file, ((index * 7) % 9) + 1])
  )
  const weights = weightsOf(counts)
  const weigh = (legFiles: string[]) =>
    legFiles.reduce((total, file) => total + (counts[file] ?? 0), 0)
  const legs = (total: number) =>
    Array.from({ length: total }, (_, offset) =>
      partitionTests(tests, weights, { index: offset + 1, total })
    )

  it.each([1, 2, 3, 5, 8, 200])(
    'covers every file exactly once across %i legs',
    (total) => {
      expect(legs(total).flat().sort()).toEqual([...tests].sort())
    }
  )

  it.each([2, 3, 5, 8])(
    'balances %i legs to within the heaviest file',
    (total) => {
      const loads = legs(total).map(weigh)
      expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(9)
    }
  )

  it('splits equally weighted files to within one file', () => {
    const equal = weightsOf(Object.fromEntries(tests.map((file) => [file, 4])))
    const [first, second] = [1, 2].map((index) =>
      partitionTests(tests, equal, { index, total: 2 })
    )

    expect(Math.abs((first?.length ?? 0) - (second?.length ?? 0))).toBe(1)
  })

  it('is deterministic and independent of the order of the input', () => {
    const shuffled = [...tests].reverse()

    expect(
      partitionTests(shuffled, weights, { index: 2, total: 3 }).sort()
    ).toEqual(partitionTests(tests, weights, { index: 2, total: 3 }).sort())
    expect(partitionTests(tests, weights, { index: 2, total: 3 })).toEqual(
      partitionTests(tests, weights, { index: 2, total: 3 })
    )
  })

  it('keeps the input order inside a leg and breaks ties by path then lowest leg', () => {
    const files = ['tests/c.spec.ts', 'tests/a.spec.ts', 'tests/b.spec.ts']
    const equal = weightsOf(Object.fromEntries(files.map((file) => [file, 1])))

    expect(partitionTests(files, equal, { index: 1, total: 2 })).toEqual([
      'tests/c.spec.ts',
      'tests/a.spec.ts'
    ])
    expect(partitionTests(files, equal, { index: 2, total: 2 })).toEqual([
      'tests/b.spec.ts'
    ])
  })

  it('treats a file missing from the listing as weightless', () => {
    expect(
      partitionTests(['tests/a.spec.ts'], new Map(), { index: 1, total: 1 })
    ).toEqual(['tests/a.spec.ts'])
  })

  describe('parseShard', () => {
    it('reads i/n', () => {
      expect(parseShard('2/3')).toEqual({ index: 2, total: 3 })
      expect(parseShard(' 1/1 ')).toEqual({ index: 1, total: 1 })
    })

    it.each(['3/2', '0/2', 'a/b', '', '2', '1/'])('rejects %j', (value) => {
      expect(() => parseShard(value)).toThrow(/Invalid shard.*i\/n/)
    })
  })

  describe('parseTestWeights', () => {
    const rootDir = path.resolve('/project/tests')
    const spec = (file: string, projects: string[]) => ({
      file,
      tests: projects.map((projectName) => ({ projectName }))
    })

    it('counts each project copy of a test, including nested suites', () => {
      const output = JSON.stringify({
        config: { rootDir },
        errors: [],
        suites: [
          {
            file: 'a.spec.ts',
            specs: [spec('a.spec.ts', ['chromium', 'burn-in'])],
            suites: [
              {
                file: 'a.spec.ts',
                specs: [
                  spec('a.spec.ts', ['chromium']),
                  spec('a.spec.ts', ['burn-in'])
                ]
              }
            ]
          },
          {
            file: 'sub/b.spec.ts',
            specs: [spec('sub/b.spec.ts', ['chromium'])]
          }
        ]
      })

      const weights = parseTestWeights(output)
      const key = (file: string) =>
        toComparablePath(path.resolve(rootDir, file))

      expect(weights.get(key('a.spec.ts'))).toBe(4)
      expect(weights.get(key('sub/b.spec.ts'))).toBe(1)
    })

    it('counts tests against the spec file when a helper registers them', () => {
      const output = JSON.stringify({
        config: { rootDir },
        errors: [],
        suites: [
          {
            file: 'one.spec.ts',
            specs: [spec('support/register.ts', ['chromium'])],
            suites: [
              {
                file: 'one.spec.ts',
                specs: [spec('support/register.ts', ['chromium', 'burn-in'])]
              }
            ]
          },
          {
            file: 'two.spec.ts',
            specs: [spec('support/register.ts', ['chromium'])]
          }
        ]
      })

      const weights = parseTestWeights(output)

      expect(
        weights.get(toComparablePath(path.resolve(rootDir, 'one.spec.ts')))
      ).toBe(3)
      expect(
        weights.get(toComparablePath(path.resolve(rootDir, 'two.spec.ts')))
      ).toBe(1)
      expect(
        weights.has(
          toComparablePath(path.resolve(rootDir, 'support/register.ts'))
        )
      ).toBe(false)
    })

    it('throws on reported errors and on output that is not a report', () => {
      expect(() =>
        parseTestWeights(
          JSON.stringify({
            config: { rootDir },
            suites: [],
            errors: [{ message: 'No tests found.' }]
          })
        )
      ).toThrow(/No tests found/)
      expect(() => parseTestWeights('not json')).toThrow(/as JSON/)
      expect(() => parseTestWeights('{}')).toThrow(/no config/)
    })
  })
})
