/**
 * Custom HAR playback handler that ignores authorization headers
 */

import type { BrowserContext, Route } from '@playwright/test'
import { promises as fs } from 'fs'
import type { HarFile, HarEntry } from './har-builder'
import type { HarPlaybackOptions } from './types'
import { log } from '../../log'

type RequestKey = string
type HarEntryMap = Map<RequestKey, HarEntry[]>
type UsageIndexMap = Map<RequestKey, number>

interface PlaybackState {
  entriesByUrl: HarEntryMap
  usedIndexMap: UsageIndexMap
}

/**
 * Load and parse HAR file with error handling
 */
const loadHarFile = async (harFilePath: string): Promise<HarFile | null> => {
  try {
    const harContent = await fs.readFile(harFilePath, 'utf-8')
    return JSON.parse(harContent)
  } catch (error) {
    await log.error(`Failed to read HAR file: ${harFilePath}: ${error}`)
    return null
  }
}

/**
 * Map URL from current environment to recorded environment for HAR lookup
 * This enables cross-environment playback (e.g., recorded on dev, played on preview)
 */
const mapUrlForHarLookup = (
  currentUrl: string,
  urlMapping?: HarPlaybackOptions['urlMapping']
): string => {
  if (!urlMapping) {
    return currentUrl
  }

  try {
    // 1. Custom function takes precedence
    if (urlMapping.mapUrl) {
      return urlMapping.mapUrl(currentUrl)
    }

    const url = new URL(currentUrl)

    // 2. Simple hostname mapping
    if (urlMapping.hostMapping) {
      const mappedHost = urlMapping.hostMapping[url.hostname]
      if (typeof mappedHost === 'string') {
        url.hostname = mappedHost
        return url.toString()
      }
    }

    // 3. Regex pattern matching
    if (urlMapping.patterns) {
      for (const pattern of urlMapping.patterns) {
        if (pattern.match.test(url.hostname)) {
          if (pattern.replace === undefined) {
            continue
          } else if (typeof pattern.replace === 'string') {
            url.hostname = url.hostname.replace(pattern.match, pattern.replace)
          } else {
            url.hostname = pattern.replace(url.hostname)
          }
          return url.toString()
        }
      }
    }

    return currentUrl
  } catch {
    return currentUrl
  }
}

/**
 * Create request key for matching, with URL mapping for cross-environment support
 */
const createRequestKey = (
  method: string,
  url: string,
  urlMapping?: HarPlaybackOptions['urlMapping']
): RequestKey => {
  const mappedUrl = mapUrlForHarLookup(url, urlMapping)
  return `${method}:${mappedUrl}`
}

/**
 * Sort HAR entries by timestamp to maintain chronological order
 */
const sortHarEntries = (entries: HarEntry[]): HarEntry[] =>
  [...entries].sort(
    (a, b) =>
      new Date(a.startedDateTime).getTime() -
      new Date(b.startedDateTime).getTime()
  )

/**
 * Group HAR entries by request key for faster lookup
 */
const groupEntriesByUrl = (
  entries: HarEntry[],
  urlMapping?: HarPlaybackOptions['urlMapping']
): HarEntryMap => {
  const entriesByUrl = new Map<RequestKey, HarEntry[]>()

  for (const entry of entries) {
    const key = createRequestKey(
      entry.request.method,
      entry.request.url,
      urlMapping
    )

    if (!entriesByUrl.has(key)) {
      entriesByUrl.set(key, [])
    }
    entriesByUrl.get(key)!.push(entry)
  }

  return entriesByUrl
}

/**
 * Log HAR file statistics for debugging
 */
const logHarStats = async (
  entriesByUrl: HarEntryMap,
  totalEntries: number
): Promise<void> => {
  await log.debug(`HAR file contains ${totalEntries} entries`)

  const postMovies = Array.from(entriesByUrl.keys()).filter(
    (key) => key.includes('POST') && key.includes('/movies')
  )

  if (postMovies.length > 0) {
    await log.debug(`Found POST /movies entries: ${postMovies.join(', ')}`)
  }
}

/**
 * Handle cases where no matching HAR entries are found
 */
const handleNoMatch = async (
  route: Route,
  url: string,
  method: string,
  options: { fallback?: boolean }
): Promise<void> => {
  if (url.includes('/movies')) {
    await log.debug(`  ❌ No HAR entry found for ${method} ${url}`)
  }

  if (options.fallback) {
    await route.continue()
  } else {
    await route.abort()
  }
}

/**
 * Select the appropriate HAR entry from multiple matches
 */
const selectHarEntry = async (
  entries: HarEntry[],
  key: RequestKey,
  usedIndexMap: UsageIndexMap
): Promise<HarEntry> => {
  if (entries.length === 1) {
    return entries[0]!
  }

  // Get current index for this key, default to 0
  const currentIndex = usedIndexMap.get(key) || 0
  const matchedEntry = entries[currentIndex]!

  // Update index for next time (cycle through entries)
  const nextIndex = (currentIndex + 1) % entries.length
  usedIndexMap.set(key, nextIndex)

  await log.debug(
    `  Using entry ${currentIndex + 1} of ${entries.length} for ${key}`
  )
  await log.debug(`  Next time will use entry ${nextIndex + 1}`)

  return matchedEntry
}

/**
 * Log debug information about the matched entry
 */
