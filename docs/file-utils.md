# File Utilities

The `file-utils` module provides a comprehensive set of utilities for reading, validating, and waiting for files in your Playwright tests. It supports common file formats like CSV, XLSX, PDF, and ZIP.

These utilities can be used directly or through the convenient `fileUtils` fixture, which bundles all functions into a single object.

## Fixture Usage

// TODO: update when we have actual code samples from the tests in this repo

The easiest way to use the file utilities is through the `fileUtils` fixture. It provides access to all functions without needing to manage imports.

```typescript
import { test } from '@seon/playwright-utils/file-utils/fixtures'

test('should download and validate a CSV file', async ({ page, fileUtils }) => {
  // Trigger a file download in your application
  await page.getByRole('button', { name: 'Download CSV' }).click()

  // The download event provides the path to the temporary file
  const download = await page.waitForEvent('download')
  const filePath = await download.path()

  // Validate the downloaded file
  const isValid = await fileUtils.validateCSV({
    filePath,
    expectedHeaders: ['ID', 'Name', 'Email'],
    expectedRowCount: 10
  })

  expect(isValid).toBe(true)
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
const result = await fileUtils.readCSV({ filePath: '/path/to/file.csv' })
console.log(result.content) // Array of objects, one per row
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
const result = await fileUtils.readXLSX({
  filePath: '/path/to/file.xlsx',
  sheetName: 'Data'
})
console.log(result.content.activeSheet) // Data from the 'Data' sheet
```

#### `validateXLSX(options)`

Validates an XLSX file against expected sheet name, headers, row count, and cell values.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the XLSX file.
  - `sheetName` (string, optional): Which sheet to validate (defaults to the first).
  - `expectedHeaders` (string[], optional): Array of column headers that must exist.
  - `expectedRowCount` (number, optional): The exact number of data rows expected.
  - `cellValues` (object[], optional): Array of cell validations by coordinates.

**Example:**

```typescript
const isValid = await fileUtils.validateXLSX({
  filePath: 'path/to/file.xlsx',
  sheetName: 'Users',
  expectedHeaders: ['ID', 'Username']
})
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
const result = await fileUtils.readPDF({ filePath: '/path/to/file.pdf' })
console.log(result.content) // Text content from the PDF
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
const zipContents = await fileUtils.readZIP({
  filePath: 'path/to/archive.zip',
  extractFiles: ['data.csv', 'config.json']
})
const csvBuffer = zipContents.content.extractedFiles?.['data.csv']
```

#### `validateZIP(options)`

Validates a ZIP file by ensuring it contains a list of expected file entries.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the ZIP file.
  - `expectedEntries` (string[], optional): An array of file names that must exist in the ZIP archive.

**Example:**

```typescript
const isValid = await fileUtils.validateZIP({
  filePath: 'path/to/archive.zip',
  expectedEntries: ['data.csv', 'README.md']
})
```

#### `extractFileFromZIP(options)`

Extracts a single file from a ZIP archive and returns its content as a buffer.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the ZIP file.
  - `fileToExtract` (string): The name of the file to extract from the archive.

**Example:**

```typescript
const csvBuffer = await fileUtils.extractFileFromZIP({
  filePath: 'path/to/archive.zip',
  fileToExtract: 'data.csv'
})
```

#### `extractZIP(options)`

Extracts all files from a ZIP archive to a specified directory on the filesystem.

**Arguments:**

- `options` (object):
  - `filePath` (string): Path to the ZIP file.
  - `extractToDir` (string): The output directory where files will be extracted.

**Example:**

```typescript
const extractedFiles = await fileUtils.extractZIP({
  filePath: 'path/to/archive.zip',
  extractToDir: 'path/to/output'
})
console.log(extractedFiles) // Array of paths to the extracted files
```
