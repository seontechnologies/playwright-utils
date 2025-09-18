/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * UI display functionality for API requests
 * Adapted from pw-api-plugin to provide rich visual feedback in Playwright UI
 */

import { test, type Page } from '@playwright/test'
import { getLogger } from '../internal'

/** Request data interface for UI display */
export interface RequestDataInterface {
  url: string
  method: string
  headers?: object
  data?: any
  params?: object
  otherOptions?: object
  validationInfo?: {
    schemaFormat: string
    validationTime: number
    success: boolean
    errorCount: number
  }
}

/** Response data interface for UI display */
export interface ResponseDataInterface {
  status: number
  statusClass: string
  statusText: string
  headers?: object
  body?: any
  duration?: number
  validationResult?: {
    icon: '✅' | '❌'
    summary: string
    schemaInfo: string
    errors?: string[]
    schema?: object
  }
}

/**
 * Adds an API card to the UI by updating the page content with the provided request and response data.
 * Only works when a page context is available (UI tests)
 */
export const addApiCardToUI = async (
  requestData: RequestDataInterface,
  responseData: ResponseDataInterface,
  page?: Page,
  uiMode?: boolean
): Promise<void> => {
  // Only show UI if we have a page and UI mode is enabled (either via parameter or environment variable)
  const shouldShowUI = page && (uiMode || shouldDisplayApiUI())

  if (!shouldShowUI) return

  try {
    const apiCallHtml = await createApiCallHtml(requestData, responseData)
    const html = await createPageHtml(apiCallHtml)

    // Open validation results in a new tab if this is a validation request
    if (requestData.validationInfo) {
      // Create a new page/tab for validation results
      const newPage = await page.context().newPage()
      await newPage.setContent(html)

      // Optional: Bring the new tab to front
      await newPage.bringToFront()
    } else {
      // For non-validation requests, use the original behavior
      await page.setContent(html)
    }

    // Also attach as test report since UI mode is enabled
    const method = requestData.method.toUpperCase()
    await test.info().attach(`API request - ${method} - ${requestData.url}`, {
      body: await createApiCallReportAttachment(apiCallHtml),
      contentType: 'text/html'
    })
  } catch (error) {
    await getLogger().warning(`Failed to display API UI: ${error}`)
  }
}

/**
 * Determines if API UI should be displayed based on environment variables
 */
const shouldDisplayApiUI = (): boolean => {
  // One environment variable to rule them all
  const envUiMode = process.env.API_E2E_UI_MODE
  if (envUiMode === 'true') return true
  if (envUiMode === 'false') return false

  // Default is false unless explicitly enabled
  return false
}

/**
 * Generates an HTML representation of an API call
 */
const createApiCallHtml = async (
  requestData: RequestDataInterface,
  responseData: ResponseDataInterface
): Promise<string> => {
  const callId = Math.floor(10000000 + Math.random() * 90000000)

  // Add validation results section if present
  const validationSection = responseData.validationResult
    ? `
        <hr>
        <div class="pw-api-validation">
            <label class="title">${responseData.validationResult.icon} SCHEMA VALIDATION - </label>
            <label class="title-property">${responseData.validationResult.summary}</label>
            <br>
            <label class="property">Schema Info:</label> ${responseData.validationResult.schemaInfo}
            ${
              responseData.validationResult.schema
                ? `
                    <div class="pw-val-data-tabs-${callId} pw-data-tabs">
                        ${await createValidationTab(
                          responseData.validationResult.errors &&
                            responseData.validationResult.errors.length > 0
                            ? `<div style="color: #d00;">
                                <strong>❌ Validation Failed - ${responseData.validationResult.errors.length} error(s):</strong>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    ${responseData.validationResult.errors.map((err) => `<li>${err}</li>`).join('')}
                                </ul>
                              </div>`
                            : '<span style="color: #0d0; font-weight: bold;">✅ All validations passed successfully</span>',
                          'VALIDATION RESULT',
                          callId,
                          true
                        )}
                        ${await createValidationTab(
                          formatJson(responseData.validationResult.schema),
                          'SCHEMA',
                          callId
                        )}
                    </div>
                  `
                : responseData.validationResult.errors &&
                    responseData.validationResult.errors.length > 0
                  ? `
                      <br><br>
                      <label class="property">Validation Errors:</label>
                      <div class="pw-validation-errors" style="background: #ffe6e6; border-left: 4px solid #ff0000; padding: 10px; margin-top: 10px;">
                          <ul style="margin: 0; padding-left: 20px;">
                              ${responseData.validationResult.errors.map((err) => `<li style="color: #d00;">${err}</li>`).join('')}
                          </ul>
                      </div>
                    `
                  : '<br><span style="color: #0d0;">✓ All validations passed</span>'
            }
        </div>
      `
    : ''

  return `<div class="pw-api-call pw-card">
        ${await createApiCallHtmlRequest(requestData, callId)}
        <hr>
        ${await createApiCallHtmlResponse(responseData, callId)}
        ${validationSection}
    </div>`
}

