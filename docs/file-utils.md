# File Utilities

- [File Utilities](#file-utilities)
  - [Usage Examples](#usage-examples)
  - [Core Functions](#core-functions)
    - [File Waiter](#file-waiter)
      - [`waitForFile(filePath, options)`](#waitforfilefilepath-options)
    - [CSV Reader](#csv-reader)
      - [`readCSV(options)`](#readcsvoptions)
    - [XLSX Reader](#xlsx-reader)
      - [`readXLSX(options)`](#readxlsxoptions)
    - [PDF Reader](#pdf-reader)
      - [`readPDF(options)`](#readpdfoptions)
    - [ZIP Reader](#zip-reader)
      - [`readZIP(options)`](#readzipoptions)

The `file-utils` module provides a comprehensive set of utilities for reading and processing files in your Playwright tests. It supports common file formats like CSV, XLSX, PDF, and ZIP.

These utilities can be imported directly from the package and used in your tests.

## Usage Examples

Here are examples of how to use the file utilities in your tests, based on real test implementations:

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

test('should download and read a CSV file', async ({ page }) => {
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

## Core Functions

### File Waiter

#### `waitForFile(filePath, options)`

Waits for a file to exist at the given path. This is useful for ensuring a downloaded file is fully written to disk before attempting to read it.

**Arguments:**

- `filePath` (string): Path to the file to wait for.
- `options` (object, optional):
  - `timeout` (number): Maximum time to wait in milliseconds (default: 30000).
  - `interval` (number): Interval between checks in milliseconds (default: 250).
  - `log` (boolean | string): Custom message for logging (default: 'Waiting for file to be available').

**Example:**

```typescript
import { waitForFile } from '@seon/playwright-utils/file-utils'

// Wait for a file with default options
await waitForFile('/path/to/download.csv')

// Wait with custom options
await waitForFile('/path/to/large-file.xlsx', {
  timeout: 60000,
  log: 'Waiting for large Excel file to download'
})
```

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

Reads a PDF file and extracts its text content and metadata.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the PDF file.
  - `maxPages` (number, optional): Maximum number of pages to extract.

**Example:**

```typescript
const downloadPath = await handleDownload({
  page,
  downloadDir: DOWNLOAD_DIR,
  trigger: () => page.getByTestId('download-button-application/pdf').click()
})

const pdfResult = await readPDF({ filePath: downloadPath })

// Basic validations
expect(pdfResult.pagesCount).toBe(1)
expect(pdfResult.fileName).toContain('.pdf')

// You can also log the full result for inspection
await log.info(pdfResult)
```

### ZIP Reader

#### `readZIP(options)`

Reads the contents of a ZIP file, listing its entries and optionally extracting files into memory.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the ZIP file.
  - `extractFiles` (string[], optional): A list of specific files to extract into memory buffers.
  - `extractAll` (boolean, optional): If true, extracts all files into memory.

**Example:**

```typescript
const downloadPath = await handleDownload({
  page,
  downloadDir: DOWNLOAD_DIR,
  trigger: () => page.getByTestId('download-button-application/zip').click()
})

// First, check basic ZIP structure without extraction
const zipResult = await readZIP({ filePath: downloadPath })
expect(Array.isArray(zipResult.content.entries)).toBe(true)
expect(zipResult.content.entries).toContain(
  'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'
)

// Extract specific file by providing extractFiles option
const targetFile = 'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'
const zipWithExtraction = await readZIP({
  filePath: downloadPath,
  extractFiles: [targetFile]
})

// Verify the file was extracted
expect(zipWithExtraction.content.extractedFiles).toBeDefined()
const extractedFiles = zipWithExtraction.content.extractedFiles || {}
expect(Object.keys(extractedFiles)).toContain(targetFile)

// Type-safe buffer access with proper checks
const fileBuffer = extractedFiles[targetFile]
expect(fileBuffer).toBeInstanceOf(Buffer)
expect(fileBuffer?.length).toBeGreaterThan(0)
```
