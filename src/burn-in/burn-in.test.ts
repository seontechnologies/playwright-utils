import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { BurnInAnalyzer } from './core/analyzer'
import { runBurnIn } from './runner'
import type { BurnInConfig } from './core/types'

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
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
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
  /** Installs a stand-in Playwright CLI that records the arguments it receives */
  function installFakePlaywright(): string {
    const argsFile = path.join(repo, 'playwright-args.json')
    const cli = `require('fs').writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(process.argv.slice(2)))\n`
    write({
      'node_modules/@playwright/test/package.json': JSON.stringify({
        name: '@playwright/test',
        bin: { playwright: 'cli.js' },
        exports: { './cli': './cli.js' }
      }),
      'node_modules/@playwright/test/cli.js': `#!/usr/bin/env node\n${cli}`
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
    write({ '.gitignore': 'node_modules\nplaywright-args.json\n' })
    commit('ignore')
    const argsFile = installFakePlaywright()
    process.chdir(repo)

    await runBurnIn({ baseBranch: 'main', configPath: 'missing.config.ts' })

    expect(fs.existsSync(path.join(repo, 'INJECTED'))).toBe(false)
    const args: string[] = JSON.parse(fs.readFileSync(argsFile, 'utf-8'))
    expect(args[0]).toBe('test')
    expect(args.slice(-2)).toEqual(['--repeat-each=3', '--retries=0'])

    // Playwright turns each file argument into `new RegExp(arg, 'gi')` and tests it against
    // absolute file paths: each argument must match its own file and nothing else
    const filters = args.slice(1, -2)
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
})
