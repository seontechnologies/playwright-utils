import AdmZip from 'adm-zip'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  ZipError,
  type ZIPReadOptions,
  type ZIPReadResult,
  type SupportedFileType
} from './types'

const DEFAULT_OPTIONS: Required<Omit<ZIPReadOptions, 'extractToDir'>> = {
  extractAll: false,
  extractFiles: []
}

/**
 * Read the contents of a ZIP file
 *
 * @example
 * ```typescript
 * // Basic usage - list files
 * const zipContents = await readZIP({ filePath: 'path/to/archive.zip' });
 * console.log(zipContents.content.entries);
 *
 * // Extract specific files
 * const withExtraction = await readZIP({
 *   filePath: 'path/to/archive.zip',
 *   extractFiles: ['file1.txt', 'folder/file2.txt']
 * });
 * ```
 *
 * @param options Options for reading the ZIP file
 * @returns Information about the ZIP contents and optionally extracted files
 */
export async function readZIP(
  options: { filePath: string } & Partial<ZIPReadOptions>
): Promise<ZIPReadResult> {
  const { filePath, ...readOptions } = options
  const opts = { ...DEFAULT_OPTIONS, ...readOptions }

  await validateFileExists(filePath)

  try {
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()
    const entryNames = entries.map((entry) => entry.entryName)
    const filesToExtract = getFilesToExtract(opts, entryNames)
    const extractedFiles = filesToExtract
      ? {
          extractedFiles: extractFilesFromEntries(entries, filesToExtract)
        }
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

/** Validates that a file exists at the given path */
async function validateFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error instanceof Error) {
      throw new ZipError(`ZIP file not found at ${filePath}: ${error.message}`)
    }
    throw error
  }
}

/** Extracts specified files from ZIP entries */
function extractFilesFromEntries(
  entries: AdmZip.IZipEntry[],
  filesToExtract: string[]
): Record<string, Buffer> {
  const extractedFiles: Record<string, Buffer> = {}
  for (const fileName of filesToExtract) {
    const entry = entries.find((e) => e.entryName === fileName)
    if (entry) {
      extractedFiles[fileName] = entry.getData()
    }
  }
  return extractedFiles
}

/** Validates that all requested files exist in the ZIP entries */
function validateFilesExist(
  filesToExtract: string[],
  entryNames: string[]
): void {
  const missingFiles = filesToExtract.filter((f) => !entryNames.includes(f))
  if (missingFiles.length > 0) {
    throw new ZipError(
      `File(s) not found in ZIP archive: ${missingFiles.join(', ')}`
    )
  }
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

/** Determines which files to extract based on options */
function getFilesToExtract(
  opts: Required<Omit<ZIPReadOptions, 'extractToDir'>>,
  entryNames: string[]
): string[] | undefined {
  if (!opts.extractAll && !opts.extractFiles?.length) {
    return undefined
  }

  const filesToExtract = opts.extractFiles?.length
    ? opts.extractFiles
    : entryNames

  validateFilesExist(filesToExtract, entryNames)
  return filesToExtract
}