/**
 * Generates HTML for the request section
 */
const createApiCallHtmlRequest = async (
  requestData: RequestDataInterface,
  callId: number
): Promise<string> => {
  const { url, method, headers, data, params, otherOptions } = requestData

  const requestHeaders = headers ? formatJson(headers) : undefined
  const requestBody = data ? formatJson(data) : undefined
  const requestParams = params ? formatJson(params) : undefined
  const requestOtherOptions = otherOptions
    ? formatJson(otherOptions)
    : undefined

  return `<div class="pw-api-request">
        <label class="title">REQUEST - </label>
        <label class="title-property">(METHOD: ${method.toUpperCase()})</label>
        <br>

        <label class="property">URL</label>
        <pre class="hljs pw-api-hljs">${url}</pre>
        <div class="pw-req-data-tabs-${callId} pw-data-tabs">
            ${await createRequestTab(requestBody, 'BODY', callId, true)}
            ${await createRequestTab(requestHeaders, 'HEADERS', callId)}
            ${await createRequestTab(requestParams, 'PARAMS', callId)}
            ${await createRequestTab(requestOtherOptions, 'OTHER OPTIONS', callId)}
        </div>
    </div>`
}

/**
 * Creates HTML for a request tab
 */
const createRequestTab = async (
  data: any,
  tabLabel: string,
  callId: number,
  checked?: boolean
): Promise<string> => {
  if (data === undefined) return ''

  const tabLabelForId = tabLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `<input type="radio" name="pw-req-data-tabs-${callId}" id="pw-req-${tabLabelForId}-${callId}" ${
    checked ? 'checked="checked"' : ''
  }>
        <label for="pw-req-${tabLabelForId}-${callId}" class="property pw-tab-label">${tabLabel.toUpperCase()}</label>
        <div class="pw-tab-content">
           <pre class="hljs" id="req-${tabLabelForId}-${callId}" data-tab-type="req-${tabLabelForId}">${data}</pre>
        </div>`
}

/**
 * Generates HTML for the response section
 */
