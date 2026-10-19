import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { promises as fs } from 'fs'
import { randomUUID } from 'node:crypto'
import { log } from 'src/log'

test.describe('network recorder - auto-record fallback', () => {
  test('should automatically switch to record mode when HAR file is missing', async ({
    page,
    networkRecorder,
    context
  }) => {
    process.env.PW_NET_MODE = 'playback'

    // Clear this test's HAR directory so reruns also start without a recording.
    const harDir = test.info().outputPath('har-files')
    await fs.rm(harDir, { recursive: true, force: true })
    await log.step(
      'Setup network recorder with no HAR file - should auto-switch to record mode'
    )
    await networkRecorder.setup(context, {
      harFile: { harDir }
    })

    await log.step('Verify the recorder switched to record mode')
    const { harFilePath, mode } = networkRecorder.getContext()
    expect(mode).toBe('record')
    await log.info('✅ Verified mode switched from playback to record')

    await log.step('Navigate and perform actions to generate network traffic')
    await page.goto('/')

    const { name, year, rating, director } = {
      // Unique per run: movie names must be unique, and repeats run in parallel
      name: `auto-fallback-test-movie-${randomUUID().slice(0, 8)}`,
      year: 2024,
      rating: 8.5,
      director: 'Test Director'
    }

    await log.step('add a movie to generate network traffic for recording')
    await addMovie(page, name, year, rating, director)
    await page.getByTestId('add-movie-button').click()

    await log.step('Wait for the movie to appear')
    await page.getByText(name).waitFor()

    await log.step('Cleanup network recorder to ensure HAR file is written')
    await networkRecorder.cleanup()

    await log.step('Verify HAR file was created and contains recorded data')
    const harExists = await fs
      .access(harFilePath)
      .then(() => true)
      .catch(() => false)
    expect(harExists).toBe(true)
    await log.info(`✅ Verified HAR file was created: ${harFilePath}`)

    await log.step('Verify HAR file has content')
    const harContent = await fs.readFile(harFilePath, 'utf-8')
    const harData = JSON.parse(harContent)
    expect(harData.log.entries.length).toBeGreaterThan(0)
    await log.info(
      `✅ Verified HAR file contains ${harData.log.entries.length} network requests`
    )
  })
})
