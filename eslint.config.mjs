import path from 'node:path'
import js from '@eslint/js'
import globals from 'globals'
import { configs as tsConfigs } from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import { flatConfigs as importConfigs } from 'eslint-plugin-import-x'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'

const FILENAME_PATTERN = /^[a-z0-9-._[\]]+$/

/** Enforces lowercase, dash-separated file names (replaces eslint-plugin-filenames). */
const localPlugin = {
  rules: {
    'filename-match-regex': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          invalid: `The filename "{{name}}" does not match the pattern ${FILENAME_PATTERN}.`
        }
      },
      create(context) {
        return {
          Program(node) {
            const name = path.basename(context.filename)
            if (!FILENAME_PATTERN.test(name)) {
              context.report({ node, messageId: 'invalid', data: { name } })
            }
          }
        }
      }
    }
  }
}

export default defineConfig(
  {
    ignores: [
      '**/dist',
      '**/.vitepress/cache',
      '**/node_modules',
      '**/scripts',
      'coverage',
      'wallaby.js',
      '**/mockServiceWorker.js',
      '**/generated',
      'playwright-report',
      'test-results'
    ]
  },
  js.configs.recommended,
  ...tsConfigs.recommended,
  importConfigs.recommended,
  importConfigs.typescript,
  prettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.es2021, ...globals.node },
      parserOptions: {
        project: ['./tsconfig.json']
      }
    },
    plugins: {
      'no-only-tests': noOnlyTests,
      local: localPlugin
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true // Always try to resolve types under `@types` directory even if it's not in `package.json`
        })
      ]
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-only-tests/no-only-tests': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      'local/filename-match-regex': 'error',
      complexity: ['warn', 15],
      'object-curly-spacing': ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      'import-x/default': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty-pattern': 'off',
      'import-x/no-named-as-default': 'off'
    }
  },
  {
    // plain JS files are not part of the TypeScript project, lint them without type information
    files: ['**/*.{js,mjs,cjs}'],
    ...tsConfigs.disableTypeChecked
  }
)
