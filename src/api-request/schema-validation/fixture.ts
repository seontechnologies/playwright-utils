import { test as base } from '@playwright/test'
import { validateSchema as validateSchemaFunction } from './core'
import type {
  SupportedSchema,
  ValidateSchemaOptions,
  ValidationResult
} from './types'

/**
 * Fixture that provides the validateSchema function for schema validation
 */
export const test = base.extend<{
  /**
   * Validates data against a schema with optional shape assertions
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
  validateSchema: async ({}, use) => {
    const validateSchema = async (
      schema: SupportedSchema,
      data: unknown,
      options?: ValidateSchemaOptions
    ): Promise<ValidationResult> => {
      return await validateSchemaFunction(data, schema, options)
    }

    await use(validateSchema)
  }
})
