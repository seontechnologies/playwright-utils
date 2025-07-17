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

/** Validates that all requested files exist in the ZIP entries */
const validateFilesExist = (
  filesToExtract: string[],
  entryNames: string[]
): void => {
  const missingFiles = filesToExtract.filter((f) => !entryNames.includes(f))
  if (missingFiles.length > 0) {
    throw new ZipError(
      `File(s) not found in ZIP archive: ${missingFiles.join(', ')}`
    )
  }
}

/** Determines which files to extract based on options */
const getFilesToExtract = ({
  extractAll,
  extractFiles,
  entryNames
}: {
  extractAll: boolean
  extractFiles: string[]
  entryNames: string[]
}): string[] | undefined => {
  if (!extractAll && !extractFiles?.length) {
    return undefined
  }

  const filesToExtract = extractFiles?.length ? extractFiles : entryNames

  validateFilesExist(filesToExtract, entryNames)
  return filesToExtract
}

/** Extracts specified files from ZIP entries  */
const extractFilesFromEntries = (
  entries: AdmZip.IZipEntry[],
  filesToExtract: string[]
): Record<string, Buffer> =>
  filesToExtract.reduce<Record<string, Buffer>>((acc, fileName) => {
    const entry = entries.find((e) => e.entryName === fileName)
    return entry ? { ...acc, [fileName]: entry.getData() } : acc
  }, {})

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
 * // Basic usage - list files
 * const zipContents = await readZIP({ filePath: 'path/to/archive.zip' })
 * console.log(zipContents.content.entries)
 *
 * // Extract specific files
 * const withExtraction = await readZIP({
 *   filePath: 'path/to/archive.zip',
 *   extractFiles: ['file1.txt', 'folder/file2.txt']
 * })
 * ```
 *
 * @param options Options for reading the ZIP file
 * @returns Information about the ZIP contents and optionally extracted files
 */
export async function readZIP({
  filePath,
  extractAll = false,
  extractFiles = []
}: {
  filePath: string
  extractAll?: boolean
  extractFiles?: string[]
}): Promise<ZIPReadResult> {
  await validateFileExists(filePath)

  try {
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()
    const entryNames = entries.map((entry) => entry.entryName)
    const filesToExtract = getFilesToExtract({
      extractAll,
      extractFiles,
      entryNames
    })
    const extractedFiles = filesToExtract
      ? { extractedFiles: extractFilesFromEntries(entries, filesToExtract) }
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
