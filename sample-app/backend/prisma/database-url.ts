import path from 'node:path'

/**
 * Prisma 6 resolved relative SQLite paths against the schema folder. Prisma 7
 * resolves them against the working directory, so resolve them here to keep the
 * database at prisma/dev.db regardless of where a command runs from.
 */
export const resolveDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  if (!url.startsWith('file:')) return url

  const target = url.slice('file:'.length)
  // absolute paths, file://host URLs and file::memory: are used as given
  if (target.startsWith('/') || target.startsWith(':')) return url

  const [filePath = '', query] = target.split('?')
  const resolved = `file:${path.resolve(__dirname, filePath)}`
  return query === undefined ? resolved : `${resolved}?${query}`
}
