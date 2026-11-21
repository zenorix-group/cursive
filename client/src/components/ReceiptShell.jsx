import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OvertureLoader from './OvertureLoader.jsx'
import { flushSaves } from '../data/cursiveStore.js'
import { receiptsPdf } from '../lib/receiptImage.js'
import { storeIntoOverture } from '../lib/overture.js'
import { copyText, downloadPdf, sharePdfFile, shareMessage } from '../lib/receiptPdf.js'
import '../pages/Receipt.css'
import BrandLink from './BrandLink.jsx'
import ReceiptEnding from './ReceiptEnding.jsx'

// The frame every article's receipt shares with the first two articles: the wordmark bar, the title and details in the left rail
// with the Share, Next article, Save as PDF and Back actions, and the sections on the right. A page gives it its own sections as children.
//
// props: article ({ number, minutes, headline, mechanic }), title (the h1, as lines), path (this receipt's route), readPath and backLabel,
// pdfName, loading (the loader's three lines), ready, error, onRetry, retryNote (what is saved), children (the sections)
function ReceiptShell({ article, title, path, readPath, backLabel, pdfName, loading, ready, error, onRetry, retryNote, children }) {
  const [shareStatus, setShareStatus] = useState('')
  const sharing = useRef(false)
  const pad = String(article.number).padStart(2, '0')

  // mode 'share' opens the share sheet; mode 'save' downloads the PDF. A second click while one runs is ignored.
  const makePdf = async (mode) => {
    if (sharing.current) return
    sharing.current = true
    try {
      const copied = await copyText(shareMessage(path)) // copied at the click, while the browser allows it
      setShareStatus('Preparing your PDF…')
      await flushSaves() // the capture loads the page afresh, so everything must be saved first
      const pdf = await receiptsPdf([path])
      const how = mode === 'save' ? (downloadPdf(pdf, pdfName), 'downloaded') : await sharePdfFile(pdf, pdfName)
      const note = copied ? ' The message with your link is copied: paste it with the PDF.' : ''
      setShareStatus(how === 'shared' ? `Ready to send.${note}` : `PDF saved to your downloads.${note}`)
    } catch (failure) {
      if (failure.name !== 'AbortError') setShareStatus('Could not share. Please try again.')
      else setShareStatus('')
    } finally {
      sharing.current = false
    }
  }

  return (
    <main className="receipt-page">
      <header className="receipt__bar"><BrandLink /></header>
      <article className="receipt">
        <div className="receipt__rail">
          <header className="receipt__intro"><p className="receipt__eyebrow">Your Cursive receipt</p><h1>{title.map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1></header>
          <div className="receipt__metadata">
            <div><span>Article {pad}</span><span>{article.minutes} min read</span></div>
            <p>{article.headline}</p>
            <div className="receipt__interaction"><span>Interaction</span><strong>{article.mechanic}</strong></div>
          </div>
          {ready && (
            <>
              <div className="receipt__links">
                <button type="button" className="receipt__back" onClick={() => makePdf('share')}>Share receipt</button>
                <button type="button" className="receipt__back" onClick={() => makePdf('save')}>Save as PDF</button>
                <Link className="receipt__back" to={readPath}>{backLabel}</Link>
              </div>
              {shareStatus && <p className="receipt__share-status" role="status">{shareStatus}</p>}
              <ReceiptEnding articleId={article.number} store={() => storeIntoOverture(document.querySelector('.receipt'), article.number)} />
            </>
          )}
        </div>
        {!ready ? (
          <section className="receipt__loading" aria-live="polite">
            {error
              ? <><h2>Receipt generation failed.</h2><p role="alert">{error}</p><p>{retryNote}</p><button type="button" onClick={onRetry}>Try again</button></>
              : <OvertureLoader messages={loading} />}
            <Link to={readPath}>{backLabel}</Link>
          </section>
        ) : <div className="receipt__sections">{children}</div>}
      </article>
    </main>
  )
}

export default ReceiptShell
