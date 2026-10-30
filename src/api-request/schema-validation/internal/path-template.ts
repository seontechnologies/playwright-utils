/** Path template tokenizing shared by OpenAPI path lookups */

export type PathTemplateToken = { param: boolean; text: string }

/**
 * Split a path into literal text and `{param}` tokens.
 * Matches the same spans as `/\{[^}]+\}/g` in linear time, because the regex
 * backtracks quadratically on input such as many repeated `{`.
 */
export function tokenizePathTemplate(path: string): PathTemplateToken[] {
  const tokens: PathTemplateToken[] = []
  let literal = ''
  let i = 0
  while (i < path.length) {
    const open = path.indexOf('{', i)
    if (open === -1) break
    const close = path.indexOf('}', open + 1)
    if (close === -1) break
    if (close === open + 1) {
      literal += path.slice(i, open + 1)
      i = open + 1
      continue
    }
    literal += path.slice(i, open)
    if (literal) tokens.push({ param: false, text: literal })
    literal = ''
    tokens.push({ param: true, text: path.slice(open, close + 1) })
    i = close + 1
  }
  literal += path.slice(i)
  if (literal) tokens.push({ param: false, text: literal })
  return tokens
}
