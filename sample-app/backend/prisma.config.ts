import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'
import { resolveDatabaseUrl } from './prisma/database-url'

// Prisma 7 no longer loads .env on its own and reads the connection URL from
// this file instead of schema.prisma.
dotenv.config({ quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: resolveDatabaseUrl() }
})
