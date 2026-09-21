import { describe, it, expect } from 'vitest'
import {
  validateFileMagicBytes,
  extractDocxText,
  extractPptxText,
  unescapeXml,
  MAX_FILE_SIZE_BYTES,
} from '#/lib/document-processor'
import JSZip from 'jszip'

describe('Document Processor & Validation', () => {
  it('enforces maximum 50 MB file size limit', async () => {
    const oversizedBuffer = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1)
    const result = await validateFileMagicBytes(oversizedBuffer, 'pdf')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('50 MB')
  })

  it('rejects invalid PDF files with incorrect headers', async () => {
    const badBuffer = new TextEncoder().encode('Not a real PDF file').buffer
    const result = await validateFileMagicBytes(badBuffer, 'pdf')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid PDF format')
  })

  it('accepts valid PDF magic bytes (%PDF-)', async () => {
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    const result = await validateFileMagicBytes(pdfHeader.buffer, 'pdf')
    expect(result.valid).toBe(true)
  })

  it('rejects fake docx files that are not zip archives', async () => {
    const fakeBuffer = new TextEncoder().encode('Plain text pretending to be docx').buffer
    const result = await validateFileMagicBytes(fakeBuffer, 'docx')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid DOCX format')
  })

  it('extracts structured text and headings from DOCX xml', async () => {
    const zip = new JSZip()
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Introduction to Algorithms</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Algorithms are step-by-step procedures for solving problems.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`
    zip.file('word/document.xml', sampleXml)
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })

    const validCheck = await validateFileMagicBytes(buffer, 'docx')
    expect(validCheck.valid).toBe(true)

    const extracted = await extractDocxText(buffer)
    expect(extracted).toContain('# Introduction to Algorithms')
    expect(extracted).toContain('Algorithms are step-by-step procedures')
  })

  it('extracts slide content preserving slide numbers from PPTX', async () => {
    const zip = new JSZip()
    zip.file('ppt/presentation.xml', '<p:presentation/>')
    
    const slide1Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:p><a:t>Data Structures - Slide 1</a:t></a:p>
      <a:p><a:t>Binary Trees and Heaps</a:t></a:p>
    </p:sld>`
    const slide2Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:p><a:t>AVL Tree Rotations</a:t></a:p>
    </p:sld>`

    zip.file('ppt/slides/slide1.xml', slide1Xml)
    zip.file('ppt/slides/slide2.xml', slide2Xml)
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })

    const validCheck = await validateFileMagicBytes(buffer, 'pptx')
    expect(validCheck.valid).toBe(true)

    const extracted = await extractPptxText(buffer)
    expect(extracted).toContain('[Slide 1]')
    expect(extracted).toContain('Binary Trees and Heaps')
    expect(extracted).toContain('[Slide 2]')
    expect(extracted).toContain('AVL Tree Rotations')
  })

  it('correctly unescapes XML entities and decimal/hex character codes', () => {
    const raw = 'C &amp; C++ &lt;Templates&gt; &quot;Guide&quot; &apos;Tips&#39; &#65; &#x42;'
    const decoded = unescapeXml(raw)
    expect(decoded).toBe("C & C++ <Templates> \"Guide\" 'Tips' A B")
  })

  it('prevents double-unescaping vulnerabilities', () => {
    const raw = '&amp;lt;div&amp;gt;'
    const decoded = unescapeXml(raw)
    expect(decoded).toBe('&lt;div&gt;')
  })

  it('handles supplementary unicode code points above 0xFFFF', () => {
    const raw = 'Smile &#x1F600; Rocket &#128640;'
    const decoded = unescapeXml(raw)
    expect(decoded).toBe('Smile 😀 Rocket 🚀')
  })

  it('decodes XML entities inside DOCX paragraphs', async () => {
    const zip = new JSZip()
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Comparing Python &amp; Rust &lt;Speed &gt; Safety&gt;</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`
    zip.file('word/document.xml', sampleXml)
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    const extracted = await extractDocxText(buffer)
    expect(extracted).toBe('Comparing Python & Rust <Speed > Safety>')
  })

  it('preserves line breaks and tabs within DOCX paragraphs', async () => {
    const zip = new JSZip()
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Term</w:t>
        <w:tab/>
        <w:t>Definition</w:t>
        <w:br/>
        <w:t>Next line explanation</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`
    zip.file('word/document.xml', sampleXml)
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    const extracted = await extractDocxText(buffer)
    expect(extracted).toContain('Term\tDefinition\nNext line explanation')
  })

  it('preserves line breaks within PPTX slides', async () => {
    const zip = new JSZip()
    zip.file('ppt/presentation.xml', '<p:presentation/>')
    const slideXml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:p>
        <a:r><a:t>Bullet 1 Line 1</a:t></a:r>
        <a:br/>
        <a:r><a:t>Bullet 1 Line 2</a:t></a:r>
      </a:p>
    </p:sld>`
    zip.file('ppt/slides/slide1.xml', slideXml)
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    const extracted = await extractPptxText(buffer)
    expect(extracted).toContain('Bullet 1 Line 1\nBullet 1 Line 2')
  })
})
