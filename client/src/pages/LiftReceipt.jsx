import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { article2 } from '../data/articles.js'
import { loadCallProgress } from '../data/callProgress.js'
import { liftLineDetails } from '../data/liftReferences.js'
import { generateLiftReceipt, getCachedLiftReceipt } from '../data/liftReceiptStorage.js'
import './Receipt.css'
import './LiftReceipt.css'

function ReadingMark({ receipt }) {
  const selected = [...receipt.progress.selectedIds].sort((a, b) => a - b)
  const sourceY = (id) => 30 + selected.indexOf(id) * 32
  const targetY = (id) => 35 + (id - 1) * 52
  return <figure className="lift-mark">
    <svg viewBox="0 0 500 200" role="img" aria-labelledby="lift-mark-title lift-mark-description">
      <title id="lift-mark-title">Your selected transcript lines connected to the article’s arguments</title>
      <desc id="lift-mark-description">{receipt.placements.map((placement) => `${placement.letter}: ${placement.placedLineId ? `line ${placement.placedLineId}` : 'no line placed'}`).join('. ')}</desc>
      {receipt.placements.filter((placement) => placement.placedLineId !== null).map((placement) => <line key={placement.id} x1="202" y1={sourceY(placement.placedLineId)} x2="340" y2={targetY(placement.id)} stroke="#bd8b21" strokeWidth="1.5" />)}
      {selected.map((id) => <g key={id}><text x="0" y={sourceY(id) + 4}>L{id} · {liftLineDetails[id].summary}</text><circle cx="202" cy={sourceY(id)} r="2.5" fill="#38382d" /></g>)}
      {receipt.placements.map((placement) => <g key={placement.id}><circle cx="340" cy={targetY(placement.id)} r="3" fill={placement.placedLineId ? '#38382d' : 'none'} stroke="#38382d" /><text x="352" y={targetY(placement.id) - 3}>{placement.letter} · {placement.title.split(' ').slice(0, 3).join(' ')}</text><text x="352" y={targetY(placement.id) + 12}>{placement.title.split(' ').slice(3).join(' ')}</text></g>)}
      {!selected.length && <text x="0" y="45">No lines selected.</text>}
      <text className="lift-mark__axis" x="0" y="190">Marked, in scene order</text><text className="lift-mark__axis" x="340" y="190">The argument, in order</text>
    </svg>
    <figcaption>Lines show where you placed the transcript. Unconnected lines stayed in your hand.</figcaption>
  </figure>
}

function LiftReceipt() {
  const [progress] = useState(loadCallProgress)
  const [receipt, setReceipt] = useState(() => getCachedLiftReceipt(progress))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [shareStatus, setShareStatus] = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    if (receipt) return
    let current = true
    generateLiftReceipt(progress).then((result) => { if (current) { setReceipt(result); setError('') } }).catch((failure) => {
      if (current) setError(failure.name === 'TimeoutError' ? 'Generation took too long. Your choices are saved. Please retry.' : failure.message)
    })
    return () => { current = false }
  }, [progress, receipt, attempt])

  const share = async () => {
    const text = ['Your Cursive receipt — The Lines You Carried.', article2.headline, ...receipt.prose,
      ...receipt.placements.map((placement) => `${placement.letter} · ${placement.title}\n${placement.placedText || 'Nothing placed.'}\n${placement.explanation}`),
      'WHAT STAYED IN YOUR HAND', receipt.keptObservation, ...receipt.kept.map((line) => line.text), 'ON THE CALL', receipt.confidence].join('\n\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Your Cursive receipt', text })
      else {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
        const link = document.createElement('a'); link.href = url; link.download = 'cursive-the-call-receipt.txt'; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      setShareStatus('Receipt ready to share.')
    } catch (failure) { if (failure.name !== 'AbortError') setShareStatus('Could not share. Please try again.') }
  }

  return <main className="receipt-page lift-receipt-page">
    <header className="receipt__bar"><Link to="/">cursive</Link></header>
    <article className="receipt lift-receipt">
      <header className="receipt__intro"><p className="receipt__eyebrow">Your Cursive receipt</p><h1>The Lines You<br />Carried.</h1></header>
      <div className="receipt__metadata"><div><span>Article 02</span><span>{article2.minutes} min read</span></div><p>{article2.headline}</p><div className="receipt__interaction"><span>Interaction</span><strong>{article2.mechanic}</strong></div></div>
      {!receipt ? <section className="receipt__loading" aria-live="polite">
        {error ? <><h2>Receipt generation failed.</h2><p role="alert">{error}</p><p>Your selections and filled dots are saved on this device.</p><button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></> : <><h2><span className="receipt__spinner" aria-hidden="true" />Generating your receipt…</h2><p>Reading your saved selections and placements. This can take up to a minute.</p></>}
        <Link to="/read/2">Return to the article</Link>
      </section> : <>
        <section className="receipt__section lift-receipt__prose"><h2 className="receipt__section-heading"><span>01 / Your reading</span><span>[The receipt]</span></h2>{receipt.prose.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>
        <section className="receipt__section"><h2 className="receipt__section-heading"><span>02 / Where the lines landed</span><span>[The argument]</span></h2>
          {receipt.placements.map((placement) => <div className="receipt__card" key={placement.id}>
            <div className="receipt__card-heading"><span>{placement.letter} · {placement.title}</span><span>{placement.placedText ? `L${placement.placedLineId} · Placed` : 'Unfilled'}</span></div>
            <blockquote>{placement.placedText ? `“${placement.placedText}”` : 'Nothing placed.'}</blockquote><p>{placement.explanation}</p>
            {placement.effect !== 'proves' && <div className="lift-receipt__reference"><p className="receipt__small-label">The line this paragraph was reaching for</p><blockquote>“{placement.targetText}”</blockquote><p>{placement.reason}</p></div>}
          </div>)}
        </section>
        <section className="receipt__section"><h2 className="receipt__section-heading"><span>03 / What stayed in your hand</span><span>[Selected, unused]</span></h2><p className="lift-receipt__observation">{receipt.keptObservation}</p>
          {!!receipt.kept.length && <ul className="lift-receipt__kept">{receipt.kept.map((line) => <li key={line.id}><span>L{line.id}</span><q>{line.text}</q></li>)}</ul>}
          <aside className="receipt__note lift-receipt__confidence"><span>On the call</span><p>{receipt.confidence}</p></aside>
        </section>
        <section className="receipt__section"><h2 className="receipt__section-heading"><span>04 / The mark</span><span>[Scene → argument]</span></h2><ReadingMark receipt={receipt} /></section>
        <footer className="receipt__footer"><button type="button" onClick={share}>Share receipt</button><Link to="/enter">Next article <span aria-hidden="true">→</span></Link></footer>
        {shareStatus && <p className="receipt__share-status" role="status">{shareStatus}</p>}
        <Link className="receipt__back" to="/read/2">Back to your placements</Link>
      </>}
    </article>
  </main>
}

export default LiftReceipt