const createApiCallHtmlResponse = async (
  responseData: ResponseDataInterface,
  callId: number
): Promise<string> => {
  const { status, statusClass, statusText, headers, body, duration } =
    responseData

  const responseHeaders = headers ? formatJson(headers) : undefined
  const responseBody = body ? formatJson(body) : undefined
  const durationMsg = duration
    ? 'Duration approx. ' +
      (duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`)
    : ''

  return `<div class="pw-api-response">
        <label class="title">RESPONSE - </label>
        <label class="title-property pw-api-${statusClass}">(STATUS: ${status} - ${statusText})</label>
        <label class="title-property"> - ${durationMsg}</label>
        <br>
        <div class="pw-res-data-tabs-${callId} pw-data-tabs">
            ${await createResponseTab(responseBody, 'BODY', callId, true)}
            ${await createResponseTab(responseHeaders, 'HEADERS', callId)}
         </div>
    </div>`
}

/**
 * Creates HTML for a response tab
 */
const createResponseTab = async (
  data: any,
  tabLabel: string,
  callId: number,
  checked?: boolean
): Promise<string> => {
  if (data === undefined) return ''

  const tabLabelForId = tabLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `<input type="radio" name="pw-res-data-tabs-${callId}" id="pw-res-${tabLabelForId}-${callId}" ${
    checked ? 'checked="checked"' : ''
  }>
        <label for="pw-res-${tabLabelForId}-${callId}" class="property pw-tab-label">${tabLabel.toUpperCase()}</label>
        <div class="pw-tab-content">
            <pre class="hljs" id="res-${tabLabelForId}-${callId}" data-tab-type="res-${tabLabelForId}">${data}</pre>
        </div>`
}

/**
 * Creates HTML for a validation tab
 */
const createValidationTab = async (
  data: any,
  tabLabel: string,
  callId: number,
  checked?: boolean
): Promise<string> => {
  if (data === undefined) return ''

  const tabLabelForId = tabLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `<input type="radio" name="pw-val-data-tabs-${callId}" id="pw-val-${tabLabelForId}-${callId}" ${
    checked ? 'checked="checked"' : ''
  }>
        <label for="pw-val-${tabLabelForId}-${callId}" class="property pw-tab-label">${tabLabel.toUpperCase()}</label>
        <div class="pw-tab-content">
            <pre class="hljs" id="val-${tabLabelForId}-${callId}" data-tab-type="val-${tabLabelForId}">${data}</pre>
        </div>`
}

/**
 * Creates a complete HTML page for API call display
 */
const createPageHtml = async (apiCallHtml: string): Promise<string> => {
  return `<!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Call Details</title>
            ${inlineStyles}
        </head>
        <body>
            <div class="pw-api-container">${apiCallHtml}</div>
        </body>
    </html>`
}

/**
 * Creates HTML for API call report attachment
 */
const createApiCallReportAttachment = async (
  apiCallHtml: string
): Promise<string> => {
  return `<html>
        <head>
            <title>API Call Report</title>
            ${inlineStyles}
        </head>
        <body>
            ${apiCallHtml}
        </body>
    </html>`
}

/**
 * Formats a JSON object for display with basic highlighting
 */
const formatJson = (jsonObject: object): string => {
  try {
    const jsonString = JSON.stringify(jsonObject, null, 4)
    // First escape HTML entities to prevent XSS
    const escapedString = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    // Then apply syntax highlighting
    return escapedString
      .replace(/&quot;([^&]+)&quot;:/g, '<span class="json-key">"$1":</span>')
      .replace(
        /: &quot;([^&]+)&quot;/g,
        ': <span class="json-string">"$1"</span>'
      )
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="json-literal">$1</span>')
  } catch {
    return String(jsonObject)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
}

/**
 * Inline CSS styles for the API display
 */
const inlineStyles = `<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
    .pw-card { 
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.1); 
        transition: 0.3s; 
        border-radius: 8px;
        overflow: hidden;
    }
    .pw-card:hover { box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2); }
    .pw-api-container { color: rgb(40, 40, 40); max-width: 1200px; margin: 0 auto; }
    .pw-api-call { 
        background-color: rgb(248, 250, 252); 
        border: 1px solid rgb(226, 232, 240);
        margin: 20px 0; 
        padding: 20px; 
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
    }
    .pw-api-request, .pw-api-response { margin-bottom: 20px; }
    .title { 
        font-weight: 800; 
        font-size: 1.4em; 
        color: rgb(30, 64, 175);
        margin-right: 10px;
    }
    .title-property { 
        color: rgb(75, 85, 99); 
        font-weight: 600; 
        font-size: 1.1em; 
    }
    .property { 
        display: inline-block;
        padding: 8px 12px; 
        margin: 10px 5px 0 0; 
        cursor: pointer;
        color: rgb(55, 65, 81); 
        font-weight: 600; 
        font-size: 0.9em; 
        border-radius: 6px 6px 0 0;
        background-color: rgb(229, 231, 235);
        border: 1px solid rgb(209, 213, 219);
    }
    .pw-api-hljs { 
        background: white;
        border: 1px solid rgb(229, 231, 235);
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        font-size: 0.9em;
        overflow-x: auto;
    }
    
    /* Status color coding */
    .pw-api-1xx { color: rgb(59, 130, 246)!important; }
    .pw-api-2xx { color: rgb(34, 197, 94)!important; }
    .pw-api-3xx { color: rgb(249, 115, 22)!important; }
    .pw-api-4xx { color: rgb(239, 68, 68)!important; }
    .pw-api-5xx { color: rgb(220, 38, 127)!important; }
    
    /* Tab styling */
    .pw-data-tabs { display: flex; flex-wrap: wrap; margin-top: 10px; }
    .pw-data-tabs [type="radio"] { display: none; }
    .pw-tab-label { 
        background-color: rgb(243, 244, 246);
        border: 1px solid rgb(209, 213, 219);
        border-bottom: none;
    }
    .pw-tab-label:hover { 
        background-color: rgb(229, 231, 235);
        color: rgb(30, 64, 175); 
    }
    .pw-tab-content { 
        width: 100%; 
        order: 1; 
        display: none;
        border: 1px solid rgb(209, 213, 219);
        border-top: none;
        border-radius: 0 0 6px 6px;
    }
    .pw-data-tabs [type="radio"]:checked + label + .pw-tab-content { display: block; }
    .pw-data-tabs [type="radio"]:checked + label { 
        background: white; 
        border-bottom: 1px solid white;
        color: rgb(30, 64, 175);
        font-weight: 700;
    }
    
    .hljs { 
        background: white;
        padding: 16px; 
        margin: 0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.85em;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    
    /* Simple JSON highlighting */
    .json-key { color: rgb(147, 51, 234); font-weight: 600; }
    .json-string { color: rgb(34, 197, 94); }
    .json-number { color: rgb(249, 115, 22); }
    .json-literal { color: rgb(239, 68, 68); font-weight: 600; }
    
    hr { 
        border: none; 
        height: 1px; 
        background: rgb(229, 231, 235);
        margin: 20px 0;
    }
</style>`
