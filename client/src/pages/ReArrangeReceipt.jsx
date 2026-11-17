import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import OvertureLoader from '../components/OvertureLoader.jsx'
import { article5 } from '../data/articles.js'
import { generateRearrangeReceipt, getCachedRearrangeReceipt, receiptEvents } from '../data/rearrangeReceiptStorage.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import { useReveal } from '../lib/useReveal.js'
import './Receipt.css'
import './ReArrangeReceipt.css'

const LOADING = ['Reading how you moved the titles.', 'Setting them beside the story.', 'Writing your receipt.']

// the six moments in story order: a dot for the plain titles, ¶ for the middle three; where a middle title is not the one that
// belongs, the one that belongs sits beside it. No ticks, crosses, numbers, arrows, red or green.
function Drawing({ drawing }) {
  return (
    <figure className="rearr-drawing">
      <div className="rearr-drawing__head" aria-hidden="true"><span>your titles</span><span>where they belong</span></div>
      <ol>
        {drawing.lines.map((line) => (
          <li key={line.id} className={line.faint ? 'is-faint' : undefined}>
            <span className="rearr-drawing__mark" aria-hidden="true">{line.marker === 'para' ? '¶' : '•'}</span>
            <span className="rearr-drawing__title">{line.title}</span>
            {line.belongs && <span className="rearr-drawing__belongs">¶ {line.belongs}</span>}
          </li>
        ))}
      </ol>
      <figcaption>{drawing.sentence}</figcaption>
    </figure>
  )
}

function ReArrangeReceipt() {
  const { user } = useAuth()
  const events = useMemo(() => receiptEvents(), [])
  const [receipt, setReceipt] = useState(() => getCachedRearrangeReceipt(events))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useReveal(!!receipt)

  useEffect(() => { window.scrollTo(0, 0) }, [])
  // seeing a real receipt completes the article
  useEffect(() => { if (receipt) markOnboardingDone() }, [receipt])
  useEffect(() => {
    if (receipt) return undefined
    let current = true
    generateRearrangeReceipt(events).then((result) => { if (current) { setReceipt(result); setError('') } })
      .catch((failure) => { if (current) setError(failure.name === 'TimeoutError' ? 'Writing took too long. Your moves are saved. Please retry.' : failure.message) })
    return () => { current = false }
  }, [events, receipt, attempt])

  return (
    <main className="receipt-page rearr-receipt-page">
      <header className="receipt__bar"><Link to="/">cursive</Link></header>
      <article className="receipt rearr-receipt">
        <header className="receipt__intro"><p className="receipt__eyebrow">Your Cursive receipt</p><h1>The Titles<br />You Placed.</h1></header>
        <div className="receipt__metadata"><div><span>Article 05</span><span>{article5.minutes} min read</span></div><p>{article5.headline}</p><div className="receipt__interaction"><span>Interaction</span><strong>{article5.mechanic}</strong></div></div>
        {!receipt ? (
          <section className="receipt__loading" aria-live="polite">
            {error
              ? <><h2>Receipt generation failed.</h2><p role="alert">{error}</p><p>Your moves are saved on this device.</p><button type="button" onClick={() => { setError(''); setAttempt((n) => n + 1) }}>Try again</button></>
              : <OvertureLoader messages={LOADING} />}
            <Link to="/read/5">Return to the article</Link>
          </section>
        ) : (
          <div className="receipt__sections">
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>01 / Your reading</span><span>[From your moves]</span></h2>
              <p className="rearr-receipt__prose">{receipt.reading.join(' ')}</p>
            </section>
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>02 / Your titles</span><span>[The drawing]</span></h2><Drawing drawing={receipt.drawing} /></section>
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>03 / The three moments</span><span>[In story order]</span></h2>
              {receipt.moments.map((m) => <div className="receipt__card" key={m.id}><p>{m.text}</p></div>)}
            </section>
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>04 / How the story ends</span><span>[Behind the novel]</span></h2>
              <p className="rearr-receipt__prose">{receipt.ending.join(' ')}</p>
            </section>
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>05 / Two questions</span><span>[Nothing to answer]</span></h2>
              <ul className="rearr-receipt__questions">{receipt.questions.map((q) => <li key={q}>{q}</li>)}</ul>
            </section>
            <footer className="receipt__footer"><Link to="/read/5">Back to the article</Link><Link to={user ? '/reading-room' : '/login#create'}>Next article <span aria-hidden="true">→</span></Link></footer>
          </div>
        )}
      </article>
    </main>
  )
}

export default ReArrangeReceipt
