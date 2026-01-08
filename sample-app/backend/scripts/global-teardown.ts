import { execSync } from 'node:child_process'
import path from 'node:path'

export default async function globalTeardown(): Promise<void> {
  console.log('Running global teardown once after everything...')

  // Restore dev.db to its git-committed state
  // This ensures the database file is byte-for-byte identical after tests
  const dbPath = path.resolve(__dirname, '../prisma/dev.db')
  const relativePath = path.relative(process.cwd(), dbPath)

  try {
    execSync(`git checkout -- "${relativePath}"`, { stdio: 'inherit' })
    console.log('Database restored to git-committed state')
  } catch (error) {
    console.warn('Could not restore dev.db from git:', error)
  }
}
