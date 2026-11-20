import { defineConfig } from 'prisma/config'
import { resolveDatabaseUrl } from './prisma/database-url'

// Prisma 7 reads the connection URL from this file instead of schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: resolveDatabaseUrl() }
})
