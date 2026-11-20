import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReceiptShell from '../components/ReceiptShell.jsx'
import { article4 } from '../data/articles.js'
import { generateHighlightsReceipt, getCachedHighlightsReceipt, highlightsReceiptEvents } from '../data/highlightsReceiptStorage.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import { useReveal } from '../lib/useReveal.js'
import './HighlightsReceipt.css'

const LOADING = ['Reading your marks.', 'Setting them beside the article.', 'Writing your receipt.']
const HEADINGS = { pattern: ['Your marks', 'How you read'], pulls: ['Why they pull', 'Marks beyond the four'], four: ['The sentences that carry both', 'Writing and the earth'], pair: ['Your two words', 'Where they came from'], line: ['Your line', 'What it does'] }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// her line with her two kept words picked out, in any inflected form
function LineText({ text, kept }) {
  if (!kept.length) return text
  const stems = kept.map((w) => esc(w.toLowerCase().replace(/(?<=.{3})s$/, '')))
  const parts = text.split(new RegExp(`(\\b(?:${stems.join('|')})(?:s|es|ed|d|ing|’s|'s)?\\b)`, 'iu'))
  return parts.map((part, i) => {
    const hit = i % 2 === 1 && kept.find((w) => new RegExp(`^${esc(w.toLowerCase().replace(/(?<=.{3})s$/, ''))}(s|es|ed|d|ing|’s|'s)?$`, 'iu').test(part))
    return hit ? <mark key={i} data-word={hit}>{part}</mark> : part
  })
}

// the thirteen sentences in page order, each by a few words of its point. The four are outlined, her marks are filled and a mark she let
// go is faint; her other marks are tagged with what they are. The offered words sit beside the sentences they came from (hers filled, a
// released one struck, the rest open) and threads run from her two words into her line. It shows no times, and no sentence numbers.
function Drawing({ drawing }) {
  const wrap = useRef(null)
  const [paths, setPaths] = useState([])
  const kept = drawing.kept

  const thread = () => {
    const box = wrap.current?.getBoundingClientRect()
    if (!box || !drawing.line) { setPaths([]); return }
    const next = []
    for (const word of kept) {
      const chip = wrap.current.querySelector(`[data-chip="${CSS.escape(word)}"]`)
      const target = wrap.current.querySelector(`mark[data-word="${CSS.escape(word)}"]`)
      if (!chip || !target) continue
      const a = chip.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      const x1 = a.left + a.width / 2 - box.left
      const y1 = a.bottom - box.top
      const x2 = b.left + b.width / 2 - box.left
      const y2 = b.top - box.top
      next.push(`M${x1},${y1} C${x1},${y1 + (y2 - y1) * 0.6} ${x2},${y2 - (y2 - y1) * 0.5} ${x2},${y2}`)
    }
    setPaths(next)
  }
  useLayoutEffect(() => { thread() }, [drawing])
  useEffect(() => {
    window.addEventListener('resize', thread)
    document.fonts?.ready.then(thread)
    return () => window.removeEventListener('resize', thread)
  }, [drawing])

  return (
    <figure className="hh-draw" ref={wrap}>
      <ul className="hh-draw__rows">
        {drawing.rows.map((row) => (
          <li key={row.id} className={`hh-draw__row is-${row.state}${row.four ? ' is-four' : ''}${row.arguable ? ' is-arguable' : ''}`}>
            <span className="hh-draw__label">{row.label}{row.tag && <em> {row.tag}</em>}</span>
            <span className="hh-draw__bar" aria-hidden="true" />
            <span className="hh-draw__words">
              {drawing.words.filter((w) => w.sentenceId === row.id).map((w) => (
                <span key={w.word} data-chip={w.word} className={`hh-draw__chip is-${w.state}`}>{w.word}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {drawing.line && <p className="hh-draw__line">“<LineText text={drawing.line} kept={kept} />”</p>}
      <svg className="hh-draw__threads" aria-hidden="true">{paths.map((d) => <path key={d} d={d} />)}</svg>
      <figcaption>Outline: the sentences that carry writing and the earth. Dashed: arguable. Filled: yours. Faint: marked, then let go. Struck: kept, then given back. Open chip: passed over.</figcaption>
    </figure>
  )
}

function HighlightsReceipt() {
  const events = useMemo(() => highlightsReceiptEvents(), [])
  const [receipt, setReceipt] = useState(() => getCachedHighlightsReceipt(events))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useReveal(!!receipt)

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { if (receipt) markOnboardingDone() }, [receipt])
  useEffect(() => {
    if (receipt) return undefined
    let current = true
    generateHighlightsReceipt(events).then((result) => { if (current) { setReceipt(result); setError('') } })
      .catch((failure) => { if (current) setError(failure.name === 'TimeoutError' ? 'Writing took too long. Your marks are saved. Please retry.' : failure.message) })
    return () => { current = false }
  }, [events, receipt, attempt])

  // the items in the answer sheet's order; the number only counts the ones that appear
  const items = []
  if (receipt) {
    if (receipt.refused) items.push({ id: 'message' })
    for (const s of receipt.sections) items.push({ id: s.id, sentences: s.sentences })
    items.push({ id: 'drawing' }, { id: 'confidence' })
  }
  const number = (id) => String(items.findIndex((it) => it.id === id) + 1).padStart(2, '0')

  return (
    <ReceiptShell
      article={article4}
      title={['What You', 'Marked.']}
      path="/receipt/4"
      readPath="/read/4"
      backLabel="Back to the article"
      pdfName="cursive-write-for-the-earth-receipt.pdf"
      loading={LOADING}
      ready={!!receipt}
      error={error}
      onRetry={() => { setError(''); setAttempt((n) => n + 1) }}
      retryNote="Your marks, words and line are saved on this device."
    >
      {receipt && items.map((item) => {
        if (item.id === 'message') return <section className="receipt__section" key="message"><p className="hh-receipt__prose">{receipt.message}</p></section>
        if (item.id === 'drawing') return <section className="receipt__section" key="drawing"><h2 className="receipt__section-heading"><span>{number('drawing')} / The whole page</span><span>[Your reading]</span></h2><Drawing drawing={receipt.infographic} /></section>
        if (item.id === 'confidence') {
          return (
            <section className="receipt__section" key="confidence"><h2 className="receipt__section-heading"><span>{number('confidence')} / Confidence</span><span>[Beyond the article]</span></h2>
              <div className="receipt__card hh-receipt__note"><p>{receipt.confidence.text}</p><p className="hh-receipt__source">Source: {receipt.confidence.source}. {receipt.confidence.date}.</p></div>
            </section>
          )
        }
        const [left, right] = HEADINGS[item.id]
        return (
          <section className="receipt__section" key={item.id}><h2 className="receipt__section-heading"><span>{number(item.id)} / {left}</span><span>[{right}]</span></h2>
            <p className="hh-receipt__prose">{item.sentences.join(' ')}</p>
          </section>
        )
      })}
    </ReceiptShell>
  )
}

export default HighlightsReceipt
