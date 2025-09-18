import { test as base } from '@playwright/test'
import { validateSchema as validateSchemaFunction } from './core'
import type { SupportedSchema, ValidateSchemaOptions } from './types'

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
  validateSchema: <T = unknown>(
    schema: SupportedSchema,
    data: unknown,
    options?: ValidateSchemaOptions
  ) => Promise<T>
}>({
  validateSchema: async ({}, use) => {
    const validateSchema = async <T = unknown>(
      schema: SupportedSchema,
      data: unknown,
      options?: ValidateSchemaOptions
    ): Promise<T> => {
      return validateSchemaFunction(data, schema, options) as T
    }

    await use(validateSchema)
  }
})
