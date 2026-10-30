/**
 * Strict OpenAPI response validation (opt-in via `strictOpenApi`)
 *
 * Locates the documented JSON response schema for an operation and validates
 * against it with every local `$ref` resolved by AJV. Each ref target compiles
 * from its original location in the spec, so nested, composed and recursive
 * refs all resolve without inlining.
 * Any missing path, method, status, schema, or unresolvable reference is an
 * error, so a contract gap can never pass through a fallback schema.
 *
 * @module OpenApiStrict
 */

import type { ValidationErrorDetail } from '../types'
import { tokenizePathTemplate } from './path-template'

type JsonObject = Record<string, unknown>

export type StrictOpenApiTarget = {
  path?: string
  method?: string
  status?: number
}

export type StrictOpenApiResult = {
  validationErrors: ValidationErrorDetail[]
  schema: object
}

/** Keywords whose values are data, so `$ref` strings inside them are never references */
const DATA_KEYWORDS = new Set([
  'example',
  'examples',
  'enum',
  'const',
  'default'
])

/** Keywords whose object values map names to schemas, so their keys are never keywords */
const NAME_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
  'dependentSchemas'
])

/** OpenAPI 3.1 specs are registered whole in AJV under this key so local refs resolve against the spec root */
const SPEC_KEY = 'https://openapi-spec.invalid/spec.json'

const MAX_VALIDATOR_CACHE_SIZE = 20
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AjvInstance = any

type SpecValidatorEntry = {
  /** Serialized spec, also the source of the untouched copy registered for non-3.0 specs */
  cacheKey: string
  ajv: AjvInstance
  /** Opaque AJV ids by JSON Pointer, so every ref target compiles from its original place */
  targetIds: Map<string, string>
  registered: Set<string>
}

const validatorCache = new Map<string, SpecValidatorEntry>()

const isObject = (value: unknown): value is JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const hasOwn = (object: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key)

/** OpenAPI 3.1 and later schemas are JSON Schema 2020-12; Swagger 2.0 and OpenAPI 3.0 are closest to draft-07 */
const isJsonSchema2020 = (spec: JsonObject): boolean => {
  const [major, minor] = String(spec.openapi ?? '')
    .split('.')
    .map(Number)
  return major === 3 && minor !== undefined && minor >= 1
}

