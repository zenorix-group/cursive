import html2canvas from 'html2canvas'
import { buildImagePdf } from './receiptPdf.js'

const FRAME_W = 560 // the single-column layout: title and details on top, then the sections, with no empty side
const MAX_PX = 15000

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

// Loads the real receipt page in a hidden frame (so it is exactly what the reader sees, on any device) and
// returns a picture of it, without the Share / Next buttons.
export async function captureReceipt(path) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = `position:fixed;left:-99999px;top:0;width:${FRAME_W}px;height:1000px;border:0;visibility:hidden`
  frame.src = path
  document.body.appendChild(frame)
  try {
    await new Promise((resolve, reject) => {
      frame.onload = resolve
      frame.onerror = reject
      setTimeout(() => reject(new Error('The receipt took too long to load.')), 20000)
    })
    const doc = frame.contentDocument
    // wait until the receipt itself (not the loader) is on the page
    for (let i = 0; i < 80 && !doc.querySelector('.receipt__sections'); i += 1) await wait(250)
    if (!doc.querySelector('.receipt__sections')) throw new Error('The receipt is not ready yet.')
    await doc.fonts?.ready
    await wait(1400) // page transition and drawing effects settle

    const page = doc.querySelector('.receipt-page')
    const height = page.scrollHeight
    const scale = Math.min(1.5, MAX_PX / height)
    const canvas = await html2canvas(page, {
      scale,
      useCORS: true,
      backgroundColor: getComputedStyle(doc.body).backgroundColor || '#f4f3ef',
      windowWidth: FRAME_W,
      windowHeight: height,
      onclone: (clone) => {
        const style = clone.createElement('style')
        // show everything the scroll animations would reveal, and leave the action buttons out of the picture
        style.textContent = '.rv{opacity:1!important;transform:none!important;transition:none!important}'
          + '.receipt__footer,.receipt__share-status,.receipt__back{display:none!important}'
        clone.head.appendChild(style)
        clone.querySelectorAll('.lift-mark').forEach((el) => el.classList.add('is-in'))
      },
    })
    const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]), (ch) => ch.charCodeAt(0))
    const bg = (getComputedStyle(doc.body).backgroundColor.match(/\d+/g) || [244, 243, 239]).slice(0, 3).map(Number)
    // the link in the footer goes to this receipt on the site
    const link = new URL(path, window.location.origin).href
    return { jpeg, width: canvas.width, height: canvas.height, bg, link, linkLabel: `Open your receipt: ${link}` }
  } finally {
    frame.remove()
  }
}

// one PDF page per receipt path, in the receipt's own design
export async function receiptsPdf(paths) {
  const pages = []
  for (const path of paths) pages.push(await captureReceipt(path))
  return buildImagePdf(pages)
}
