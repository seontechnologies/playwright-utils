import { tokenizePathTemplate } from './path-template'

const viaRegex = (path: string) => path.replace(/\{[^}]+\}/g, '{id}')
const viaTokens = (path: string) =>
  tokenizePathTemplate(path)
    .map((token) => (token.param ? '{id}' : token.text))
    .join('')

describe('tokenizePathTemplate', () => {
  it('splits literals and params', () => {
    expect(tokenizePathTemplate('/files/{name}.json')).toEqual([
      { param: false, text: '/files/' },
      { param: true, text: '{name}' },
      { param: false, text: '.json' }
    ])
  })

  it.each([
    '',
    '/movies',
    '/movies/{id}',
    '/a/{x}-{y}/b',
    '{}',
    '/a/{}/b',
    '{{a}',
    '{a{b}c}',
    '}{',
    '/{unclosed',
    '{{{{',
    '{}}{x}'
  ])('matches the legacy regex for %p', (path) => {
    expect(viaTokens(path)).toBe(viaRegex(path))
  })

  it('matches the legacy regex on random input', () => {
    const alphabet = ['{', '}', 'a', '/', '-']
    let seed = 7
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed
    }
    for (let run = 0; run < 2000; run++) {
      const length = next() % 12
      const path = Array.from(
        { length },
        () => alphabet[next() % alphabet.length]
      ).join('')
      expect(viaTokens(path)).toBe(viaRegex(path))
    }
  })

  it('stays linear on many repeated braces', () => {
    const path = '{'.repeat(200000)
    const started = Date.now()
    expect(viaTokens(path)).toBe(path)
    expect(Date.now() - started).toBeLessThan(500)
  })
})