const escapePointerSegment = (segment: string): string =>
  segment.replace(/~/g, '~0').replace(/\//g, '~1')

const toPointer = (segments: string[]): string =>
  segments.length ? `/${segments.map(escapePointerSegment).join('/')}` : ''

/** Parse a local `$ref` into decoded JSON Pointer segments, or explain why it is unsupported */
function parseLocalRef(ref: string): string[] {
  if (!ref.startsWith('#')) {
    throw new Error(
      `Unsupported $ref "${ref}": only local refs ("#/...") are supported`
    )
  }
  // RFC 6901 section 6: percent-decode the whole fragment before splitting into segments
  let fragment: string
  try {
    fragment = decodeURIComponent(ref.slice(1))
  } catch {
    throw new Error(`Invalid $ref "${ref}": malformed percent-encoding`)
  }
  if (fragment === '') return []
  if (!fragment.startsWith('/')) {
    throw new Error(
      `Unsupported $ref "${ref}": only JSON Pointer fragments are supported`
    )
  }
  return fragment
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function getAtPointer(root: unknown, segments: string[]): unknown {
  let current: unknown = root
  for (const segment of segments) {
    // RFC 6901 section 4: array indices have no leading zeros
    if (Array.isArray(current) && /^(0|[1-9]\d*)$/.test(segment)) {
      current = current[Number(segment)]
    } else if (isObject(current) && hasOwn(current, segment)) {
      current = current[segment]
    } else {
      return undefined
    }
  }
  return current
}

/** Follow `$ref` chains on OpenAPI objects such as `#/components/responses/X` */
function followObjectRefs(
  spec: JsonObject,
  node: unknown,
  segments: string[],
  label: string
): { node: unknown; segments: string[] } {
  const seen = new Set<string>()
  while (isObject(node) && typeof node.$ref === 'string') {
    const ref = node.$ref
    if (seen.has(ref)) {
      throw new Error(`Circular $ref "${ref}" while resolving ${label}`)
    }
    seen.add(ref)
    segments = parseLocalRef(ref)
    node = getAtPointer(spec, segments)
    if (node === undefined) {
      throw new Error(`Unresolved $ref "${ref}" while resolving ${label}`)
    }
  }
  return { node, segments }
}

/** Whether the node at `segments` sits inside (or is) a schema that declares its own `$id` */
function isInIdResource(spec: JsonObject, segments: string[]): boolean {
  return segments.some((_, i) => {
    const ancestor = getAtPointer(spec, segments.slice(0, i + 1))
    return isObject(ancestor) && typeof ancestor.$id === 'string'
  })
}

/** Resolve a ref target not yet visited, recording a problem when it is unsupported or unresolved */
function followRefTarget(
  spec: JsonObject,
  ref: string,
  visitedTargets: Set<string>,
  problems: Set<string>
): { target: unknown; segments: string[] } | undefined {
  try {
    const segments = parseLocalRef(ref)
    const key = toPointer(segments)
    if (visitedTargets.has(key)) return undefined
    visitedTargets.add(key)
    const target = getAtPointer(spec, segments)
    if (target === undefined) {
      problems.add(`Unresolved $ref "${ref}"`)
      return undefined
    }
    return { target, segments }
  } catch (error) {
    problems.add((error as Error).message)
    return undefined
  }
}

/**
 * Collect every unresolved or unsupported `$ref` reachable from a schema.
 * Each ref target is visited once, so recursive schemas terminate.
 * With `honorIds`, refs inside a `$id` resource resolve against that resource,
 * so they are left to AJV, which fails on any it cannot resolve and never fetches.
 */
function collectRefProblems(
  spec: JsonObject,
  schema: unknown,
  schemaSegments: string[],
  honorIds: boolean
): string[] {
  type Item = { node: unknown; isNameMap: boolean; inIdScope: boolean }
  const problems = new Set<string>()
  const visitedTargets = new Set<string>()
  const stack: Item[] = [
    {
      node: schema,
      isNameMap: false,
      inIdScope: honorIds && isInIdResource(spec, schemaSegments)
    }
  ]

  while (stack.length) {
    const item = stack.pop()!
    const { node, isNameMap } = item
    if (Array.isArray(node)) {
      node.forEach((child) =>
        stack.push({ node: child, isNameMap: false, inIdScope: item.inIdScope })
      )
      continue
    }
    if (!isObject(node)) continue

    const inIdScope =
      item.inIdScope || (honorIds && !isNameMap && typeof node.$id === 'string')

    if (!isNameMap && !inIdScope && typeof node.$ref === 'string') {
      const next = followRefTarget(spec, node.$ref, visitedTargets, problems)
      if (next) {
        stack.push({
          node: next.target,
          isNameMap: false,
          inIdScope: honorIds && isInIdResource(spec, next.segments)
        })
      }
    }

    stack.push(...schemaChildren(node, isNameMap, inIdScope))
  }

  return [...problems]
}

/** Child nodes that may hold schemas, skipping data keywords and `x-` extensions */
function schemaChildren(
  node: JsonObject,
  isNameMap: boolean,
  inIdScope: boolean
): Array<{ node: unknown; isNameMap: boolean; inIdScope: boolean }> {
  return Object.entries(node)
    .filter(
      ([key]) => isNameMap || (!DATA_KEYWORDS.has(key) && !key.startsWith('x-'))
    )
    .map(([key, value]) => ({
      node: value,
      isNameMap: !isNameMap && NAME_MAP_KEYWORDS.has(key),
      inIdScope
    }))
}

function targetId(entry: SpecValidatorEntry, segments: string[]): string {
  const pointer = toPointer(segments)
  let id = entry.targetIds.get(pointer)
  if (!id) {
    id = `https://openapi-spec.invalid/schema-${entry.targetIds.size}`
    entry.targetIds.set(pointer, id)
  }
  return id
}

/** Rewrite OpenAPI 3.0 / Swagger 2.0 boolean `exclusiveMinimum`/`exclusiveMaximum` into draft-07 numeric bounds */
function convertExclusiveBound(
  copy: JsonObject,
  bound: 'minimum' | 'maximum',
  exclusive: 'exclusiveMinimum' | 'exclusiveMaximum'
): void {
  if (typeof copy[exclusive] !== 'boolean') return
  if (copy[exclusive] && typeof copy[bound] === 'number') {
    copy[exclusive] = copy[bound]
    delete copy[bound]
  } else {
    delete copy[exclusive]
  }
}

/**
 * Copy one OpenAPI 3.0 or Swagger 2.0 schema for AJV draft-07: each local `$ref` is replaced with the id
 * `refId` returns for its target, boolean exclusive bounds become numeric, `nullable` without a sibling
 * `type` is dropped because it only extends a declared type, and `$id` is dropped because these
 * versions resolve every ref against the document.
 * The caller's spec is never mutated.
 */
function prepareSchema30(
  node: unknown,
  refId: (segments: string[]) => string,
  isNameMap = false
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => prepareSchema30(item, refId))
  }
  if (!isObject(node)) return node

  const copy: JsonObject = {}
  for (const [key, value] of Object.entries(node)) {
    if (!isNameMap && key === '$id') continue
    const isData =
      !isNameMap && (DATA_KEYWORDS.has(key) || key.startsWith('x-'))
    copy[key] = isData
      ? value
      : prepareSchema30(value, refId, !isNameMap && NAME_MAP_KEYWORDS.has(key))
  }
  if (isNameMap) return copy

  if (typeof copy.$ref === 'string') {
    copy.$ref = refId(parseLocalRef(copy.$ref))
  }

  if (copy.type === undefined) delete copy.nullable
  convertExclusiveBound(copy, 'minimum', 'exclusiveMinimum')
  convertExclusiveBound(copy, 'maximum', 'exclusiveMaximum')
  return copy
}

