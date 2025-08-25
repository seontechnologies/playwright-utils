import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { promises as fs } from 'fs'
import { log } from 'src/log'

test.describe('network recorder - auto-record fallback', () => {
  test('should automatically switch to record mode when HAR file is missing', async ({
    page,
    networkRecorder,
    context
  }) => {
    process.env.PW_NET_MODE = 'playback'

    const recorderContext = networkRecorder.getContext()
    const harFilePath = recorderContext.harFilePath

    await log.step(
      'Delete HAR file if it exists to simulate missing HAR scenario'
    )
    try {
      await fs.unlink(harFilePath)
      await log.debug(`Deleted existing HAR file: ${harFilePath}`)
    } catch {
      await log.debug(`HAR file does not exist (expected): ${harFilePath}`)
    }

    await log.step('Setup network recorder - should auto-switch to record mode')
    await networkRecorder.setup(context)

    await log.step('Verify the recorder switched to record mode')
    const contextAfterSetup = networkRecorder.getContext()
    expect(contextAfterSetup.mode).toBe('record')
    await log.info('✅ Verified mode switched from playback to record')

    await log.step('Navigate and perform actions to generate network traffic')
    await page.goto('/')

    const { name, year, rating, director } = {
      name: 'auto-fallback-test-movie',
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
