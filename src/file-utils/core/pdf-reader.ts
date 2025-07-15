import { promises as fs } from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import type { PDFReadOptions, PDFReadResult, PDFValidateOptions } from './types'

const DEFAULT_OPTIONS: PDFReadOptions = {
  extractText: true,
  maxPages: undefined
}

/**
 * Reads a PDF file and extracts its text content
 *
 * @param options - Options for PDF parsing
 * @returns Promise resolving to a PDFReadResult
 *
 * @example
 * ```ts
 * const result = await readPDF({ filePath: '/path/to/file.pdf' });
 * ```
 */
export async function readPDF(
  options: { filePath: string } & Partial<PDFReadOptions>
): Promise<PDFReadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { filePath } = options

  try {
    const dataBuffer = await fs.readFile(filePath)

    const parseOptions: pdfParse.Options = {}
    if (opts.maxPages !== undefined) {
      parseOptions.max = opts.maxPages
    }

    const pdfData = await pdfParse(dataBuffer, parseOptions)

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'pdf',
      content: opts.extractText ? pdfData.text : '',
      pagesCount: pdfData.numpages,
      info: pdfData.info ?? {}
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read PDF file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Validates a PDF file by checking if it contains expected text
 *
 * @param options - Options for validating the PDF
 * @returns Whether the validation passed
 *
 * @example
 * ```ts
 * const isValid = await validatePDF({
 *   filePath: '/path/to/invoice.pdf',
 *   expectedText: 'Invoice #12345'
 * });
 * ```
 */
export async function validatePDF(
  options: { filePath: string } & PDFValidateOptions
): Promise<boolean> {
  const result = await readPDF({
    filePath: options.filePath,
    ...(options.readOptions || {})
  })

  if (!options.expectedText) {
    // If no text is expected, validation passes if there is any content at all.
    return result.content !== ''
  }

  if (typeof options.expectedText === 'string') {
    return result.content.includes(options.expectedText)
  }

  if (options.expectedText instanceof RegExp) {
    return options.expectedText.test(result.content)
  }

  // If expectedText is provided but is not a string or RegExp, default to true.
  return true
}
