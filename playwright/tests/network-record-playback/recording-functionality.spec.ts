import { expect, test } from '@playwright/support/merged-fixtures'
import { promises as fs } from 'fs'
import { log } from 'src/log'
/* eslint-disable @typescript-eslint/no-explicit-any */

test.describe('Network Recorder - Recording Functionality', () => {
  // Use a specific test directory to avoid conflicts
  const testHarDir = 'har-files/network-recorder-tests'

  test.beforeEach(async () => {
    await log.step('Clean up test directory before each test')
    try {
      await fs.rm(testHarDir, { recursive: true, force: true })
    } catch {
      // Directory doesn't exist, that's fine
    }
  })

  test('should create HAR file with correct structure during recording', async ({
    context,
    page,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    await log.step('Setup network recording with custom HAR directory')
    await networkRecorder.setup(context, {
      harFile: {
        harDir: testHarDir,
        baseName: 'test-recording'
      }
    })

    await log.step('Make some network requests')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await log.step('Get the recorder context to find the HAR file path')
    const recorderContext = networkRecorder.getContext()

    await log.step('Force cleanup to ensure HAR is written')
    await networkRecorder.cleanup()

    await log.step('Verify HAR file exists')
    const harExists = await fs
      .access(recorderContext.harFilePath)
      .then(() => true)
      .catch(() => false)

    expect(harExists).toBe(true)

    await log.step('Read and validate HAR structure')
    const harContent = await fs.readFile(recorderContext.harFilePath, 'utf-8')
    const harData = JSON.parse(harContent)

    await log.step('Validate HAR structure')
    expect(harData).toMatchObject({
      log: {
        version: expect.any(String),
        creator: expect.objectContaining({
          name: expect.any(String),
          version: expect.any(String)
        }),
        pages: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String)
          })
        ]),
        entries: expect.any(Array)
      }
    })

    await log.step('Should have captured at least one request')
    expect(harData.log.entries.length).toBeGreaterThan(0)

    await log.step('Validate first entry structure')
    const firstEntry = harData.log.entries[0]
    expect(firstEntry).toMatchObject({
      startedDateTime: expect.any(String),
      time: expect.any(Number),
      request: expect.objectContaining({
        method: expect.any(String),
        url: expect.any(String),
        headers: expect.any(Array),
        httpVersion: expect.any(String)
      }),
      response: expect.objectContaining({
        status: expect.any(Number),
        headers: expect.any(Array),
        content: expect.objectContaining({
          size: expect.any(Number),
          mimeType: expect.any(String)
        })
      })
    })
  })

  test('should handle concurrent recordings with file locking', async ({
    context,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    await log.step('Create two recorders for the same test')
    const recorder1 = networkRecorder.create({
      harFile: { harDir: testHarDir }
    })
    const recorder2 = networkRecorder.create({
      harFile: { harDir: testHarDir }
    })

    await log.step('Setup first recorder')
    await recorder1.setup(context)

    await log.step('Second recorder should fail due to file lock')
    await expect(recorder2.setup(context)).rejects.toThrow()

    await log.step('Cleanup')
    await recorder1.cleanup()
  })

  test('should respect URL filter during recording', async ({
    context,
    page,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    await networkRecorder.setup(context, {
      harFile: {
        harDir: testHarDir,
        baseName: 'filtered'
      },
      recording: {
        urlFilter: /\/api\// // Only record API calls
      }
    })

    await log.step('Make mixed requests')
    await page.goto('/')
    await page.evaluate(() => fetch('/api/movies'))

    const recorderContext = networkRecorder.getContext()
    await networkRecorder.cleanup()

    await log.step('Check HAR only contains API calls')
    const harContent = await fs.readFile(recorderContext.harFilePath, 'utf-8')
    const harData = JSON.parse(harContent)

    await log.step('All entries should be API calls')
    const nonApiEntries = harData.log.entries.filter(
      (e: any) => !e.request.url.includes('/api/')
    )

    expect(nonApiEntries.length).toBe(0)
  })

  test('should handle recording errors gracefully', async ({
    context,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    // Create recorder with invalid path
    const recorder = networkRecorder.create({
      harFile: {
        harDir: '/root/cannot-write-here' // Permission denied
      }
    })

    await log.step('Should throw during setup or cleanup')
    await expect(recorder.setup(context)).rejects.toThrow()
  })

  test('should generate unique HAR files per test', async ({
    context,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    await networkRecorder.setup(context, {
      harFile: { harDir: testHarDir }
    })

    const context1 = networkRecorder.getContext()
    await networkRecorder.cleanup()

    await log.step('Create another recorder with different config')
    const recorder2 = networkRecorder.create({
      harFile: { harDir: testHarDir, baseName: 'different-test' }
    })

    await recorder2.setup(context)
    const context2 = recorder2.getContext()

    await log.step('Should have different HAR file paths')
    expect(context1.harFilePath).not.toBe(context2.harFilePath)

    await recorder2.cleanup()
  })

  test('should provide accurate status and stats', async ({
    context,
    page,
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'record'

    // Check initial status
    const initialStatus = networkRecorder.getStatusMessage()
    expect(initialStatus).toContain('record')

    await networkRecorder.setup(context, {
      harFile: { harDir: testHarDir }
    })

    // Make some requests
    await page.goto('/')

    const recorderContext = networkRecorder.getContext()
    expect(recorderContext.mode).toBe('record')
    expect(recorderContext.isActive).toBe(true)

    await networkRecorder.cleanup()

    // Get HAR stats
    const stats = await networkRecorder.getHarStats()
    expect(stats.exists).toBe(true)
    expect(stats.size).toBeGreaterThan(0)
    expect(stats.entriesCount).toBeGreaterThan(0)
  })
})

test.describe('Network Recorder - Mode Detection', () => {
  test('should respect environment variable for mode', async ({
    networkRecorder
  }) => {
    // Test valid modes
    const modes: Array<'record' | 'playback' | 'disabled'> = [
      'record',
      'playback',
      'disabled'
    ]

    for (const mode of modes) {
      process.env.PW_NET_MODE = mode

      const recorder = networkRecorder.create()
      const recorderContext = recorder.getContext()
      expect(recorderContext.mode).toBe(mode)
    }
  })

  test('should default to disabled when PW_NET_MODE is empty', async ({
    networkRecorder
  }) => {
    // Test empty/undefined environment variable
    delete process.env.PW_NET_MODE

    const recorder = networkRecorder.create()
    const recorderContext = recorder.getContext()
    expect(recorderContext.mode).toBe('disabled')
  })

  test('should throw error for invalid PW_NET_MODE values', async ({
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'invalid-mode'

    // Should throw during creation when mode is detected
    expect(() => networkRecorder.create()).toThrow(
      /Invalid network mode 'invalid-mode'/
    )
  })

  test('should allow forceMode to override environment', async ({
    networkRecorder
  }) => {
    process.env.PW_NET_MODE = 'playback'

    const recorder = networkRecorder.create({
      forceMode: 'record' // Override environment
    })

    const recorderContext = recorder.getContext()
    expect(recorderContext.mode).toBe('record')
  })
})
