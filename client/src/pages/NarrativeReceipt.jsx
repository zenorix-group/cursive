import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OvertureLoader from '../components/OvertureLoader.jsx'
import { useReveal } from '../lib/useReveal.js'
import { downloadPdf } from '../lib/receiptPdf.js'
import { receiptsPdf } from '../lib/receiptImage.js'
import { article1, article2 } from '../data/articles.js'
import { generateNarrative, getCachedNarrative, narrativeRequest } from '../data/narrativeStorage.js'
import narrativeExample from '../data/narrativeExample.json'
import './Receipt.css'
import './LiftReceipt.css'
import './NarrativeReceipt.css'

const LOADING = ['Reading both of your receipts.', 'Following one reason through both stories.', 'Writing what they say together.']

// the reader's own words arrive wrapped in *asterisks* and are set in italics
function Anchored({ text }) {
  return text.split(/\*([^*]+)\*/).map((part, index) => (index % 2 ? <em key={index}>{part}</em> : part))
}

// Two overlapping ovals: what she asked about, what she marked, and what she carried between them.
function Drawing({ drawing }) {
  const column = (names) => names.map((name) => <li key={name} className={name === drawing.lead ? 'is-lead' : undefined}>{name}</li>)
  return (
    <figure className="nr-draw" aria-label="The reasons you asked about, the reasons you marked, and the ones you carried between them">
      <div className="nr-draw__heads"><span>you asked</span><span>you marked</span></div>
      <div className="nr-draw__ovals">
        <i aria-hidden="true" /><i aria-hidden="true" />
        <ul>{column(drawing.leftBehind)}</ul>
        <ul>{drawing.carried.length ? column(drawing.carried) : <li className="is-none">nothing</li>}</ul>
        <ul>{column(drawing.pickedUp)}</ul>
      </div>
    </figure>
  )
}

function NarrativeReceipt({ example = false }) {
  const [request] = useState(() => (example ? null : narrativeRequest()))
  const [receipt, setReceipt] = useState(() => (example ? narrativeExample : getCachedNarrative(request)))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('')
  const saving = useRef(false)
  useReveal(!!receipt)

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    if (receipt || example) return undefined
    if (!request) { setError('This receipt is written once you have finished both articles, with a question in the first and a marked line in the second.'); return undefined }
    let current = true
    generateNarrative(request).then((result) => { if (current) { setReceipt(result); setError('') } }).catch((failure) => {
      if (current) setError(failure.name === 'TimeoutError' ? 'Writing took too long. Please retry.' : failure.message)
    })
    return () => { current = false }
  }, [receipt, request, example, attempt])

  const save = async () => {
    if (saving.current) return
    saving.current = true
    try {
      setStatus('Preparing your PDF…')
      downloadPdf(await receiptsPdf([example ? '/receipt/narrative/example' : '/receipt/narrative']), 'cursive-combined-receipt.pdf')
      setStatus('PDF saved to your downloads.')
    } catch { setStatus('Could not make the PDF. Please try again.') } finally { saving.current = false }
  }

  return (
    <main className="receipt-page narrative-receipt-page">
      <header className="receipt__bar"><Link to="/">cursive</Link></header>
      <article className="receipt narrative-receipt">
        <div className="receipt__rail">
          <header className="receipt__intro">
            {example && <p className="receipt__example-label">Example · the reader from the design reference</p>}
            <p className="receipt__eyebrow">Your Cursive receipt</p>
            <h1>What You Carried<br />Across.</h1>
          </header>
          <div className="receipt__metadata">
            <div><span>Both stories</span><span>{article1.minutes + article2.minutes} min read</span></div>
            <p>{article1.headline}</p>
            <p>{article2.headline}</p>
            <div className="receipt__interaction"><span>Read together</span><strong>{article1.mechanic} · {article2.mechanic}</strong></div>
          </div>
          {receipt && <>
            <footer className="receipt__footer narrative-receipt__footer"><button type="button" onClick={save}>Save as PDF</button></footer>
            {status && <p className="receipt__share-status" role="status">{status}</p>}
            <Link className="receipt__back" to="/reading-room">Back to the reading room</Link>
          </>}
        </div>
        {!receipt ? (
          <section className="receipt__loading" aria-live="polite">
            {error ? <><h2>Not written yet.</h2><p role="alert">{error}</p>{request && <button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button>}</> : <OvertureLoader messages={LOADING} />}
            <Link to="/reading-room">Return to the reading room</Link>
          </section>
        ) : (
          <div className="receipt__sections">
            <section className="receipt__section lift-receipt__prose">
              <p><Anchored text={receipt.reasoning} /></p>
            </section>
            <Drawing drawing={receipt.drawing} />
            <section className="receipt__section lift-receipt__prose">
              <p>The first story says, “{receipt.together.first}” The second says, “{receipt.together.second}” {receipt.together.answer}</p>
              <p>{receipt.confidence}</p>
              <p className="narrative-receipt__closing">{receipt.closingQuestion}</p>
            </section>
          </div>
        )}
      </article>
    </main>
  )
}

export default NarrativeReceipt
