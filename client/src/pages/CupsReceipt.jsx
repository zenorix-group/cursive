import { useEffect, useMemo, useState } from 'react'
import ReceiptShell from '../components/ReceiptShell.jsx'
import { article6 } from '../data/articles.js'
import { cupsReceiptEvents, generateCupsReceipt, getCachedCupsReceipt } from '../data/cupsReceiptStorage.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import { useReveal } from '../lib/useReveal.js'
import './CupsReceipt.css'

const LOADING = ['Reading where each cup went.', 'Setting them beside the story.', 'Writing your receipt.']

function MiniCup({ filled, faint }) {
  return (
    <svg className={`cups-draw__cup${filled ? ' is-filled' : ''}${faint ? ' is-faint' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 8h13v4.5A5.5 5.5 0 0112 18h-2a5.5 5.5 0 01-5.5-5.5z" /><path d="M17.5 9.5h1.2a2.3 2.3 0 010 4.6h-1.2" /><path d="M3.5 20h15" />
    </svg>
  )
}

// the seven seats in story order: a small empty cup, the seat's name, and her cups there, filled; a seat she took a cup back from keeps
// a faint outline. The tree sits on a pale band, with where the promise comes true beside it. No ticks, crosses, numbers, arrows, red or green.
function Drawing({ drawing }) {
  return (
    <figure className="cups-draw">
      {drawing.showKept && <p className="cups-draw__kept"><span>kept</span>{Array.from({ length: drawing.kept }, (_, i) => <MiniCup key={i} filled />)}</p>}
      <ol>
        {drawing.lines.map((line) => (
          <li key={line.id} className={line.band ? 'is-band' : undefined}>
            <MiniCup />
            <span className="cups-draw__name">{line.name}</span>
            <span className="cups-draw__mine" aria-hidden="true">
              {Array.from({ length: line.cups }, (_, i) => <MiniCup key={`m${i}`} filled />)}
              {Array.from({ length: line.faint }, (_, i) => <MiniCup key={`f${i}`} faint />)}
            </span>
            {line.band && <span className="cups-draw__where">where the promise comes true</span>}
          </li>
        ))}
      </ol>
      <figcaption>{drawing.sentence}</figcaption>
    </figure>
  )
}

function CupsReceipt() {
  const events = useMemo(() => cupsReceiptEvents(), [])
  const [receipt, setReceipt] = useState(() => getCachedCupsReceipt(events))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useReveal(!!receipt)

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { if (receipt) markOnboardingDone() }, [receipt])
  useEffect(() => {
    if (receipt) return undefined
    let current = true
    generateCupsReceipt(events).then((result) => { if (current) { setReceipt(result); setError('') } })
      .catch((failure) => { if (current) setError(failure.name === 'TimeoutError' ? 'Writing took too long. Your cups are saved. Please retry.' : failure.message) })
    return () => { current = false }
  }, [events, receipt, attempt])

  return (
    <ReceiptShell
      article={article6}
      title={['The Cups', 'You Set.']}
      path="/receipt/6"
      readPath="/read/6"
      backLabel="Back to the article"
      pdfName="cursive-the-retired-gentleman-receipt.pdf"
      loading={LOADING}
      ready={!!receipt}
      error={error}
      onRetry={() => { setError(''); setAttempt((n) => n + 1) }}
      retryNote="Your cups are saved on this device."
    >
      {receipt && (
        <>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>01 / Your reading</span><span>[From your cups]</span></h2>
            {receipt.reading.map((p, i) => <p className="cups-receipt__prose" key={i}>{p}</p>)}
          </section>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>02 / Your cups</span><span>[The drawing]</span></h2><Drawing drawing={receipt.drawing} /></section>
          {receipt.seats.length > 0 && (
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>03 / The seats you chose</span><span>[In story order]</span></h2>
              {receipt.seats.map((s, i) => <div className="receipt__card" key={i}><p>{s}</p></div>)}
            </section>
          )}
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>{receipt.seats.length ? '04' : '03'} / The Peepal tree</span><span>[Where it comes true]</span></h2>
            <p className="cups-receipt__prose">{receipt.tree}</p>
          </section>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>{receipt.seats.length ? '05' : '04'} / {receipt.questions.length === 1 ? 'One question' : 'Two questions'}</span><span>[Nothing to answer]</span></h2>
            <ul className="cups-receipt__questions">{receipt.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
        </>
      )}
    </ReceiptShell>
  )
}

export default CupsReceipt
