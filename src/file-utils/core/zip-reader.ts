import { promises as fs } from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import type { ZIPReadOptions, ZIPReadResult, ZIPValidateOptions } from './types'

const DEFAULT_OPTIONS: Required<Omit<ZIPReadOptions, 'extractToDir'>> = {
  extractAll: false,
  extractFiles: []
}

/**
 * Read the contents of a ZIP file
 *
 * @example
 * ```typescript
 * const zipContents = await readZIP({ filePath: 'path/to/archive.zip' });
 * console.log(zipContents.content.entries);
 * ```
 *
 * @param options Options for reading the ZIP file
 * @returns Information about the ZIP contents
 */
export async function readZIP(
  options: { filePath: string } & Partial<ZIPReadOptions>
): Promise<ZIPReadResult> {
  const { filePath, ...readOptions } = options
  const opts = { ...DEFAULT_OPTIONS, ...readOptions }

  try {
    await fs.access(filePath)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ZIP file not found at ${filePath}: ${error.message}`)
    }
    throw error
  }

  try {
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()
    const entryNames = entries.map((entry) => entry.entryName)

    const result: ZIPReadResult = {
      filePath,
      fileName: path.basename(filePath),
      extension: 'zip',
      content: {
        entries: entryNames
      }
    }

    if (
      opts.extractAll ||
      (opts.extractFiles && opts.extractFiles.length > 0)
    ) {
      const filesToExtract = opts.extractFiles?.length
        ? opts.extractFiles
        : entryNames

      const extractedFiles: Record<string, Buffer> = {}
      for (const fileName of filesToExtract) {
        const entry = entries.find((e) => e.entryName === fileName)
        if (entry) {
          extractedFiles[fileName] = entry.getData()
        }
      }
      result.content.extractedFiles = extractedFiles
    }

    return result
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error reading ZIP file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Validate a ZIP file by checking its structure and contents
 *
 * @example
 * ```typescript
 * await validateZIP({ filePath: 'path/to/archive.zip' });
 *
 * await validateZIP({
 *   filePath: 'path/to/archive.zip',
 *   expectedEntries: ['data.csv', 'config.json']
 * });
 * ```
 *
 * @param options Options for validating the ZIP file
 * @returns true if validation succeeds, otherwise throws an error
 */
export async function validateZIP(
  options: { filePath: string } & ZIPValidateOptions
): Promise<boolean> {
  const { filePath, expectedEntries = [], readOptions = {} } = options

  const zipContents = await readZIP({
    filePath,
    ...readOptions
  })

  if (expectedEntries.length > 0) {
    const missingEntries = expectedEntries.filter(
      (expected) => !zipContents.content.entries.includes(expected)
    )

    if (missingEntries.length > 0) {
      throw new Error(
        `ZIP file missing expected entries: ${missingEntries.join(', ')}`
      )
    }
  }

  return true
}

/**
 * Extract a file from a ZIP file to a buffer
 *
 * @example
 * ```typescript
 * const csvBuffer = await extractFileFromZIP({
 *   filePath: 'path/to/archive.zip',
 *   fileToExtract: 'data.csv'
 * });
 * ```
 *
 * @param options Options for extracting a file
 * @returns Buffer containing the extracted file data
 */
export async function extractFileFromZIP(options: {
  filePath: string
  fileToExtract: string
}): Promise<Buffer> {
  const { filePath, fileToExtract } = options

  try {
    const zip = new AdmZip(filePath)
    const entry = zip.getEntry(fileToExtract)

    if (!entry) {
      throw new Error(`File not found in ZIP: ${fileToExtract}`)
    }

    return entry.getData()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error extracting file from ZIP: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract all files from a ZIP to a directory
 *
 * @example
 * ```typescript
 * const extractedFiles = await extractZIP({
 *   filePath: 'path/to/archive.zip',
 *   extractToDir: 'path/to/output/directory'
 * });
 * ```
 *
 * @param options Options for extracting the ZIP
 * @returns Array of extracted file paths
 */
export async function extractZIP(options: {
  filePath: string
  extractToDir: string
}): Promise<string[]> {
  const { filePath, extractToDir } = options

  try {
    await fs.mkdir(extractToDir, { recursive: true })

    const zip = new AdmZip(filePath)
    zip.extractAllTo(extractToDir, true)

    const entries = zip.getEntries()
    return entries.map((entry) => path.join(extractToDir, entry.entryName))
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error extracting ZIP: ${error.message}`)
    }
    throw error
  }
}
