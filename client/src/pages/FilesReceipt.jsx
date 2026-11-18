import { useEffect, useMemo, useState } from 'react'
import ReceiptShell from '../components/ReceiptShell.jsx'
import { article7 } from '../data/articles.js'
import { filesReceiptEvents, generateFilesReceipt, getCachedFilesReceipt } from '../data/filesReceiptStorage.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import { useReveal } from '../lib/useReveal.js'
import './FilesReceipt.css'

const LOADING = ['Reading your two notes.', 'Setting them beside the report.', 'Writing your receipt.']

// six parts of the report in story order, two columns (the hotel's record, the Bureau) and a pale band where each part can go.
// A filled dot is where a part sat in her notes as filed; a faint ring is where it sat earlier and was gone when she filed.
// No ticks, crosses, numbers, arrows, red or green.
function Drawing({ drawing }) {
  const mark = (state) => (state === 'dot' ? <span className="files-draw__dot" aria-hidden="true" /> : state === 'ring' ? <span className="files-draw__ring" aria-hidden="true" /> : null)
  return (
    <figure className="files-draw">
      <table>
        <caption className="visually-hidden">Where each part of the report sat in your notes, and where it can go</caption>
        <thead><tr><th scope="col"><span className="visually-hidden">Part</span></th><th scope="col">hotel’s record</th><th scope="col">Bureau</th></tr></thead>
        <tbody>
          {drawing.cells.map((c) => (
            <tr key={c.part}>
              <th scope="row">{c.name}</th>
              <td className={c.hotelBand ? 'is-band' : undefined}>{mark(c.hotel)}</td>
              <td className={c.bureauBand ? 'is-band' : undefined}>{mark(c.bureau)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption>{drawing.sentence}</figcaption>
    </figure>
  )
}

function FilesReceipt() {
  const events = useMemo(() => filesReceiptEvents(), [])
  const [receipt, setReceipt] = useState(() => getCachedFilesReceipt(events))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useReveal(!!receipt)

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { if (receipt) markOnboardingDone() }, [receipt])
  useEffect(() => {
    if (receipt) return undefined
    let current = true
    generateFilesReceipt(events).then((result) => { if (current) { setReceipt(result); setError('') } })
      .catch((failure) => { if (current) setError(failure.name === 'TimeoutError' ? 'Writing took too long. Your notes are saved. Please retry.' : failure.message) })
    return () => { current = false }
  }, [events, receipt, attempt])

  return (
    <ReceiptShell
      article={article7}
      title={['The Two Files', 'You Kept.']}
      path="/receipt/7"
      readPath="/read/7"
      backLabel="Back to the report"
      pdfName="cursive-room-912-receipt.pdf"
      loading={LOADING}
      ready={!!receipt}
      error={error}
      onRetry={() => { setError(''); setAttempt((n) => n + 1) }}
      retryNote="Your notes are saved on this device."
    >
      {receipt && (
        <>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>01 / Your reading</span><span>[From your notes]</span></h2>
            {receipt.reading.map((p, i) => <p className="files-receipt__prose" key={i}>{p}</p>)}
          </section>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>02 / Where it can go</span><span>[The drawing]</span></h2><Drawing drawing={receipt.drawing} /></section>
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>03 / Your two files</span><span>[At each break]</span></h2>
            {receipt.files.map((p, i) => <div className="receipt__card" key={i}><p>{p}</p></div>)}
          </section>
          {receipt.ending && (
            <section className="receipt__section"><h2 className="receipt__section-heading"><span>04 / How it ends</span><span>[The next morning]</span></h2><p className="files-receipt__prose">{receipt.ending}</p></section>
          )}
          <section className="receipt__section"><h2 className="receipt__section-heading"><span>{receipt.ending ? '05' : '04'} / {receipt.questions.length === 1 ? 'One question' : 'Two questions'}</span><span>[Nothing to answer]</span></h2>
            <ul className="files-receipt__questions">{receipt.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
        </>
      )}
    </ReceiptShell>
  )
}

export default FilesReceipt
