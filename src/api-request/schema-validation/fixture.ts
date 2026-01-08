import { test as base } from '@playwright/test'
import { validateSchema as validateSchemaFunction } from './core'
import {
  capturePageContext,
  clearPageContext
} from '../../internal/page-context'
import type {
  SupportedSchema,
  ValidateSchemaOptions,
  ValidationResult
} from './types'

/**
 * Fixture that provides the validateSchema function for schema validation.
 * Displays validation results in Playwright UI when API_E2E_UI_MODE=true.
 */
export const test = base.extend<{
  /**
   * Validates data against a schema with optional shape assertions.
   * Displays validation results in Playwright UI when API_E2E_UI_MODE=true.
   *
   * @example
   * test('validate response schema', async ({ validateSchema }) => {
   *   const response = await fetch('/api/data')
   *   const data = await response.json()
   *
   *   const validated = await validateSchema(MySchema, data)
   *   expect(validated.status).toBe(200)
   * })
   */
  validateSchema: (
    schema: SupportedSchema,
    data: unknown,
    options?: ValidateSchemaOptions
  ) => Promise<ValidationResult>
}>({
  validateSchema: async ({ page }, use) => {
    // Capture page context for UI display support
    capturePageContext(page)

    const validateSchema = async (
      schema: SupportedSchema,
      data: unknown,
      options?: ValidateSchemaOptions
    ): Promise<ValidationResult> => {
      // Core function handles UI display via captured page context
      return await validateSchemaFunction(data, schema, options)
    }

    await use(validateSchema)

    // Clear page context to avoid stale references between tests
    clearPageContext()
  }
})