const logMatchedEntry = async (
  url: string,
  method: string,
  entry: HarEntry
): Promise<void> => {
  if (!url.includes('/movies')) return

  await log.debug(`🎯 Custom HAR handler matched ${method} ${url}`)
  await log.debug(`  Response status: ${entry.response.status}`)
  await log.debug(`  Response size: ${entry.response.content.size}`)
  await log.debug(`  Response encoding: ${entry.response.content.encoding}`)

  if (entry.response.content.text) {
    const preview = entry.response.content.text.substring(0, 100)
    await log.debug(`  Response preview: ${preview}...`)
  }
}

/**
 * Decode response content based on encoding
 */
const decodeResponseContent = (
  content: HarEntry['response']['content']
): string => {
  if (!content.text) return ''

  if (content.encoding === 'base64') {
    return Buffer.from(content.text, 'base64').toString('utf-8')
  }

  return content.text
}

/**
 * Unwrap API responses that have {status, data} format
 */
const unwrapApiResponse = async (
  content: string,
  mimeType?: string
): Promise<string> => {
  if (!mimeType?.includes('json')) {
    return content
  }

  try {
    const jsonData = JSON.parse(content)

    if (
      jsonData.status &&
      jsonData.data &&
      Object.keys(jsonData).length === 2
    ) {
      await log.debug('🎁 Unwrapping response from {status, data} format')
      return JSON.stringify(jsonData.data)
    }
  } catch {
    await log.debug('Response is not JSON or parsing failed, using as-is')
  }

  return content
}

/**
 * Process response content for serving
 */
const processResponseContent = async (
  response: HarEntry['response']
): Promise<Buffer | undefined> => {
  if (!response.content.text) {
    return undefined
  }

  const decodedContent = decodeResponseContent(response.content)
  const unwrappedContent = await unwrapApiResponse(
    decodedContent,
    response.content.mimeType
  )

  return Buffer.from(unwrappedContent, 'utf-8')
}

/**
 * Convert HAR headers array to object and update CORS headers
 */
const processHeaders = (
  harHeaders: HarEntry['response']['headers'],
  requestOrigin?: string
): Record<string, string> => {
  const headers: Record<string, string> = {}

  for (const header of harHeaders) {
    headers[header.name.toLowerCase()] = header.value
  }

  // Update CORS origin header for cross-environment compatibility
  if (requestOrigin && headers['access-control-allow-origin']) {
    headers['access-control-allow-origin'] = requestOrigin
  }

  return headers
}

/**
 * Fulfill route with HAR response data
 */
const fulfillRoute = async (
  route: Route,
  entry: HarEntry,
  url: string,
  method: string
): Promise<void> => {
  const response = entry.response
  const body = await processResponseContent(response)
  const requestOrigin = route.request().headers()['origin']
  const headers = processHeaders(response.headers, requestOrigin)

  try {
    await route.fulfill({
      status: response.status,
      headers,
      body
    })

    if (url.includes('/movies')) {
      await log.debug(
        `✅ Successfully fulfilled ${method} ${url} with status ${response.status}`
      )
    }
  } catch (error) {
    await log.error(`Failed to fulfill route: ${error}`)
    throw error
  }
}

/**
 * Log request interception for debugging
 */
const logRequestInterception = async (
  originalUrl: string,
  mappedUrl: string,
  method: string,
  entriesCount: number
): Promise<void> => {
  if (originalUrl.includes('/movies') || originalUrl !== mappedUrl) {
    await log.debug(`🔍 Request intercepted: ${method} ${originalUrl}`)
    if (originalUrl !== mappedUrl) {
      await log.debug(`  🔄 Mapped for HAR lookup: ${mappedUrl}`)
    }
    await log.debug(`  Entries found: ${entriesCount}`)
  }
}

/**
 * Create route handler for HAR playback
 */
const createRouteHandler =
  (state: PlaybackState, options: HarPlaybackOptions) =>
  async (route: Route): Promise<void> => {
    const request = route.request()
    const originalUrl = request.url()
    const method = request.method()
    const key = createRequestKey(method, originalUrl, options.urlMapping)
    const mappedUrl = mapUrlForHarLookup(originalUrl, options.urlMapping)

    // Find matching entries
    const entries = state.entriesByUrl.get(key) || []

    // Log request interception
    await logRequestInterception(originalUrl, mappedUrl, method, entries.length)

    // Handle no matches
    if (entries.length === 0) {
      await handleNoMatch(route, originalUrl, method, options)
      return
    }

    // Select appropriate entry
    const matchedEntry = await selectHarEntry(entries, key, state.usedIndexMap)

    // Log matched entry details
    await logMatchedEntry(originalUrl, method, matchedEntry)

    // Fulfill the route
    await fulfillRoute(route, matchedEntry, originalUrl, method)
  }

/**
 * Main setup function for custom HAR playback
 */
export async function setupCustomHarPlayback(
  context: BrowserContext,
  harFilePath: string,
  options: HarPlaybackOptions = {}
): Promise<void> {
  // Load and parse HAR file
  const harData = await loadHarFile(harFilePath)
  if (!harData) {
    if (!options.fallback) {
      throw new Error(`Failed to load HAR file: ${harFilePath}`)
    }
    return
  }

  // Process HAR entries
  const sortedEntries = sortHarEntries(harData.log.entries)
  const entriesByUrl = groupEntriesByUrl(sortedEntries, options.urlMapping)

  // Initialize playback state
  const state: PlaybackState = {
    entriesByUrl,
    usedIndexMap: new Map()
  }

  // Log statistics
  await logHarStats(entriesByUrl, harData.log.entries.length)

  // Set up route handler
  await context.route('**/*', createRouteHandler(state, options))
}
