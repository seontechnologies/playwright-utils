/**
 * HAR format builder for manual network recording
 *
 * This module creates HAR (HTTP Archive) format data from intercepted network requests
 * following the HAR 1.2 specification
 */

import type { APIResponse, Request, Response } from '@playwright/test'

export interface HarEntry {
  startedDateTime: string
  time: number
  request: {
    method: string
    url: string
    httpVersion: string
    cookies: Array<{ name: string; value: string }>
    headers: Array<{ name: string; value: string }>
    queryString: Array<{ name: string; value: string }>
    postData?: {
      mimeType: string
      text?: string
      params?: Array<{ name: string; value: string }>
    }
    headersSize: number
    bodySize: number
  }
  response: {
    status: number
    statusText: string
    httpVersion: string
    cookies: Array<{ name: string; value: string }>
    headers: Array<{ name: string; value: string }>
    content: {
      size: number
      mimeType: string
      text?: string
      encoding?: string
    }
    redirectURL: string
    headersSize: number
    bodySize: number
  }
  cache: {
    beforeRequest?: {
      lastAccess: string
      eTag: string
      hitCount: number
    }
    afterRequest?: {
      lastAccess: string
      eTag: string
      hitCount: number
    }
  }
  timings: {
    blocked: number
    dns: number
    connect: number
    send: number
    wait: number
    receive: number
    ssl: number
  }
}

export interface HarLog {
  version: string
  creator: {
    name: string
    version: string
  }
  browser?: {
    name: string
    version: string
  }
  pages: Array<{
    startedDateTime: string
    id: string
    title: string
    pageTimings: {
      onContentLoad?: number
      onLoad?: number
    }
  }>
  entries: HarEntry[]
}

export interface HarFile {
  log: HarLog
}

/**
 * Creates an empty HAR file structure
 */
export function createHarFile(): HarFile {
  return {
    log: {
      version: '1.2',
      creator: {
        name: 'playwright-utils-network-recorder',
        version: '1.0.0'
      },
      pages: [],
      entries: []
    }
  }
}

/**
 * Converts a Playwright request to HAR format
 */
export async function requestToHarEntry(
  request: Request,
  response: Response | APIResponse | null,
  startTime: number,
  endTime: number
): Promise<HarEntry> {
  const url = new URL(request.url())

  // Get request headers
  const requestHeaders = await request.allHeaders()
  const requestHeadersArray = Object.entries(requestHeaders).map(
    ([name, value]) => ({
      name,
      value: String(value)
    })
  )

  // Get query parameters
  const queryString = Array.from(url.searchParams.entries()).map(
    ([name, value]) => ({
      name,
      value
    })
  )

  // Get post data if present
  let postData
  const postDataBuffer = request.postDataBuffer()
  if (postDataBuffer) {
    const contentType =
      requestHeaders['content-type'] || 'application/octet-stream'
    postData = {
      mimeType: contentType,
      text: postDataBuffer.toString('utf-8')
    }
  }

  // Build response section
  let responseSection
  if (response) {
    // Handle headers differently for Response vs APIResponse
    const responseHeaders =
      'allHeaders' in response
        ? await response.allHeaders()
        : response.headers()
    const responseHeadersArray = Object.entries(responseHeaders).map(
      ([name, value]) => ({
        name,
        value: String(value)
      })
    )

    let responseBody: string | undefined
    let responseSize = 0

    try {
      const body = await response.body()
      if (body) {
        responseBody = body.toString('base64')
        responseSize = body.length
      }
    } catch {
      // Response body might not be available
    }

    responseSection = {
      status: response.status(),
      statusText: response.statusText(),
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: responseHeadersArray,
      content: {
        size: responseSize,
        mimeType: responseHeaders['content-type'] || 'application/octet-stream',
        text: responseBody,
        encoding: responseBody ? 'base64' : undefined
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: responseSize
    }
  } else {
    // Default response for failed/aborted requests
    responseSection = {
      status: 0,
      statusText: '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [],
      content: {
        size: 0,
        mimeType: 'application/octet-stream'
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: 0
    }
  }

  return {
    startedDateTime: new Date(startTime).toISOString(),
    time: endTime - startTime,
    request: {
      method: request.method(),
      url: request.url(),
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: requestHeadersArray,
      queryString,
      postData,
      headersSize: -1,
      bodySize: postDataBuffer ? postDataBuffer.length : 0
    },
    response: responseSection,
    cache: {},
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: -1,
      wait: endTime - startTime,
      receive: -1,
      ssl: -1
    }
  }
}

/**
 * Adds a page entry to the HAR file
 */
export function addPageToHar(
  har: HarFile,
  pageId: string,
  title: string
): void {
  har.log.pages.push({
    startedDateTime: new Date().toISOString(),
    id: pageId,
    title,
    pageTimings: {
      onContentLoad: -1,
      onLoad: -1
    }
  })
}

/**
 * Adds an entry to the HAR file
 */
export function addEntryToHar(har: HarFile, entry: HarEntry): void {
  har.log.entries.push(entry)
}
