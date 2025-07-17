import AdmZip from 'adm-zip'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ZIPReadResult, SupportedFileType } from './types'
import { ZipError } from './types'

/** Validates that a file exists at the given path */
const validateFileExists = async (filePath: string): Promise<void> => {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error instanceof Error) {
      throw new ZipError(`ZIP file not found at ${filePath}: ${error.message}`)
    }
    throw error
  }
}

/** Validates that a requested file exists in the ZIP entries */
const validateZipEntryExists = (
  fileToExtract: string,
  entryNames: string[]
): void => {
  if (!entryNames.includes(fileToExtract)) {
    throw new ZipError(`File not found in ZIP archive: ${fileToExtract}`)
  }
}

/** Extracts a single file from ZIP entries */
const extractFileFromEntries = (
  entries: AdmZip.IZipEntry[],
  fileToExtract: string
): Record<string, Buffer> => {
  const entry = entries.find((e) => e.entryName === fileToExtract)
  return entry ? { [fileToExtract]: entry.getData() } : {}
}

/** Creates the base result object for ZIP operations */
const createZipResult = (filePath: string, entryNames: string[]) => ({
  filePath,
  fileName: path.basename(filePath),
  extension: 'zip' as SupportedFileType,
  content: {
    entries: entryNames
  }
})

/**
 * Read the contents of a ZIP file
 *
 * @example
 * ```typescript
 * // List files only
 * const zipContents = await readZIP({ filePath: 'path/to/archive.zip' })
 * console.log(zipContents.content.entries)
 *
 * // Extract a specific file
 * const withExtraction = await readZIP({
 *   filePath: 'path/to/archive.zip',
 *   fileToExtract: 'path/to/file.txt'
 * })
 * const fileBuffer = withExtraction.content.extractedFiles?.['path/to/file.txt']
 * ```
 *
 * @param options Options for reading the ZIP file
 * @returns Information about the ZIP contents and optionally an extracted file
 */
export async function readZIP({
  filePath,
  fileToExtract
}: {
  filePath: string
  fileToExtract?: string
}): Promise<ZIPReadResult> {
  await validateFileExists(filePath)

  try {
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()
    const entryNames = entries.map((entry) => entry.entryName)

    // Extract file if requested
    const extractedFiles = fileToExtract
      ? (() => {
          validateZipEntryExists(fileToExtract, entryNames)
          return {
            extractedFiles: extractFileFromEntries(entries, fileToExtract)
          }
        })()
      : {}

    return {
      ...createZipResult(filePath, entryNames),
      content: {
        entries: entryNames,
        ...extractedFiles
      }
    }
  } catch (error) {
    if (error instanceof ZipError) throw error
    if (error instanceof Error) {
      throw new ZipError(`Error reading ZIP file: ${error.message}`)
    }
    throw new ZipError('Unknown error reading ZIP file')
  }
}
