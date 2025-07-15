import { promises as fs } from 'fs'
import path from 'path'
import { extractText, getDocumentProxy, getMeta } from 'unpdf'
import type { PDFReadOptions, PDFReadResult } from './types'

const DEFAULT_OPTIONS: PDFReadOptions = {
  extractText: true,
  maxPages: undefined,
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
export async function readPDF(
  opts: { filePath: string } & Partial<PDFReadOptions>
): Promise<PDFReadResult> {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  const { filePath } = opts

  try {
    // Read the PDF file into a buffer
    const dataBuffer = await fs.readFile(filePath)

    // Load the PDF document
    const pdf = await getDocumentProxy(new Uint8Array(dataBuffer))

    // Get metadata and page count
    const meta = await getMeta(pdf)

    // Extract text based on options
    let content = ''
    // Get the page count (from pdf object as meta doesn't have numPages property)
    const pagesCount = pdf.numPages

    if (options.extractText) {
      // Try multiple extraction strategies for problematic PDFs
      const strategies = [
        // Strategy 1: mergePages: true (default)
        async () => {
          console.log('Trying extraction strategy 1: mergePages=true')
          const result = await extractText(pdf, { mergePages: true })
          return result.text
        },
        // Strategy 2: mergePages: false
        async () => {
          console.log('Trying extraction strategy 2: mergePages=false')
          const result = await extractText(pdf, { mergePages: false })
          return result.text.join('\n')
        },
        // Strategy 3: Page-by-page extraction
        async () => {
          console.log('Trying extraction strategy 3: page-by-page')
          let allText = ''
          for (
            let i = 1;
            i <= Math.min(pagesCount, options.maxPages || pagesCount);
            i++
          ) {
            try {
              // @ts-expect-error okay here
              const pageResult = await extractText(pdf, {
                mergePages: true,
                pages: [i, i] as [number, number]
              })
              allText += pageResult.text + '\n'
            } catch (pageError) {
              console.log(`Failed to extract page ${i}:`, pageError)
            }
          }
          return allText.trim()
        }
      ]

      // Try each strategy until one works or all fail
      for (const [index, strategy] of strategies.entries()) {
        try {
          content = await strategy()
          if (content && content.length > 0) {
            console.log(
              `Success with strategy ${index + 1}. Text length: ${content.length}`
            )
            break
          } else {
            console.log(`Strategy ${index + 1} returned empty text`)
          }
        } catch (error) {
          console.log(`Strategy ${index + 1} failed:`, error)
          if (index === strategies.length - 1) {
            console.warn('All extraction strategies failed')
          }
        }
      }

      // Log final results
      console.log(`PDF parsing complete. Total pages: ${pagesCount}`)
      console.log(`PDF text content length: ${content.length}`)
      if (content.length === 0) {
        console.warn(
          'WARNING: No text content extracted from PDF. This may be expected for image-based or complex PDFs.'
        )
      }
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
