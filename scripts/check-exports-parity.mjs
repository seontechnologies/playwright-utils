#!/usr/bin/env node
/**
 * Verifies that every subpath in `exports` (except the root ".") has a
 * corresponding entry in `typesVersions["*"]`, and vice-versa.
 *
 * Run manually:  node scripts/check-exports-parity.mjs
 * Run in CI:     npm run check:exports-parity
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

// Subpath exports — strip the leading "./" and skip the root "." entry.
// Note: network-error-monitor intentionally exposes only ./network-error-monitor/fixtures
// (no root entry) because the monitor has no standalone public API.
const exportKeys = new Set(
  Object.keys(pkg.exports)
    .filter((k) => k !== '.')
    .map((k) => k.replace(/^\.\//, ''))
)

const typesVersionKeys = new Set(Object.keys(pkg.typesVersions?.['*'] ?? {}))

const missingFromTypesVersions = [...exportKeys].filter(
  (k) => !typesVersionKeys.has(k)
)
const missingFromExports = [...typesVersionKeys].filter(
  (k) => !exportKeys.has(k)
)

let failed = false

if (missingFromTypesVersions.length) {
  console.error('❌  Subpaths in `exports` but missing from `typesVersions`:')
  missingFromTypesVersions.forEach((k) => console.error(`     - ${k}`))
  failed = true
}

if (missingFromExports.length) {
  console.error('❌  Subpaths in `typesVersions` but missing from `exports`:')
  missingFromExports.forEach((k) => console.error(`     - ${k}`))
  failed = true
}

if (failed) {
  console.error(
    '\nKeep `exports` and `typesVersions` in sync — see scripts/check-exports-parity.mjs.'
  )
  process.exit(1)
}

console.log(
  `✅  exports and typesVersions are in sync (${exportKeys.size} subpaths).`
)
