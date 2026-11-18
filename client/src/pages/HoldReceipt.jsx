import { useEffect, useMemo } from 'react'
import ReceiptShell from '../components/ReceiptShell.jsx'
import { article3 } from '../data/articles.js'
import { HOLD_DATA } from '../data/holdData.js'
import { RANGE, holdReceipt } from '../data/holdLogic.js'
import { loadHoldProgress } from '../data/holdProgress.js'
import { kvSet } from '../data/cursiveStore.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import { useReveal } from '../lib/useReveal.js'
import './HoldReceipt.css'

// the share abroad through each year, with the 10 to 15 per cent band shaded and her move marked on it
function HoldMark({ marks }) {
  const W = 500
  const rowH = 74
  const pad = 14
  const y = (pct) => rowH - pad - ((Math.min(Math.max(pct, 8), 17) - 8) / 9) * (rowH - pad * 2)
  return (
    <figure className="hold-mark">
      <svg viewBox={`0 0 ${W} ${rowH * marks.length}`} role="img" aria-labelledby="hold-mark-title">
        <title id="hold-mark-title">Your share abroad through each year, with 10 to 15 per cent shaded and your move marked</title>
        {marks.map((mark, row) => {
          const weeks = HOLD_DATA[mark.id].weeks
          const x = (i) => 150 + (i / (weeks.length - 1)) * (W - 170)
          const line = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w[3]).toFixed(1)}`).join(' ')
          const at = mark.result ? (mark.result.action === 'end' ? weeks.length - 1 : mark.result.week) : null
          return (
            <g key={mark.id} transform={`translate(0 ${row * rowH})`}>
              <rect x="150" y={y(RANGE.high)} width={W - 170} height={y(RANGE.low) - y(RANGE.high)} className="hm-band" />
              <text x="0" y={rowH / 2 - 2} className="hm-label">{mark.label.split(',')[0]}</text>
              <text x="0" y={rowH / 2 + 12} className="hm-year">{HOLD_DATA[mark.id].year}</text>
              <path d={line} className="hm-line" />
              {at !== null
                ? <><circle cx={x(at)} cy={y(weeks[at][3])} r="4.5" className={mark.result.action === 'end' ? 'hm-end' : 'hm-move'} /><text x={x(at)} y={y(weeks[at][3]) - 9} textAnchor="middle" className="hm-tag">{mark.result.action === 'end' ? 'held' : 'let go'}</text></>
                : <text x={W - 20} y={rowH / 2 + 4} textAnchor="end" className="hm-tag">skipped</text>}
            </g>
          )
        })}
      </svg>
      <figcaption>The shaded band is 10 to 15 per cent. The line is your share abroad, week by week.</figcaption>
    </figure>
  )
}

function HoldReceipt() {
  const progress = useMemo(() => loadHoldProgress(), [])
  const receipt = useMemo(() => holdReceipt(progress.holds), [progress])
  useReveal(true)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  // seeing the receipt completes the article
  useEffect(() => {
    markOnboardingDone()
    kvSet('cursive:article:3:receipt:v1', JSON.stringify({ receipt }))
  }, [receipt])

  return (
    <ReceiptShell
      article={article3}
      title={['The Holds', 'You Played.']}
      path="/receipt/3"
      readPath="/read/3"
      backLabel="Back to your holds"
      pdfName="cursive-the-hold-receipt.pdf"
      ready
    >
      <section className="receipt__section"><h2 className="receipt__section-heading"><span>01 / Your pattern</span><span>[In words]</span></h2><p className="hold-receipt__habit">{receipt.habitText}</p></section>
      <section className="receipt__section"><h2 className="receipt__section-heading"><span>02 / Year by year</span><span>[The 10 to 15 rule]</span></h2>
        {receipt.stories.map((story) => (
          <div className="receipt__card" key={story.id}>
            <div className="receipt__card-heading"><span>{story.title}</span><span>{story.played ? (story.judged.acted ? 'Let go' : 'Held') : 'Skipped'}</span></div>
            {story.lines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        ))}
      </section>
      <section className="receipt__section"><h2 className="receipt__section-heading"><span>03 / The mark</span><span>[Share abroad]</span></h2><HoldMark marks={receipt.marks} /></section>
      <section className="receipt__section"><h2 className="receipt__section-heading"><span>04 / Carrying the habit</span><span>[Looking ahead]</span></h2>
        <aside className="receipt__note"><span>The figure</span><p>{receipt.confidence}</p></aside>
        <ul className="hold-receipt__questions">{receipt.questions.map((q) => <li key={q}>{q}</li>)}</ul>
        <p className="hold-receipt__aside">These are questions to think about, not to answer here. Nothing about your finances was collected, and none of this is investment advice.</p>
      </section>
    </ReceiptShell>
  )
}

export default HoldReceipt
