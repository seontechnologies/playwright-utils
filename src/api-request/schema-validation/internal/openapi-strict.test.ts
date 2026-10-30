import {
  locateStrictResponseSchema,
  validateStrictOpenApi
} from './openapi-strict'

type Spec = Record<string, unknown>

const jsonResponse = (schema: unknown) => ({
  description: 'ok',
  content: { 'application/json': { schema } }
})

const operation = (responses: Record<string, unknown>) => ({ responses })

const makeSpec = (
  paths: Record<string, unknown>,
  schemas: Record<string, unknown> = {},
  components: Spec = {}
): Spec => ({
  openapi: '3.0.3',
  info: { title: 'test', version: '1' },
  paths,
  components: { schemas, ...components }
})

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const messages = (data: unknown, spec: Spec, path: string, status = 200) =>
  validateStrictOpenApi(data, spec, { path, method: 'GET', status })
    .validationErrors

describe('validateStrictOpenApi', () => {
  const movie = {
    type: 'object',
    required: ['id', 'genre'],
    properties: {
      id: { type: 'integer' },
      genre: { $ref: '#/components/schemas/Genre' }
    }
  }
  const schemas = {
    Movie: movie,
    Genre: { type: 'string', enum: ['drama', 'comedy'] },
    MovieList: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Movie' } }
      }
    },
    Composed: {
      allOf: [
        { $ref: '#/components/schemas/Movie' },
        {
          type: 'object',
          properties: {
            extra: {
              oneOf: [
                { $ref: '#/components/schemas/Genre' },
                { type: 'integer' }
              ]
            },
            alt: {
              anyOf: [{ $ref: '#/components/schemas/Genre' }, { type: 'null' }]
            }
          }
        }
      ]
    }
  }
  const spec = makeSpec(
    {
      '/movies': {
        get: operation({
          '200': jsonResponse({ $ref: '#/components/schemas/MovieList' })
        })
      },
      '/movies/{id}': {
        get: operation({
          '200': jsonResponse({ $ref: '#/components/schemas/Composed' })
        })
      }
    },
    schemas
  )

  it('validates refs nested in array items', () => {
    expect(
      messages({ data: [{ id: 1, genre: 'drama' }] }, spec, '/movies')
    ).toEqual([])
    const errors = messages(
      { data: [{ id: 1, genre: 'horror' }] },
      spec,
      '/movies'
    )
    expect(errors).toEqual([
      expect.objectContaining({
        path: '/data/0/genre',
        message: 'must be equal to one of the allowed values'
      })
    ])
  })

  it('validates refs inside allOf, oneOf and anyOf', () => {
    expect(
      messages(
        { id: 1, genre: 'comedy', extra: 3, alt: null },
        spec,
        '/movies/{id}'
      )
    ).toEqual([])
    expect(messages({ id: 1, genre: 'x' }, spec, '/movies/{id}')).not.toEqual(
      []
    )
    expect(
      messages({ id: 1, genre: 'drama', extra: 'x' }, spec, '/movies/{id}')
    ).not.toEqual([])
    expect(
      messages({ id: 1, genre: 'drama', alt: 'x' }, spec, '/movies/{id}')
    ).not.toEqual([])
  })

  it('matches a concrete request path to its template', () => {
    expect(messages({ id: 1, genre: 'drama' }, spec, '/movies/42')).toEqual([])
    expect(
      messages({ id: 1, genre: 'drama' }, spec, '/movies/42?expand=true')
    ).toEqual([])
  })

  it('prefers literal path segments over templated ones', () => {
    const literalSpec = makeSpec({
      '/movies/{id}': {
        get: operation({ '200': jsonResponse({ type: 'integer' }) })
      },
      '/movies/latest': {
        get: operation({ '200': jsonResponse({ type: 'string' }) })
      }
    })
    expect(messages('x', literalSpec, '/movies/latest')).toEqual([])
    expect(messages(1, literalSpec, '/movies/7')).toEqual([])
  })

  it('rejects ambiguous template matches', () => {
    const ambiguous = makeSpec({
      '/a/{x}/c': { get: operation({ '200': jsonResponse({}) }) },
      '/a/b/{y}': { get: operation({ '200': jsonResponse({}) }) }
    })
    expect(() => messages({}, ambiguous, '/a/b/c')).toThrow(
      'Path "/a/b/c" is ambiguous in the OpenAPI spec: /a/{x}/c, /a/b/{y}'
    )
  })

  it('supports recursive schemas at any depth', () => {
    const recursive = makeSpec(
      {
        '/tree': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/Node' })
          })
        }
      },
      {
        Node: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/components/schemas/Node' }
            }
          }
        }
      }
    )
    const deep = {
      name: 'a',
      children: [{ name: 'b', children: [{ name: 'c' }] }]
    }
    expect(messages(deep, recursive, '/tree')).toEqual([])
    const invalid = {
      name: 'a',
      children: [{ name: 'b', children: [{ name: 1 }] }]
    }
    expect(messages(invalid, recursive, '/tree')).toEqual([
      expect.objectContaining({ path: '/children/0/children/0/name' })
    ])
  })

  it('decodes JSON Pointer escapes and percent-encoding in refs', () => {
    const escaped = makeSpec(
      {
        '/escaped': {
          get: operation({
            '200': jsonResponse({
              type: 'object',
              properties: {
                slash: { $ref: '#/components/schemas/a~1b' },
                tilde: { $ref: '#/components/schemas/c~0d' },
                percent: { $ref: '#/components/schemas/e%20f' }
              }
            })
          })
        }
      },
      {
        'a/b': { type: 'string' },
        'c~d': { type: 'integer' },
        'e f': { type: 'boolean' }
      }
    )
    expect(
      messages({ slash: 's', tilde: 1, percent: true }, escaped, '/escaped')
    ).toEqual([])
    expect(
      messages({ slash: 1, tilde: 's', percent: 's' }, escaped, '/escaped')
    ).toHaveLength(3)
  })

  it('percent-decodes the whole ref fragment before splitting segments', () => {
    const encoded = makeSpec(
      {
        '/partly': {
          get: operation({
            '200': jsonResponse({
              $ref: '#/components/schemas/Foo%2Fproperties%2Fname'
            })
          })
        },
        '/fully': {
          get: operation({
            '200': jsonResponse({
              $ref: '#%2Fcomponents%2Fschemas%2FFoo%2Fproperties%2Fname'
            })
          })
        }
      },
      { Foo: { properties: { name: { type: 'string' } } } }
    )
    expect(messages('x', encoded, '/partly')).toEqual([])
    expect(messages(1, encoded, '/partly')).toHaveLength(1)
    expect(messages('x', encoded, '/fully')).toEqual([])
    expect(messages(1, encoded, '/fully')).toHaveLength(1)
  })

  it('resolves response refs, status ranges and default responses', () => {
    const responses = makeSpec(
      {
        '/r': {
          get: operation({
            '200': { $ref: '#/components/responses/Ok' },
            '4XX': jsonResponse({ type: 'object', required: ['error'] }),
            default: jsonResponse({ type: 'object', required: ['fault'] })
          })
        }
      },
      {},
      { responses: { Ok: jsonResponse({ type: 'string' }) } }
    )
    expect(messages('ok', responses, '/r', 200)).toEqual([])
    expect(messages({ error: 'x' }, responses, '/r', 404)).toEqual([])
    expect(messages({ fault: 'x' }, responses, '/r', 503)).toEqual([])
    expect(messages({}, responses, '/r', 404)).toHaveLength(1)
  })

  it('accepts JSON media type variants', () => {
    const problem = makeSpec({
      '/p': {
        get: operation({
          '200': {
            content: {
              'text/plain': { schema: { type: 'integer' } },
              'application/problem+json': { schema: { type: 'string' } }
            }
          }
        })
      }
    })
    expect(messages('x', problem, '/p')).toEqual([])
  })

  it('supports Swagger 2.0 response schemas', () => {
    const swagger: Spec = {
      swagger: '2.0',
      paths: {
        '/s': {
          get: operation({
            '200': { schema: { $ref: '#/definitions/Thing' } }
          })
        }
      },
      definitions: { Thing: { type: 'object', required: ['id'] } }
    }
    expect(messages({ id: 1 }, swagger, '/s')).toEqual([])
    expect(messages({}, swagger, '/s')).toHaveLength(1)
  })

  it('applies OpenAPI 3.0 nullable beside refs without type', () => {
    const nullable = makeSpec(
      {
        '/n': {
          get: operation({
            '200': jsonResponse({
              type: 'object',
              properties: {
                owner: {
                  nullable: true,
                  allOf: [{ $ref: '#/components/schemas/Owner' }]
                },
                name: { type: 'string', nullable: true }
              }
            })
          })
        }
      },
      { Owner: { type: 'object', required: ['id'] } }
    )
    expect(messages({ owner: null, name: null }, nullable, '/n')).toEqual([])
    expect(messages({ owner: { id: 1 } }, nullable, '/n')).toEqual([])
    expect(messages({ owner: {} }, nullable, '/n')).not.toEqual([])
  })

  it('keeps refs into a nullable schema descendant working', () => {
    const nested = makeSpec(
      {
        '/d': {
          get: operation({
            '200': jsonResponse({
              $ref: '#/components/schemas/Foo/properties/id'
            })
          })
        }
      },
      {
        Foo: {
          nullable: true,
          allOf: [{ type: 'object' }],
          properties: { id: { type: 'integer' } }
        }
      }
    )
    expect(messages(1, nested, '/d')).toEqual([])
    expect(messages('x', nested, '/d')).toHaveLength(1)
  })

  it('resolves nullable schemas stored outside components and aliases into them', () => {
    const spec: Spec = {
      ...makeSpec(
        {
          '/ext': {
            get: operation({
              '200': jsonResponse({ $ref: '#/x-definitions/Foo' })
            })
          },
          '/alias': {
            get: operation({
              '200': jsonResponse({ $ref: '#/x-definitions/Alias' })
            })
          }
        },
        {
          Union: {
            nullable: true,
            anyOf: [{ type: 'integer' }, { type: 'string' }]
          }
        }
      ),
      'x-definitions': {
        Foo: { nullable: true, allOf: [{ type: 'string' }] },
        Alias: { $ref: '#/components/schemas/Union/anyOf/0' }
      }
    }
    expect(messages('ok', spec, '/ext')).toEqual([])
    expect(messages(null, spec, '/ext')).toEqual([])
    expect(messages(1, spec, '/alias')).toEqual([])
    expect(messages('x', spec, '/alias')).not.toEqual([])
  })

  it('selects a response stored beneath a nullable schema', () => {
    const spec = makeSpec(
      {
        '/x': {
          get: operation({
            '200': { $ref: '#/components/schemas/Foo/x-response' }
          })
        }
      },
      {
        Foo: {
          nullable: true,
          allOf: [{ type: 'string' }],
          'x-response': jsonResponse({ type: 'string' })
        }
      }
    )
    expect(messages('ok', spec, '/x')).toEqual([])
    expect(messages(1, spec, '/x')).toHaveLength(1)
  })

  it('applies nullable through a default response and keyword-named components', () => {
    const nullableValue = {
      type: 'object',
      properties: { value: { nullable: true, allOf: [{ type: 'string' }] } }
    }
    const spec = makeSpec(
      {
        '/default': {
          get: operation({ default: jsonResponse(nullableValue) })
        },
        '/named': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/enum' })
          })
        }
      },
      { enum: nullableValue }
    )
    expect(messages({ value: null }, spec, '/default', 500)).toEqual([])
    expect(messages({ value: null }, spec, '/named')).toEqual([])
    expect(messages({ value: 1 }, spec, '/named')).not.toEqual([])
  })

  it('matches path parameters inside a segment', () => {
    const files = makeSpec({
      '/files/{name}.json': {
        get: operation({ '200': jsonResponse({ type: 'string' }) })
      },
      '/files/{name}': {
        get: operation({ '200': jsonResponse({ type: 'integer' }) })
      },
      '/tiles/{z}-{x}': {
        get: operation({ '200': jsonResponse({ type: 'boolean' }) })
      }
    })
    const locate = (path: string) =>
      locateStrictResponseSchema(files, { path, method: 'GET' }).label
    expect(locate('/files/a.json')).toBe('GET /files/{name}.json 200')
    expect(locate('/files/a')).toBe('GET /files/{name} 200')
    expect(locate('/tiles/3-4')).toBe('GET /tiles/{z}-{x} 200')
  })

  it('rejects a non-matching templated segment in bounded time', () => {
    const params = Array.from({ length: 8 }, (_, i) => `{p${i}}`).join('-')
    const spec = makeSpec({
      [`/r/${params}.json`]: {
        get: operation({ '200': jsonResponse({ type: 'object' }) })
      }
    })
    const path = `/r/${'a-'.repeat(200)}a.txt`
    const started = Date.now()
    expect(() =>
      locateStrictResponseSchema(spec, { path, method: 'GET' })
    ).toThrow('is not documented')
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('validates OpenAPI 3.1 schemas with embedded $id in any call order', () => {
    const v31 = (): Spec => ({
      openapi: '3.1.0',
      paths: {
        '/parent': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/Foo' })
          })
        },
        '/child': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/Foo/$defs/Bar' })
          })
        }
      },
      components: {
        schemas: {
          Foo: {
            type: 'object',
            $defs: {
              Bar: { $id: 'https://example.org/Bar', type: 'string' }
            },
            properties: {
              b: { $ref: '#/components/schemas/Foo/$defs/Bar' }
            }
          }
        }
      }
    })
    const spec = v31()
    expect(messages({ b: 'x' }, spec, '/parent')).toEqual([])
    expect(messages('x', spec, '/child')).toEqual([])
    expect(messages(1, spec, '/child')).toHaveLength(1)
    expect(messages({ b: 1 }, spec, '/parent')).toHaveLength(1)
  })

  it('resolves OpenAPI 3.1 fragments against the enclosing $id resource', () => {
    const spec: Spec = {
      openapi: '3.1.0',
      paths: {
        '/scoped': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/Foo' })
          })
        }
      },
      components: {
        schemas: {
          Inner: { type: 'string' },
          Foo: {
            $id: 'https://example.com/foo',
            type: 'object',
            $defs: { Inner: { type: 'integer' } },
            properties: { v: { $ref: '#/$defs/Inner' } }
          }
        }
      }
    }
    expect(messages({ v: 1 }, spec, '/scoped')).toEqual([])
    expect(messages({ v: 'bad' }, spec, '/scoped')).toHaveLength(1)
  })

  it('rejects array indices with leading zeros and keeps numeric object keys', () => {
    const spec = makeSpec(
      {
        '/zero': {
          get: operation({
            '200': jsonResponse({
              $ref: '#/components/schemas/Union/anyOf/01'
            })
          })
        },
        '/canonical': {
          get: operation({
            '200': jsonResponse({
              $ref: '#/components/schemas/Union/anyOf/1'
            })
          })
        },
        '/key': {
          get: operation({
            '200': jsonResponse({ $ref: '#/components/schemas/Codes/01' })
          })
        }
      },
      {
        Union: { anyOf: [{ type: 'string' }, { type: 'integer' }] },
        Codes: { '01': { type: 'boolean' } }
      }
    )
    expect(() => messages(2, spec, '/zero')).toThrow('Unresolved $ref')
    expect(messages(2, spec, '/canonical')).toEqual([])
    expect(messages(true, spec, '/key')).toEqual([])
  })

  it('accepts boolean response schemas in OpenAPI 3.1', () => {
    const v31 = (schema: boolean): Spec => ({
      openapi: '3.1.0',
      paths: { '/b': { get: operation({ '200': jsonResponse(schema) }) } }
    })
    expect(messages({ any: 1 }, v31(true), '/b')).toEqual([])
    expect(messages({ any: 1 }, v31(false), '/b')).toHaveLength(1)
  })

  it('uses JSON Schema 2020-12 for OpenAPI 3.1', () => {
    const v31: Spec = {
      openapi: '3.1.0',
      paths: {
        '/t': {
          get: operation({
            '200': jsonResponse({
              type: 'array',
              prefixItems: [{ type: 'string' }, { type: 'integer' }],
              items: false
            })
          })
        }
      }
    }
    expect(messages(['a', 1], v31, '/t')).toEqual([])
    expect(messages([1, 'a'], v31, '/t')).toHaveLength(2)
  })

  it('ignores ref-like values inside examples and enums', () => {
    const examples = makeSpec({
      '/e': {
        get: operation({
          '200': jsonResponse({
            type: 'object',
            example: { $ref: '#/nowhere' },
            properties: {
              example: { type: 'string' },
              kind: { enum: [{ $ref: '#/nowhere' }] }
            }
          })
        })
      }
    })
    expect(messages({ example: 'x' }, examples, '/e')).toEqual([])
  })

  it('never mutates the caller spec', () => {
    const frozen = deepFreeze(
      makeSpec(
        {
          '/f': {
            get: operation({
              '200': jsonResponse({
                nullable: true,
                allOf: [{ $ref: '#/components/schemas/F' }]
              })
            })
          }
        },
        { F: { type: 'object' } }
      )
    )
    const before = JSON.stringify(frozen)
    expect(messages(null, frozen, '/f')).toEqual([])
    expect(JSON.stringify(frozen)).toBe(before)
  })

  it('returns the documented schema without resolving it in place', () => {
    const { schema } = validateStrictOpenApi({ data: [] }, spec, {
      path: '/movies',
      method: 'get'
    })
    expect(schema).toEqual({ $ref: '#/components/schemas/MovieList' })
  })
})

