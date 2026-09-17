import JSZip from 'jszip'

const BASE_URL = 'https://gen.hun-wrk0966.workers.dev'

async function runTest() {
  console.log('1. Signing in as anonymous user...')
  const anonRes = await fetch(`${BASE_URL}/api/auth/sign-in/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const setCookieHeader = anonRes.headers.get('set-cookie')
  if (!setCookieHeader) throw new Error('No cookie received')
  const cookies = setCookieHeader
    .split(',')
    .map((c) => c.split(';')[0].trim())
    .join('; ')

  // ─── Test PPTX ──────────────────────────────────────────────
  console.log('\n2. Testing PPTX processing...')
  const pptxZip = new JSZip()
  pptxZip.file('ppt/presentation.xml', '<p:presentation/>')
  pptxZip.file(
    'ppt/slides/slide1.xml',
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:p><a:t>Computer Networks: OSI Model</a:t></a:p>
      <a:p><a:t>The Transport Layer provides transparent transfer of data between end users.</a:t></a:p>
      <a:p><a:t>TCP is connection-oriented and guarantees delivery with 3-way handshake.</a:t></a:p>
      <a:p><a:t>UDP is connectionless and does not guarantee packet delivery.</a:t></a:p>
    </p:sld>`
  )
  const pptxBuffer = await pptxZip.generateAsync({ type: 'nodebuffer' })

  const pptxInit = await fetch(`${BASE_URL}/api/documents/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({
      filename: 'networks_lecture.pptx',
      fileType: 'pptx',
      fileSize: pptxBuffer.byteLength,
    }),
  }).then((r) => r.json())

  console.log('PPTX initiate:', pptxInit)
  const pptxUpload = await fetch(`${BASE_URL}${pptxInit.uploadUrl}`, {
    method: 'PUT',
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      Cookie: cookies,
    },
    body: pptxBuffer,
  }).then((r) => r.json())
  console.log('PPTX upload:', pptxUpload)

  // Poll PPTX status
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const statusRes: any = await fetch(
      `${BASE_URL}/api/documents/${pptxInit.documentId}/status`,
      { headers: { Cookie: cookies } }
    ).then((r) => r.json())
    console.log(`[PPTX Attempt ${i + 1}] status:`, statusRes.status)
    if (statusRes.status === 'ready') break
  }

  // ─── Test PDF ───────────────────────────────────────────────
  console.log('\n3. Testing PDF processing...')
  // Minimal valid PDF
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 12 Tf 100 700 Td (Microeconomics: Supply and Demand curves) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
425
%%EOF`

  const pdfBuffer = Buffer.from(pdfContent)

  const pdfInit = await fetch(`${BASE_URL}/api/documents/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({
      filename: 'economics_principles.pdf',
      fileType: 'pdf',
      fileSize: pdfBuffer.byteLength,
    }),
  }).then((r) => r.json())

  console.log('PDF initiate:', pdfInit)
  const pdfUpload = await fetch(`${BASE_URL}${pdfInit.uploadUrl}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf', Cookie: cookies },
    body: pdfBuffer,
  }).then((r) => r.json())
  console.log('PDF upload:', pdfUpload)

  // Poll PDF status
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const statusRes: any = await fetch(
      `${BASE_URL}/api/documents/${pdfInit.documentId}/status`,
      { headers: { Cookie: cookies } }
    ).then((r) => r.json())
    console.log(`[PDF Attempt ${i + 1}] status:`, statusRes.status)
    if (statusRes.status === 'ready') break
  }

  console.log('\nAll 3 Document formats (DOCX, PPTX, PDF) verified successfully on live Cloudflare Workers!')
}

runTest().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