/** Register the draft-07 era schema at `segments` and every schema it references, each under its own target id */
function registerSchemaTargets(
  entry: SpecValidatorEntry,
  spec: JsonObject,
  segments: string[]
): string {
  const queue = [segments]
  while (queue.length) {
    const current = queue.pop()!
    const id = targetId(entry, current)
    if (entry.registered.has(id)) continue
    const prepared = prepareSchema30(getAtPointer(spec, current), (ref) => {
      queue.push(ref)
      return targetId(entry, ref)
    })
    entry.ajv.addSchema(prepared, id, undefined, false)
    entry.registered.add(id)
  }
  return targetId(entry, segments)
}

const encodePointer = (segments: string[]): string =>
  toPointer(segments).split('/').map(encodeURIComponent).join('/')

/**
 * AJV records where each nested `$id` lives without escaping `/` in keys such as `/movies` or
 * `application/json`, so those resources cannot be found. Point each one at its escaped location.
 */
function repairNestedIdPointers(ajv: AjvInstance, document: unknown): void {
  const refs = ajv.refs as Record<string, unknown> | undefined
  if (!refs) return
  const stack: Array<{ node: unknown; segments: string[]; base: string }> = [
    { node: document, segments: [], base: SPEC_KEY }
  ]
  while (stack.length) {
    const { node, segments, base } = stack.pop()!
    if (!node || typeof node !== 'object') continue
    let childBase = base
    if (isObject(node) && typeof node.$id === 'string' && segments.length) {
      try {
        childBase = new URL(node.$id, base).href.replace(/#$/, '')
      } catch {
        continue
      }
      const recorded = refs[childBase]
      if (typeof recorded === 'string' && recorded.startsWith(`${SPEC_KEY}#`)) {
        refs[childBase] = `${SPEC_KEY}#${encodePointer(segments)}`
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (!DATA_KEYWORDS.has(key)) {
        stack.push({
          node: value,
          segments: [...segments, key],
          base: childBase
        })
      }
    }
  }
}

/**
 * Register an untouched copy of the whole spec once, then reach the response schema through a `$ref`
 * so AJV enters any `$id` resource on the way, including one declared on an inline response schema.
 */
function registerWholeSpec(
  entry: SpecValidatorEntry,
  segments: string[]
): string {
  if (!entry.registered.has(SPEC_KEY)) {
    const document: unknown = JSON.parse(entry.cacheKey)
    entry.ajv.addSchema(document, SPEC_KEY, undefined, false)
    repairNestedIdPointers(entry.ajv, document)
    entry.registered.add(SPEC_KEY)
  }
  const id = targetId(entry, segments)
  if (!entry.registered.has(id)) {
    entry.ajv.addSchema(
      { $ref: `${SPEC_KEY}#${encodePointer(segments)}` },
      id,
      undefined,
      false
    )
    entry.registered.add(id)
  }
  return id
}

/** Pick the JSON media type, preferring exact `application/json` */
function findJsonMediaType(content: JsonObject): string | undefined {
  const mediaTypes = Object.keys(content)
  return (
    mediaTypes.find((type) => type === 'application/json') ??
    mediaTypes.find((type) =>
      /^application\/([\w.-]+\+)?json(\s*;.*)?$/i.test(type)
    )
  )
}

/**
 * Match one templated path segment such as `{name}.json`, where each `{param}` takes one or more characters.
 * Memoized on (token, offset), so work stays bounded by template and segment length.
 */
function matchesTemplateSegment(template: string, actual: string): boolean {
  const tokens = tokenizePathTemplate(template)
  const memo = new Map<number, boolean>()
  const match = (t: number, a: number): boolean => {
    if (t === tokens.length) return a === actual.length
    const key = t * (actual.length + 1) + a
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    const token = tokens[t]!
    let result = false
    if (token.param) {
      for (let end = a + 1; end <= actual.length && !result; end++) {
        result = match(t + 1, end)
      }
    } else {
      result =
        actual.startsWith(token.text, a) && match(t + 1, a + token.text.length)
    }
    memo.set(key, result)
    return result
  }
  return match(0, 0)
}

/**
 * Match an exact path key, then a template match where each `{param}` matches part of a segment.
 * Templates with more literal segments, then more literal characters, win.
 */
function findPathKey(paths: JsonObject, rawPath: string): string {
  const requestedPath = rawPath.split(/[?#]/)[0] ?? rawPath
  if (hasOwn(paths, requestedPath)) return requestedPath

  const requested = requestedPath.split('/')
  const candidates: Array<{
    key: string
    literalSegments: number
    literalChars: number
  }> = []
  for (const key of Object.keys(paths)) {
    const template = key.split('/')
    if (template.length !== requested.length) continue
    let literalSegments = 0
    let literalChars = 0
    const matches = template.every((segment, i) => {
      const actual = requested[i] ?? ''
      if (!segment.includes('{')) {
        literalSegments++
        return segment === actual
      }
      literalChars += tokenizePathTemplate(segment)
        .filter((token) => !token.param)
        .reduce((sum, token) => sum + token.text.length, 0)
      return matchesTemplateSegment(segment, actual)
    })
    if (matches) candidates.push({ key, literalSegments, literalChars })
  }
  const rank = (a: (typeof candidates)[number]) =>
    a.literalSegments * 100000 + a.literalChars
  candidates.sort((a, b) => rank(b) - rank(a))

  const [best, runnerUp] = candidates
  if (!best) {
    throw new Error(
      `Path "${requestedPath}" is not documented in the OpenAPI spec`
    )
  }
  if (runnerUp && rank(runnerUp) === rank(best)) {
    throw new Error(
      `Path "${requestedPath}" is ambiguous in the OpenAPI spec: ${candidates
        .filter((c) => rank(c) === rank(best))
        .map((c) => c.key)
        .join(', ')}`
    )
  }
  return best.key
}

/** Find the response object for a status: exact code, then range such as `2XX`, then `default` */
function findResponse(
  spec: JsonObject,
  operation: JsonObject,
  operationSegments: string[],
  status: number,
  label: string
): { node: JsonObject; segments: string[] } {
  const responses = operation.responses
  if (!isObject(responses)) {
    throw new Error(`No responses documented for ${label}`)
  }
  const range = `${String(status).charAt(0)}XX`
  const statusKey = [
    String(status),
    range,
    range.toLowerCase(),
    'default'
  ].find((key) => hasOwn(responses, key))
  if (!statusKey) {
    throw new Error(
      `Status ${status} is not documented for ${label} (documented: ${Object.keys(responses).join(', ')})`
    )
  }

  const response = followObjectRefs(
    spec,
    responses[statusKey],
    [...operationSegments, 'responses', statusKey],
    label
  )
  if (!isObject(response.node)) {
    throw new Error(`Response for ${label} is not an object`)
  }
  return { node: response.node, segments: response.segments }
}

/** Pointer segments of the JSON schema on a response object (OpenAPI 3 content or Swagger 2 schema) */
function findJsonSchemaSegments(
  response: { node: JsonObject; segments: string[] },
  label: string
): string[] {
  const { content, schema } = response.node
  if (isObject(content)) {
    const mediaType = findJsonMediaType(content)
    const media = mediaType ? content[mediaType] : undefined
    if (mediaType && isObject(media) && media.schema !== undefined) {
      return [...response.segments, 'content', mediaType, 'schema']
    }
  } else if (schema !== undefined) {
    return [...response.segments, 'schema']
  }
  throw new Error(`No JSON response schema documented for ${label}`)
}

/**
 * Locate the documented response schema and return its JSON Pointer in the spec.
 * Throws a descriptive error for any gap in the contract.
 */
export function locateStrictResponseSchema(
  spec: JsonObject,
  target: StrictOpenApiTarget
): { pointer: string; segments: string[]; schema: object; label: string } {
  if (!isObject(spec.paths)) {
    throw new Error('Invalid OpenAPI specification: missing "paths" object')
  }
  if (!target.path || !target.method) {
    throw new Error(
      'strictOpenApi requires "path" (or "endpoint") and "method" options'
    )
  }

  const method = target.method.toLowerCase()
  const status = target.status ?? 200
  const pathKey = findPathKey(spec.paths, target.path)
  const label = `${method.toUpperCase()} ${pathKey} ${status}`

  const pathItem = followObjectRefs(
    spec,
    spec.paths[pathKey],
    ['paths', pathKey],
    label
  )
  const operation = isObject(pathItem.node) ? pathItem.node[method] : undefined
  if (!isObject(operation)) {
    throw new Error(
      `Method ${method.toUpperCase()} is not documented for path "${pathKey}"`
    )
  }

  const response = findResponse(
    spec,
    operation,
    [...pathItem.segments, method],
    status,
    label
  )
  const schemaSegments = findJsonSchemaSegments(response, label)
  const schema = getAtPointer(spec, schemaSegments)
  // OpenAPI 3.1 allows boolean schemas; AJV applies them, the result reports an equivalent object
  if (typeof schema === 'boolean' && isJsonSchema2020(spec)) {
    return {
      pointer: toPointer(schemaSegments),
      segments: schemaSegments,
      schema: schema ? {} : { not: {} },
      label
    }
  }
  if (!isObject(schema)) {
    throw new Error(`Response schema for ${label} is not a schema object`)
  }

  const refProblems = collectRefProblems(
    spec,
    schema,
    schemaSegments,
    isJsonSchema2020(spec)
  )
  if (refProblems.length) {
    throw new Error(
      `Response schema for ${label} has invalid references: ${refProblems.join('; ')}`
    )
  }

  return {
    pointer: toPointer(schemaSegments),
    segments: schemaSegments,
    schema,
    label
  }
}

function getSpecAjv(spec: JsonObject): SpecValidatorEntry {
  const cacheKey = JSON.stringify(spec)
  const cached = validatorCache.get(cacheKey)
  if (cached) return cached

  let AjvClass
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ajvModule = isJsonSchema2020(spec)
      ? require('ajv/dist/2020')
      : require('ajv')
    AjvClass = ajvModule.default ?? ajvModule
  } catch {
    throw new Error(
      'AJV is required for JSON Schema validation. Install with: npm install ajv'
    )
  }

  const entry: SpecValidatorEntry = {
    cacheKey,
    ajv: new AjvClass({ allErrors: true, verbose: true, strict: false }),
    targetIds: new Map(),
    registered: new Set()
  }

  if (validatorCache.size >= MAX_VALIDATOR_CACHE_SIZE) {
    const oldest = validatorCache.keys().next().value
    if (oldest !== undefined) validatorCache.delete(oldest)
  }
  validatorCache.set(cacheKey, entry)
  return entry
}

/** Validate data against the documented response schema with strict extraction */
export function validateStrictOpenApi(
  data: unknown,
  spec: JsonObject,
  target: StrictOpenApiTarget
): StrictOpenApiResult {
  const { segments, schema, label } = locateStrictResponseSchema(spec, target)
  const entry = getSpecAjv(spec)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let validate: any
  try {
    // Draft-07 era specs need keyword rewrites and have no `$id` scoping, so each ref target compiles
    // from its own location; OpenAPI 3.1 compiles from the untouched spec, keeping `$id` scopes
    const id = isJsonSchema2020(spec)
      ? registerWholeSpec(entry, segments)
      : registerSchemaTargets(entry, spec, segments)
    validate = entry.ajv.getSchema(id)
  } catch (error) {
    validatorCache.delete(entry.cacheKey)
    throw new Error(
      `Failed to compile response schema for ${label}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  if (!validate) {
    validatorCache.delete(entry.cacheKey)
    throw new Error(`Failed to compile response schema for ${label}`)
  }

  if (validate(data)) {
    return { validationErrors: [], schema }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validationErrors: (validate.errors || []).map((error: any) => ({
      path: error.instancePath || 'root',
      message: error.message || 'Validation failed',
      expected: error.schema,
      actual: error.data
    })),
    schema
  }
}