describe('locateStrictResponseSchema errors', () => {
  const spec = makeSpec(
    {
      '/movies': {
        get: operation({
          '200': jsonResponse({ $ref: '#/components/schemas/Movie' }),
          '204': { description: 'empty' }
        })
      }
    },
    { Movie: { type: 'object' } }
  )

  it.each([
    [
      { method: 'GET' },
      'strictOpenApi requires "path" (or "endpoint") and "method" options'
    ],
    [
      { path: '/movies' },
      'strictOpenApi requires "path" (or "endpoint") and "method" options'
    ],
    [
      { path: '/nope', method: 'GET' },
      'Path "/nope" is not documented in the OpenAPI spec'
    ],
    [
      { path: '/movies', method: 'PATCH' },
      'Method PATCH is not documented for path "/movies"'
    ],
    [
      { path: '/movies', method: 'GET', status: 500 },
      'Status 500 is not documented for GET /movies 500 (documented: 200, 204)'
    ],
    [
      { path: '/movies', method: 'GET', status: 204 },
      'No JSON response schema documented for GET /movies 204'
    ]
  ])('rejects %j', (target, message) => {
    expect(() => locateStrictResponseSchema(spec, target)).toThrow(message)
  })

  it('rejects a spec without paths', () => {
    expect(() =>
      locateStrictResponseSchema(
        { openapi: '3.0.0' },
        { path: '/a', method: 'GET' }
      )
    ).toThrow('Invalid OpenAPI specification: missing "paths" object')
  })

  it.each([
    [
      '#/components/schemas/Missing',
      'Unresolved $ref "#/components/schemas/Missing"'
    ],
    [
      'https://example.com/schema.json',
      'Unsupported $ref "https://example.com/schema.json": only local refs ("#/...") are supported'
    ],
    [
      'other.yaml#/Movie',
      'Unsupported $ref "other.yaml#/Movie": only local refs ("#/...") are supported'
    ],
    [
      '#Movie',
      'Unsupported $ref "#Movie": only JSON Pointer fragments are supported'
    ]
  ])('reports nested ref %s', (ref, problem) => {
    const broken = makeSpec(
      {
        '/b': {
          get: operation({
            '200': jsonResponse({
              type: 'object',
              properties: { deep: { type: 'array', items: { $ref: ref } } }
            })
          })
        }
      },
      {}
    )
    expect(() =>
      locateStrictResponseSchema(broken, { path: '/b', method: 'GET' })
    ).toThrow(
      `Response schema for GET /b 200 has invalid references: ${problem}`
    )
  })

  it('reports an unresolved response ref', () => {
    const broken = makeSpec({
      '/b': {
        get: operation({ '200': { $ref: '#/components/responses/Gone' } })
      }
    })
    expect(() =>
      locateStrictResponseSchema(broken, { path: '/b', method: 'GET' })
    ).toThrow(
      'Unresolved $ref "#/components/responses/Gone" while resolving GET /b 200'
    )
  })

  it('reports circular response refs', () => {
    const loop = makeSpec(
      {
        '/b': {
          get: operation({ '200': { $ref: '#/components/responses/A' } })
        }
      },
      {},
      {
        responses: {
          A: { $ref: '#/components/responses/B' },
          B: { $ref: '#/components/responses/A' }
        }
      }
    )
    expect(() =>
      locateStrictResponseSchema(loop, { path: '/b', method: 'GET' })
    ).toThrow(
      'Circular $ref "#/components/responses/A" while resolving GET /b 200'
    )
  })
})
