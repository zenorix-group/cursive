// Turns captured receipt pictures into a PDF (one tall page per receipt, no library needed for the PDF itself).
const PAGE_W = 595 // points, A4 width

const enc = new TextEncoder()
const text = (s) => enc.encode(s)

const FOOTER = 64 // points of footer below each receipt picture
const esc = (t) => t.replace(/[\\()]/g, (c) => `\\${c}`)

// pages: [{ jpeg: Uint8Array, width, height, bg: [r, g, b], link, linkLabel }] (pixels)
export function buildImagePdf(pages) {
  const chunks = []
  let length = 0
  const offsets = []
  const push = (part) => { const bytes = typeof part === 'string' ? text(part) : part; chunks.push(bytes); length += bytes.length }
  const object = (n, head, stream) => {
    offsets[n] = length
    push(`${n} 0 obj\n${head}`)
    if (stream) { push('\nstream\n'); push(stream); push('\nendstream') }
    push('\nendobj\n')
  }

  const per = 4
  const fontN = 3 + pages.length * per
  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * per} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  pages.forEach((page, i) => {
    const n = 3 + i * per
    const imgH = (PAGE_W * page.height) / page.width
    const h = imgH + FOOTER
    const [r, g, b] = (page.bg || [244, 243, 239]).map((v) => (v / 255).toFixed(3))
    const label = 'This is generated from Cursive'
    const draw = [
      `q ${PAGE_W} 0 0 ${imgH.toFixed(2)} 0 ${FOOTER} cm /Im0 Do Q`,
      `${r} ${g} ${b} rg 0 0 ${PAGE_W} ${FOOTER} re f`,
      '0.15 0.14 0.12 RG 0.5 w 40 ' + (FOOTER - 8) + ' m ' + (PAGE_W - 40) + ' ' + (FOOTER - 8) + ' l S',
      `0.15 0.14 0.12 rg BT /F2 10 Tf 40 ${FOOTER - 28} Td (${esc(label)}) Tj ET`,
      `0.64 0.24 0.20 rg BT /F1 9 Tf 40 ${FOOTER - 44} Td (${esc(page.linkLabel || page.link || '')}) Tj ET`,
    ].join('\n')
    const linkW = Math.min(PAGE_W - 80, (page.linkLabel || page.link || '').length * 4.9)
    const annot = page.link
      ? `<< /Type /Annot /Subtype /Link /Rect [40 ${FOOTER - 48} ${(40 + linkW).toFixed(1)} ${FOOTER - 36}] /Border [0 0 0] /A << /S /URI /URI (${esc(page.link)}) >> >>`
      : '<< >>'
    object(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${h.toFixed(2)}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> /Font << /F1 ${fontN} 0 R /F2 ${fontN + 1} 0 R >> >> /Contents ${n + 2} 0 R${page.link ? ` /Annots [${n + 3} 0 R]` : ''} >>`)
    object(n + 1, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`, page.jpeg)
    object(n + 2, `<< /Length ${draw.length} >>`, draw)
    object(n + 3, annot)
  })
  object(fontN, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  object(fontN + 1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const total = fontN + 1
  const xref = length
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`)
  for (let n = 1; n <= total; n += 1) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return new Blob([out], { type: 'application/pdf' })
}

// the text that travels with a shared receipt (WhatsApp shows it as the caption)
export const shareMessage = (path) => `This is from Cursive. Open your receipt here: ${new URL(path, window.location.origin).href}`

// Copies text right at the click, while the browser still allows it (building the PDF takes a few seconds).
export async function copyText(value) {
  try { await navigator.clipboard.writeText(value); return true } catch { return false }
}

// Opens the system share sheet with just the PDF (no title or text: extra fields make some apps send extra items).
// Falls back to a download where files cannot be shared. Resolves 'shared' or 'downloaded'.
export async function sharePdfFile(blob, filename) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] })
    return 'shared'
  }
  downloadPdf(blob, filename)
  return 'downloaded'
}

// A plain download, saved once. The system share sheet is deliberately not used: it is what handed
// WhatsApp the same file twice. The message travels separately (copied to the clipboard by the caller).
export function downloadPdf(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
