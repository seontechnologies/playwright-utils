# File Utilities

- [File Utilities](#file-utilities)
  - [Usage Examples](#usage-examples)
    - [UI-Triggered Download Example](#ui-triggered-download-example)
    - [API-Triggered Download Example](#api-triggered-download-example)
  - [Core Functions](#core-functions)
    - [CSV Reader](#csv-reader)
      - [`readCSV(options)`](#readcsvoptions)
    - [XLSX Reader](#xlsx-reader)
      - [`readXLSX(options)`](#readxlsxoptions)
    - [PDF Reader](#pdf-reader)
      - [`readPDF(options)`](#readpdfoptions)
      - [Important Limitations](#important-limitations)
      - [Examples](#examples)
    - [ZIP Reader](#zip-reader)
      - [`readZIP(options)`](#readzipoptions)
    - [Example of Expected CSV Structure](#example-of-expected-csv-structure)

The `file-utils` module provides a comprehensive set of utilities for reading and processing files in your Playwright tests. It supports common file formats like CSV, XLSX, PDF, and ZIP.

These utilities can be imported directly from the package and used in your tests.

## Usage Examples

Here are examples of how to use the file utilities in your tests, based on real test implementations:

### UI-Triggered Download Example

```typescript
import {
  handleDownload,
  readPDF,
  readCSV,
  readXLSX,
  readZIP
} from '@seontechnologies/playwright-utils/file-utils'
import path from 'node:path'

const DOWNLOAD_DIR = path.join(__dirname, '../downloads')

test('should download and read a CSV file via UI', async ({ page }) => {
  const downloadPath = await handleDownload({
    page,
    downloadDir: DOWNLOAD_DIR,
    trigger: () => page.getByTestId('download-button-text/csv').click()
  })

  const csvResult = await readCSV({ filePath: downloadPath })

  // Access parsed data and headers
  const { data, headers } = csvResult.content
  expect(headers).toEqual(['ID', 'Name', 'Email'])
  expect(data[0]).toMatchObject({
    ID: expect.any(String),
    Name: expect.any(String),
    Email: expect.any(String)
  })
})
```

### API-Triggered Download Example

You can also use `handleDownload` with API calls to trigger downloads. This is particularly useful for testing file generation endpoints:

```typescript
import { handleDownload } from '@seontechnologies/playwright-utils/file-utils'
import { test, expect } from '@playwright/test'
import path from 'node:path'

const DOWNLOAD_DIR = path.join(__dirname, '../downloads')

// Example using a direct API call to trigger the download
test('should download file via API', async ({ page, request }) => {
  const downloadPath = await handleDownload({
    page, // Still need the page for download events
    downloadDir: DOWNLOAD_DIR,
    trigger: async () => {
      // Make an API request that returns a file download
      const response = await request.get('/api/export/csv', {
        headers: { Authorization: 'Bearer your-token' }
        // Important: The API should respond with Content-Disposition header
        // Example: 'attachment; filename="report.csv"'
      })

      if (!response.ok()) {
        throw new Error(`API request failed: ${response.status()}`)
      }
    }
  })

  // Now you can verify the downloaded file
  expect(downloadPath).toMatch(/\.csv$/)
})
```

> **Note:** When using API-triggered downloads, ensure that:
>
> 1. The API endpoint sets the correct `Content-Disposition` header
> 2. The response includes the appropriate `Content-Type` for the file
> 3. Any required authentication/authorization headers are included
> 4. The response status code is 200 (OK)

## Core Functions

### CSV Reader

#### `readCSV(options)`

Reads a CSV file and parses it into an array of objects, where each object represents a row.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the CSV file.
  - `delimiter` (string, optional): Character used to separate values (default: ',').
  - `encoding` (string, optional): File encoding (default: 'utf8').
  - `parseHeaders` (boolean, optional): Whether to use the first row as headers (default: true).
  - `trim` (boolean, optional): Whether to trim whitespace from values (default: true).

**Example:**

```typescript
const csvResult = await readCSV({ filePath: downloadPath })
const { data, headers } = csvResult.content

// Check headers
expect(headers).toEqual([
  'alert_id',
  'alert_trigger_name'
  // ... more headers
])

// Check data structure
expect(Array.isArray(data)).toBe(true)
expect(data.length).toBeGreaterThan(0)

// Flexible pattern-based assertions
expect(data[0]).toMatchObject({
  alert_id: expect.stringMatching(/^[A-Za-z0-9]+$/),
  alert_status: 'open',
  transaction_amount: expect.stringContaining('USD')
})
```

### XLSX Reader

#### `readXLSX(options)`

Reads an XLSX (Excel) file and parses its content. It can handle multiple sheets.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the XLSX file.
  - `sheetName` (string, optional): Name of the sheet to set as active (defaults to the first sheet).

**Example:**

```typescript
const xlsxResult = await readXLSX({ filePath: downloadPath })

// Verify worksheet structure
expect(xlsxResult.content.worksheets.length).toBeGreaterThan(0)
const worksheet = xlsxResult.content.worksheets[0]
expect(worksheet).toBeDefined()
expect(worksheet).toHaveProperty('name')

// Make sure we have sheet data
const sheetData = worksheet?.data
expect(sheetData).toBeDefined()
expect(Array.isArray(sheetData)).toBe(true)

// Use type assertion for type safety
const firstRow = sheetData![0] as Record<string, unknown>
expect(typeof firstRow).toBe('object')
expect(firstRow).toHaveProperty('id')

// Check specific data points
expect(typeof firstRow.transaction_id).toBe('string')
expect(typeof firstRow.fraud_score).toBe('number')
expect(worksheet?.data[3]?.fraud_score).toBe(0.9)
```

### PDF Reader

#### `readPDF(options)`

Reads a PDF file and extracts its text content and metadata using the `unpdf` library (PDF.js wrapper).

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the PDF file (required).
  - `mergePages` (boolean, optional): Whether to merge text from all pages (default: `true`).
  - `maxPages` (number, optional): Maximum number of pages to extract.
  - `debug` (boolean, optional): Enable debug logging.

**Returns:**

An object with the following structure:

```typescript
{
  filePath: string;      // Original file path
  fileName: string;      // Base filename
  extension: 'pdf';      // File extension
  content: string;       // Extracted text content
  pagesCount: number;    // Total number of pages
  info: {                // PDF metadata and extraction info
    ...pdfMetadata,      // Standard PDF metadata (Title, Author, etc.)
    textExtractionSuccess: boolean;
    extractionMethod: string;
    isVectorBased?: boolean; // Only present when extraction fails and PDF is vector-based
    extractionNotes?: string; // Only present when extraction fails
  };
  metadata: Record<string, unknown>; // Additional PDF metadata
}
```

#### Important Limitations

⚠️ **Vector-based PDFs**: Text extraction may fail for PDFs that store text as vector graphics (e.g., those generated by jsPDF). Such PDFs will have:

- `textExtractionSuccess: false`
- `isVectorBased: true`
- Explanatory message in `extractionNotes`

For reliable text extraction, ensure your PDFs are generated with embedded text.

#### Examples

```typescript
// Text-based PDF example
const downloadPath = await handleDownload({
  page,
  downloadDir: DOWNLOAD_DIR,
  trigger: () => page.getByTestId('download-button-Text-based PDF Document').click()
})

const pdfResult = await readPDF({ filePath: downloadPath })

expect(pdfResult.pagesCount).toBe(1)
expect(pdfResult.fileName).toContain('.pdf')
expect(pdfResult.content).toContain('All you need is the free Adobe Acrobat Reader')

// Vector-based PDF example (extraction fails gracefully)
const downloadPath = await handleDownload({
  page,
  downloadDir: DOWNLOAD_DIR,
  trigger: () => page.getByTestId('download-button-Vector-based PDF Document').click()
})

const pdfResult = await readPDF({ filePath: downloadPath })

expect(pdfResult.pagesCount).toBe(1)
expect(pdfResult.fileName).toContain('.pdf')
expect(pdfResult.info.extractionNotes).toContain(
  'Text extraction from vector-based PDFs is not supported.'
)

// Advanced usage with options
const result = await readPDF({
  filePath: '/path/to/document.pdf',
  mergePages: false, // Keep pages separate
  debug: true,      // Enable debug logging
  maxPages: 10      // Limit processing to first 10 pages
})
```

### ZIP Reader

#### `readZIP(options)`

Reads the contents of a ZIP file, listing its entries and optionally extracting a specific file into memory as Buffer.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the ZIP file.
  - `fileToExtract` (string, optional): A specific file to extract into a memory buffer.

**Example:**

```typescript
// Basic usage - just list ZIP contents
const zipResult = await readZIP({ filePath: downloadPath })
expect(Array.isArray(zipResult.content.entries)).toBe(true)
expect(zipResult.content.entries).toContain(
  'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'
)

// Extract specific file
const targetFile = 'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'
const zipWithExtraction = await readZIP({
  filePath: downloadPath,
  fileToExtract: targetFile
})

// Access extracted file buffer
const extractedFiles = zipWithExtraction.content.extractedFiles || {}
const fileBuffer = extractedFiles[targetFile]
expect(fileBuffer).toBeInstanceOf(Buffer)
expect(fileBuffer?.length).toBeGreaterThan(0)
```

### Example of Expected CSV Structure

```typescript
interface CSVRow {
  id: string
  name: string
  email: string
}
```
