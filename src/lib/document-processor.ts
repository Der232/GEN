import JSZip from 'jszip'
import { extractText } from 'unpdf'
import { db } from '#/db'
import { documents } from '#/db/schema'
import { eq } from 'drizzle-orm'

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export type SupportedFileType = 'pdf' | 'pptx' | 'docx'

/**
 * Validates magic numbers of the file buffer to verify it is genuinely a PDF, DOCX, or PPTX.
 */
export async function validateFileMagicBytes(
  buffer: ArrayBuffer,
  expectedType: SupportedFileType
): Promise<{ valid: boolean; error?: string }> {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File exceeds maximum size limit of 50 MB.' }
  }

  const bytes = new Uint8Array(buffer.slice(0, 8))

  if (expectedType === 'pdf') {
    // PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46)
    const isPdf =
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    if (!isPdf) {
      return { valid: false, error: 'Invalid PDF format: file header does not match %PDF.' }
    }
    return { valid: true }
  }

  // DOCX and PPTX are ZIP archives starting with PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
  const isZip =
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  if (!isZip) {
    return {
      valid: false,
      error: `Invalid ${expectedType.toUpperCase()} format: file is not a valid Office Open XML archive.`,
    }
  }

  try {
    const zip = await JSZip.loadAsync(buffer)
    if (expectedType === 'docx') {
      const hasDocument = zip.file('word/document.xml') !== null
      if (!hasDocument) {
        return { valid: false, error: 'Corrupted DOCX file: missing word/document.xml' }
      }
    } else if (expectedType === 'pptx') {
      const hasPresentation =
        zip.file('ppt/presentation.xml') !== null ||
        Object.keys(zip.files).some((f) => f.startsWith('ppt/slides/'))
      if (!hasPresentation) {
        return { valid: false, error: 'Corrupted PPTX file: missing ppt presentation structures' }
      }
    }
    return { valid: true }
  } catch (err: any) {
    return { valid: false, error: `Corrupted ${expectedType.toUpperCase()} file: ${err.message}` }
  }
}

/**
 * Extracts readable text from a PDF while preserving page numbers.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { text } = await extractText(buffer, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]

  const output: string[] = []
  for (let i = 0; i < pages.length; i++) {
    const pageText = (pages[i] || '').trim()
    if (pageText) {
      output.push(`[Page ${i + 1}]\n${pageText}`)
    }
  }

  return output.join('\n\n')
}

/**
 * Extracts readable text from a DOCX while preserving headings and paragraphs.
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const docXmlFile = zip.file('word/document.xml')
  if (!docXmlFile) {
    throw new Error('Invalid DOCX: missing word/document.xml')
  }

  const xml = await docXmlFile.async('text')
  return parseDocxXml(xml)
}

function parseDocxXml(xml: string): string {
  const paragraphs: string[] = []
  // Match each <w:p ...>...</w:p>
  const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g
  let pMatch: RegExpExecArray | null

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1]

    // Check if it is a heading style (e.g. <w:pStyle w:val="Heading1"/>)
    const isHeading = /<w:pStyle[^>]*w:val="Heading(\d)"/i.test(pContent)
    const headingLevelMatch = /<w:pStyle[^>]*w:val="Heading(\d)"/i.exec(pContent)
    const headingLevel = headingLevelMatch ? headingLevelMatch[1] : null

    // Extract all text inside <w:t ...>...</w:t> or <w:t>...</w:t>
    const tRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
    let text = ''
    let tMatch: RegExpExecArray | null
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      text += tMatch[1]
    }

    const trimmed = text.trim()
    if (trimmed) {
      if (isHeading) {
        const prefix = '#'.repeat(Number(headingLevel) || 1)
        paragraphs.push(`${prefix} ${trimmed}`)
      } else {
        paragraphs.push(trimmed)
      }
    }
  }

  return paragraphs.join('\n\n')
}

/**
 * Extracts readable text from a PPTX while preserving slide boundaries and numbers.
 */
export async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)

  // Find all slide XML files (ppt/slides/slide1.xml, slide2.xml, etc.)
  const slideEntries = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10)
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10)
      return numA - numB
    })

  if (slideEntries.length === 0) {
    return ''
  }

  const output: string[] = []
  for (let i = 0; i < slideEntries.length; i++) {
    const entryName = slideEntries[i]
    const slideXml = await zip.file(entryName)?.async('text')
    if (!slideXml) continue

    const slideNum = entryName.match(/slide(\d+)\.xml/i)?.[1] || `${i + 1}`
    const slideText = parsePptxSlideXml(slideXml)

    if (slideText.trim()) {
      output.push(`[Slide ${slideNum}]\n${slideText.trim()}`)
    }
  }

  return output.join('\n\n')
}

function parsePptxSlideXml(xml: string): string {
  const lines: string[] = []
  // Paragraphs in PowerPoint are <a:p>
  const pRegex = /<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g
  let pMatch: RegExpExecArray | null

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1]
    // Text elements in PowerPoint are <a:t>
    const tRegex = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g
    let pText = ''
    let tMatch: RegExpExecArray | null
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1]
    }
    const trimmed = pText.trim()
    if (trimmed) {
      lines.push(trimmed)
    }
  }

  return lines.join('\n')
}

/**
 * Main dispatcher to extract text from an ArrayBuffer according to fileType.
 */
export async function extractDocumentText(
  buffer: ArrayBuffer,
  fileType: SupportedFileType
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return await extractPdfText(buffer)
    case 'docx':
      return await extractDocxText(buffer)
    case 'pptx':
      return await extractPptxText(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Cloudflare Queue processing handler for document processing jobs.
 */
export async function processDocumentQueue(batch: any, workerEnv: any): Promise<void> {
  for (const message of batch.messages) {
    const { documentId } = message.body as { documentId: string }
    if (!documentId) {
      message.ack()
      continue
    }

    try {
      // 1. Fetch document from D1
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
      })

      if (!doc) {
        console.warn(`Document ${documentId} not found in database.`)
        message.ack()
        continue
      }

      // 2. Mark as processing
      await db
        .update(documents)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(documents.id, documentId))

      // 3. Fetch file from R2
      const bucket = workerEnv.DOCUMENTS_BUCKET || (globalThis as any).DOCUMENTS_BUCKET
      if (!bucket) {
        throw new Error('DOCUMENTS_BUCKET binding is missing from worker environment.')
      }

      const r2Object = await bucket.get(doc.r2Key)
      if (!r2Object) {
        throw new Error(`R2 object not found at key: ${doc.r2Key}`)
      }

      const buffer = await r2Object.arrayBuffer()

      // 4. Validate magic bytes
      const validation = await validateFileMagicBytes(buffer, doc.fileType as SupportedFileType)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file format detected.')
      }

      // 5. Extract text
      const extractedText = await extractDocumentText(buffer, doc.fileType as SupportedFileType)

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No readable text could be extracted from the document.')
      }

      // 6. Update database with ready status and extracted text
      await db
        .update(documents)
        .set({
          status: 'ready',
          extractedText: extractedText.trim(),
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId))

      message.ack()
    } catch (err: any) {
      console.error(`Document processing failed for ${documentId}:`, err)
      try {
        await db
          .update(documents)
          .set({
            status: 'failed',
            errorMessage: err.message || 'Extraction failed.',
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId))
      } catch (dbErr) {
        console.error('Failed to update document error status in DB:', dbErr)
      }
      message.ack()
    }
  }
}
