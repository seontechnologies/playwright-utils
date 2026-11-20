import path from 'node:path'

/**
 * Prisma 6 resolved relative SQLite paths against the schema folder. Prisma 7
 * resolves them against the working directory, so resolve them here to keep the
 * database at prisma/dev.db regardless of where a command runs from.
 */
export const resolveDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  return url.startsWith('file:.')
    ? `file:${path.resolve(__dirname, url.slice('file:'.length))}`
    : url
}
