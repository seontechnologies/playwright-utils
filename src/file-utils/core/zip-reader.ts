import AdmZip from 'adm-zip'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ZipError, type ZIPReadOptions, type ZIPReadResult } from './types'

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
      throw new ZipError(`ZIP file not found at ${filePath}: ${error.message}`)
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

    if (opts.extractAll || opts.extractFiles?.length) {
      const filesToExtract = opts.extractFiles?.length
        ? opts.extractFiles
        : entryNames

      const missingFiles = filesToExtract.filter((f) => !entryNames.includes(f))

      if (missingFiles.length > 0) {
        throw new ZipError(
          `File(s) not found in ZIP archive: ${missingFiles.join(', ')}`
        )
      }

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
      throw new ZipError(`Error reading ZIP file: ${error.message}`)
    }
    throw error
  }
}
