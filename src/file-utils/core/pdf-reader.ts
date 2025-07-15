import { promises as fs } from 'fs'
import path from 'path'
import { extractText, getDocumentProxy, getMeta } from 'unpdf'
import type { PDFReadOptions, PDFReadResult } from './types'

/**
 * Note: unpdf uses PDF.js internally but doesn't expose proper TypeScript types
 * We use a minimal interface that includes only the properties we need
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDocumentType = any

const DEFAULT_OPTIONS: PDFReadOptions = {
  extractText: true,
  maxPages: undefined,
  debug: false,
  textExtractionOptions: {
    mergePages: true
  }
}

/**
 * Reads a PDF file and extracts its text content using unpdf (modern PDF.js wrapper)
 *
 * @param options - Options for PDF parsing
 * @returns Promise resolving to a PDFReadResult
 *
 * @example
 * ```ts
 * const result = await readPDF({ filePath: '/path/to/file.pdf' });
 * ```
 */
/**
 * Extract text from a PDF document using the preferred mergePages setting
 */
async function extractWithMergePagesSetting(
  pdf: PDFDocumentType,
  mergePages: boolean,
  debug = false
): Promise<string> {
  if (debug) {
    console.log(`Extracting with mergePages=${mergePages}`)
  }

  if (mergePages) {
    // Use specific overload for mergePages: true
    const result = await extractText(pdf, { mergePages: true })
    return result.text
  } else {
    // Use specific overload for mergePages: false
    const result = await extractText(pdf, { mergePages: false })
    return result.text.join('\n')
  }
}

/**
 * Extract text from a PDF document page by page
 */
async function extractPageByPage(
  pdf: PDFDocumentType,
  pagesCount: number,
  maxPages: number | undefined,
  userMergePages: boolean,
  debug = false
): Promise<string> {
  if (debug) {
    console.log('Trying extraction strategy 3: page-by-page')
  }

  let allText = ''
  for (let i = 1; i <= Math.min(pagesCount, maxPages || pagesCount); i++) {
    try {
      // The unpdf library types don't include the pages option, but it works at runtime
      // Use a type guard to ensure correct handling based on mergePages
      if (userMergePages) {
        // For mergePages: true
        const pageResult = await extractText(pdf, {
          mergePages: true,
          // The library accepts this at runtime despite types
          pages: [i, i]
        } as unknown as { mergePages: true })
        allText += pageResult.text + '\n'
      } else {
        // For mergePages: false
        const pageResult = await extractText(pdf, {
          mergePages: false,
          // The library accepts this at runtime despite types
          pages: [i, i]
        } as unknown as { mergePages?: false })
        allText += pageResult.text.join('\n') + '\n'
      }
    } catch (pageError) {
      if (debug) {
        console.log(`Failed to extract page ${i}:`, pageError)
      }
    }
  }
  return allText.trim()
}

/**
 * Try multiple extraction strategies to get text from a PDF
 */
async function tryExtractionStrategies(
  pdf: PDFDocumentType,
  pagesCount: number,
  options: PDFReadOptions
): Promise<string> {
  const userMergePages = options.textExtractionOptions?.mergePages ?? true

  if (options.debug) {
    console.log(`Using text extraction options: mergePages=${userMergePages}`)
  }

  // Define extraction strategies
  const strategies = [
    // Strategy 1: Use options.textExtractionOptions (from user or defaults)
    async () => {
      if (options.debug) {
        console.log(
          `Trying extraction strategy 1: mergePages=${userMergePages}`
        )
      }
      let content = ''

      try {
        // Attempt extraction with user-specified settings
        content = await extractWithMergePagesSetting(
          pdf,
          userMergePages,
          options.debug
        )
      } catch (error) {
        if (options.debug) {
          console.log('Strategy 1 failed:', error)
        }
      }

      // If first attempt failed, try opposite mergePages setting
      if (content.trim().length === 0) {
        if (options.debug) {
          console.log(
            'First extraction attempt returned empty string, trying opposite mergePages setting'
          )
        }
        try {
          content = await extractWithMergePagesSetting(
            pdf,
            !userMergePages,
            options.debug
          )
        } catch (error) {
          if (options.debug) {
            console.log('Opposite mergePages setting failed:', error)
          }
        }
      }

      return content
    },
    // Strategy 2: Opposite of user's mergePages setting
    async () => {
      const useOppositeMerge = !userMergePages
      if (options.debug) {
        console.log(
          `Trying extraction strategy 2: mergePages=${useOppositeMerge}`
        )
      }
      return extractWithMergePagesSetting(pdf, useOppositeMerge, options.debug)
    },
    // Strategy 3: Page-by-page extraction
    async () => {
      return extractPageByPage(
        pdf,
        pagesCount,
        options.maxPages,
        userMergePages,
        options.debug
      )
    }
  ]

  // Try each strategy until one works or all fail
  let content = ''
  for (const [index, strategy] of strategies.entries()) {
    try {
      content = await strategy()
      if (content && content.length > 0) {
        if (options.debug) {
          console.log(
            `Success with strategy ${index + 1}. Text length: ${content.length}`
          )
        }
        break
      } else {
        if (options.debug) {
          console.log(`Strategy ${index + 1} returned empty text`)
        }
      }
    } catch (error) {
      if (options.debug) {
        console.log(`Strategy ${index + 1} failed:`, error)
      }
      if (index === strategies.length - 1) {
        console.warn('All extraction strategies failed')
      }
    }
  }

  // Log final results
  if (options.debug) {
    console.log(`PDF parsing complete. Total pages: ${pagesCount}`)
    console.log(`PDF text content length: ${content.length}`)
  }

  if (content.length === 0) {
    console.warn(
      'WARNING: No text content extracted from PDF. This may be expected for image-based or complex PDFs.'
    )
  }

  return content
}

export async function readPDF(
  options: PDFReadOptions & { filePath: string }
): Promise<PDFReadResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  if (!mergedOptions.extractText) {
    throw new Error(
      'extractText must be true for PDF reading to work properly.'
    )
  }

  const { filePath } = options

  try {
    // Read the PDF file into a buffer
    const dataBuffer = await fs.readFile(filePath)

    // Load the PDF document
    const pdf = await getDocumentProxy(new Uint8Array(dataBuffer))

    // Get metadata and page count
    const meta = await getMeta(pdf)
    const pagesCount = pdf.numPages

    // Extract text based on options
    let content = ''
    if (options.extractText) {
      content = await tryExtractionStrategies(pdf, pagesCount, options)
    }

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'pdf',
      content,
      pagesCount,
      info: {
        ...meta.info,
        // Add our own debugging info
        textExtractionSuccess: content.length > 0,
        extractionMethod: content.length > 0 ? 'unpdf' : 'failed'
      },
      metadata: meta.metadata || {}
    }
  } catch (error) {
    console.error('Error during PDF parsing:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to read PDF file: ${error.message}`)
    }
    throw error
  }
}
