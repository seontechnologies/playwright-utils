import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

type OpenApiDoc = {
  components: { schemas: Record<string, unknown> }
  [key: string]: unknown
}

export const nestedRefSpecPath = path.join(
  __dirname,
  '../schemas/movies-nested-refs.openapi.yml'
)

/** Fresh JSON object copy of the nested-ref fixture spec */
export const loadNestedRefSpec = (): OpenApiDoc =>
  yaml.load(fs.readFileSync(nestedRefSpecPath, 'utf8')) as OpenApiDoc

/** Fixture spec copy with one component schema replaced, for negative contract cases */
export const nestedRefSpecWith = (
  schemaName: string,
  schema: unknown
): OpenApiDoc => {
  const spec = loadNestedRefSpec()
  spec.components.schemas[schemaName] = schema
  return spec
}
