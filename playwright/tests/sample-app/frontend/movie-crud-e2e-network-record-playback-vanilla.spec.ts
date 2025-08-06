import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Vanilla Playwright HAR Recording & Playback Demo
 *
 * This test demonstrates how to use Playwright's native HAR recording/playback
 * without our network recorder utility. Compare this to the utility version
 * to see the benefits of our abstraction.
 *
 * ⚠️ MAJOR LIMITATION: This demo only loads a page - NO CRUD operations!
 * Vanilla Playwright HAR playback is STATELESS, making it unsuitable for:
 * - Create/Update/Delete operations
 * - Any test that modifies data during execution
 * - Polling scenarios where state changes over time
 *
 * Why? HAR files are static recordings. If you CREATE a movie during playback,
 * the next GET request still returns the original recorded list (without your new movie).
 * This breaks realistic test scenarios.
 *
 * Our utility solves this with intelligent STATEFUL mocking that maintains
 * in-memory state during playback, making CRUD operations work naturally.
 *
 * To record: Change mode to 'record' and run the test
 * To playback: Change mode to 'playback' and run the test
 */

const mode = 'playback' as 'record' | 'playback' // Change this to switch modes
const harDir = 'har-files/vanilla-demo'
const harFilePath = path.join(harDir, 'movies-page.har')

test.describe('movie page - vanilla playwright HAR demo', () => {
  test.beforeAll(async () => {
    await fs.mkdir(harDir, { recursive: true })

    if (mode === 'record') {
      // ❌ PROBLEM: Vanilla Playwright requires empty HAR file to exist before recording
      const emptyHar = {
        log: {
          version: '1.2',
          creator: { name: 'playwright', version: '1.0' },
          pages: [],
          entries: []
        }
      }
      await fs.writeFile(harFilePath, JSON.stringify(emptyHar, null, 2))
      console.log('📁 Created empty HAR file for recording')
    }
  })

  test('should load movies page and display seeded movies', async ({
    browser
  }) => {
    let context

    // ❌ PROBLEM: Must manually load and manage auth state
    const authStoragePath = '.auth/local/admin/storage-state.json'
    let storageState
    try {
      storageState = JSON.parse(await fs.readFile(authStoragePath, 'utf-8'))
      console.log('✓ Loaded authentication storage state')
    } catch {
      console.log(
        '⚠️  No auth storage state found - test may redirect to login'
      )
    }

    if (mode === 'record') {
      console.log('=4 RECORDING MODE - Capturing network traffic to HAR file')

      context = await browser.newContext({
        storageState: storageState || undefined
      })

      // ❌ PROBLEM: Complex HAR configuration required
      await context.routeFromHAR(harFilePath, {
        update: true,
        updateContent: 'embed'
      })
    } else {
      console.log(
        '�  PLAYBACK MODE - Using recorded network traffic from HAR file'
      )

      // ❌ PROBLEM: Manual file existence checks required
      try {
        await fs.access(harFilePath)
        console.log('HAR file found, will use recorded responses')
      } catch {
        throw new Error(
          `HAR file not found at ${harFilePath}. Please run in record mode first.`
        )
      }

      context = await browser.newContext({
        storageState: storageState || undefined
      })

      // ❌ PROBLEM: Different configuration for playback mode
      await context.routeFromHAR(harFilePath, {
        update: false,
        notFound: 'fallback'
      })
    }

    const page = await context.newPage()

    // ❌ PROBLEM: the actual test starts here, everything before is setup for record & playback
    // We also have to wrap the test in a try catch, so that we can clean up the context
    try {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('/movies')

      const movieElements = page.locator('[data-testid*="movie-"]')
      await movieElements.first().waitFor({ timeout: 10000 })

      const movieCount = await movieElements.count()

      // In record mode, we expect 2 seeded movies
      // In playback mode, we should get the same recorded data
      expect(movieCount).toBeGreaterThanOrEqual(1)
    } catch (error) {
      console.error('❌ Test failed:', error)
      throw error
    } finally {
      // ❌ PROBLEM: Manual cleanup required or HAR data may be lost
      console.log('🧹 Cleaning up browser context (required for HAR recording)')
      await context.close()
    }
  })
})

/**
 * How this differs from our network recorder utility:
 *
 * VANILLA PLAYWRIGHT (this test):
 * ❌ Manual HAR file path management
 * ❌ Manual directory creation
 * ❌ Manual empty HAR file creation for recording
 * ❌ Manual auth storage state loading
 * ❌ Manual mode switching logic
 * ❌ Manual error handling for missing files
 * ❌ Required try/catch/finally blocks for cleanup
 * ❌ Manual context.close() to flush HAR data
 * ❌ No environment variable control
 * ❌ No automatic test isolation
 * ❌ FATAL: No stateful CRUD handling - can only do read-only tests!
 * ❌ FATAL: Stateless solution for stateful problems - breaks realistic scenarios
 * ❌ Much more boilerplate code
 *
 * OUR NETWORK RECORDER UTILITY:
 * ✅ Automatic HAR file organization by test
 * ✅ Environment variable control (PW_NET_MODE)
 * ✅ Automatic auth integration (no manual storage state)
 * ✅ Automatic fallback handling
 * ✅ Built-in file locking for parallel tests
 * ✅ Intelligent stateful mocking for CRUD
 * ✅ Authentication-agnostic design
 * ✅ Fixture-based setup (automatic cleanup)
 * ✅ Cross-environment CORS handling
 * ✅ No try/catch/finally blocks needed
 * ✅ Zero boilerplate - just setup() and you're done!
 */
