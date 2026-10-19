#!/usr/bin/env node
/**
 * End-to-end check of the packed package from a consumer's point of view.
 *
 * Builds and packs the package, installs it into a throwaway `"type": "module"` project that
 * uses TypeScript 7 and the same @playwright/test version as this repo, then:
 *   1. runs Playwright specs importing the package root and subpaths through ESM and CJS
 *   2. runs `runBurnIn` on a feature branch that changed a helper, and checks that exactly the
 *      specs importing the helper burn in, including one whose name holds shell syntax
 *
 * Usage:  node scripts/test-consumer.mjs
 *         CONSUMER_TARBALL=path/to/package.tgz node scripts/test-consumer.mjs  (skip build + pack)
 * Needs network access to the npm registry. Run it on every supported Node major.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const playwrightVersion = require('@playwright/test/package.json').version
const TYPESCRIPT_VERSION = process.env.CONSUMER_TYPESCRIPT_VERSION ?? '7.0.2'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// A spec name a shell would split and execute
const ODD_SPEC = 'tests/odd name (1);$(touch INJECTED).spec.ts'

const work = mkdtempSync(join(tmpdir(), 'pw-utils-consumer-'))
const consumer = join(work, 'consumer')

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32' && command !== 'git',
    ...options
  })
}

function write(files) {
  for (const [file, content] of Object.entries(files)) {
    const target = join(consumer, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}

function git(...args) {
  run('git', args, { cwd: consumer })
}

function commit(message) {
  git('add', '-A')
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', message)
}

function step(message) {
  console.log(`\n▶ ${message}`)
}

try {
  let tarball =
    process.env.CONSUMER_TARBALL && resolve(process.env.CONSUMER_TARBALL)
  if (!tarball) {
    step('Building and packing the package')
    run(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' })
    // Some npm versions run lifecycle scripts on pack and print their output, so the tarball
    // is found in an empty directory instead of parsing `npm pack` output
    const packDir = join(work, 'pack')
    mkdirSync(packDir)
    run(npm, ['pack', '--ignore-scripts', '--pack-destination', packDir], {
      cwd: root
    })
    const [packed] = readdirSync(packDir).filter((file) =>
      file.endsWith('.tgz')
    )
    tarball = join(packDir, packed)
  }

  step(
    `Installing into an ESM consumer (Node ${process.version}, TypeScript ${TYPESCRIPT_VERSION}, @playwright/test ${playwrightVersion})`
  )
  write({
    'package.json': JSON.stringify(
      { name: 'consumer', private: true, type: 'module' },
      null,
      2
    ),
    '.gitignore': 'node_modules\ntest-results\nplaywright-report\n',
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true
      }
    }),
    'playwright.config.ts': [
      "import { defineConfig } from '@playwright/test'",
      "export default defineConfig({ testDir: 'tests', reporter: 'list' })",
      ''
    ].join('\n')
  })
  run(
    npm,
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--save-dev',
      tarball,
      `@playwright/test@${playwrightVersion}`,
      `typescript@${TYPESCRIPT_VERSION}`
    ],
    { cwd: consumer, stdio: 'inherit' }
  )

  step('Importing the package root and subpaths through ESM and CJS')
  const installedPackage = join(
    consumer,
    'node_modules',
    '@seontechnologies',
    'playwright-utils'
  )
  const pkg = JSON.parse(
    readFileSync(join(installedPackage, 'package.json'), 'utf-8')
  )
  const subpaths = Object.keys(pkg.exports).map((key) =>
    key === '.'
      ? '@seontechnologies/playwright-utils'
      : `@seontechnologies/playwright-utils/${key.slice(2)}`
  )
  write({
    'tests/imports/root-esm.spec.ts': [
      "import { test, expect } from '@playwright/test'",
      "import { log, apiRequest, recurse, readXLSX } from '@seontechnologies/playwright-utils'",
      "import { log as subpathLog } from '@seontechnologies/playwright-utils/log'",
      "test('root import works in ESM', () => {",
      "  for (const fn of [log.info, apiRequest, recurse, readXLSX]) expect(typeof fn).toBe('function')",
      '  expect(log).toBe(subpathLog)',
      '})',
      ''
    ].join('\n'),
    'tests/imports/root-cjs.spec.cjs': [
      "const { test, expect } = require('@playwright/test')",
      "const { log, readXLSX } = require('@seontechnologies/playwright-utils')",
      "test('root import works in CJS', () => {",
      "  expect(typeof log.info).toBe('function')",
      "  expect(typeof readXLSX).toBe('function')",
      '})',
      ''
    ].join('\n'),
    'tests/imports/subpaths.spec.ts': [
      "import { test, expect } from '@playwright/test'",
      ...subpaths.map(
        (subpath, index) => `import * as module${index} from '${subpath}'`
      ),
      "test('every subpath loads in ESM', () => {",
      ...subpaths.map(
        (subpath, index) =>
          `  expect(Object.keys(module${index}).length, '${subpath}').toBeGreaterThan(1)`
      ),
      '})',
      ''
    ].join('\n')
  })
  run('npx', ['playwright', 'test', 'tests/imports'], {
    cwd: consumer,
    stdio: 'inherit'
  })

  step('Burning in the specs a helper change affects')
  write({
    'burn-in.mjs': [
      "import { runBurnIn } from '@seontechnologies/playwright-utils/burn-in'",
      "await runBurnIn({ baseBranch: 'main', configPath: 'burn-in.config.ts' })",
      ''
    ].join('\n'),
    'tests/support/helper.ts': 'export const helper = 1\n',
    'tests/uses-helper.spec.ts': [
      "import { test, expect } from '@playwright/test'",
      "import { helper } from './support/helper'",
      "test('uses the helper', () => expect(helper).toBeGreaterThan(0))",
      ''
    ].join('\n'),
    [ODD_SPEC]: [
      "import { test, expect } from '@playwright/test'",
      "import { helper } from './support/helper'",
      "test('odd name uses the helper', () => expect(helper).toBeGreaterThan(0))",
      ''
    ].join('\n'),
    'tests/unrelated.spec.ts': [
      "import { test } from '@playwright/test'",
      "test('unrelated', () => {})",
      ''
    ].join('\n'),
    // Unchanged, and its path ends with a selected spec's path
    'tests/old-tests/uses-helper.spec.ts': [
      "import { test } from '@playwright/test'",
      "test('unrelated decoy', () => {})",
      ''
    ].join('\n')
  })
  git('init', '-q', '-b', 'main')
  commit('base')
  git('checkout', '-qb', 'feature')
  write({ 'tests/support/helper.ts': 'export const helper = 2\n' })
  commit('change helper')

  const burnIn = spawnSync(process.execPath, ['burn-in.mjs'], {
    cwd: consumer,
    encoding: 'utf-8'
  })
  process.stdout.write(burnIn.stdout)
  process.stderr.write(burnIn.stderr)
  if (burnIn.status !== 0) throw new Error('runBurnIn failed')
  const selected = [ODD_SPEC, 'tests/uses-helper.spec.ts']
  const plan = burnIn.stdout.match(/Tests to run: (\d+)\n((?:\s+- .+\n)*)/)
  const planned = plan?.[2]
    .split('\n')
    .map((line) => line.replace(/^\s+- /, ''))
    .filter(Boolean)
  if (JSON.stringify(planned?.sort()) !== JSON.stringify(selected.sort())) {
    throw new Error(
      `runBurnIn selected ${JSON.stringify(planned)}, expected ${JSON.stringify(selected)}`
    )
  }
  // 2 specs, repeated 3 times each, and nothing else
  if (!/^\s+6 passed/m.test(burnIn.stdout) || /unrelated/.test(burnIn.stdout)) {
    throw new Error(
      'Playwright did not run exactly the selected specs 3 times each'
    )
  }
  if (existsSync(join(consumer, 'INJECTED'))) {
    throw new Error('A file name was executed by a shell')
  }

  console.log('\n✅ Consumer checks passed')
} finally {
  rmSync(work, { recursive: true, force: true })
}
