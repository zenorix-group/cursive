import { copyText, downloadPdf, sharePdfFile, shareMessage } from '../lib/receiptPdf.js'
import { receiptsPdf } from '../lib/receiptImage.js'
import { emailCombinedReceipt } from '../lib/combinedReceipt.js'
import { showToast } from '../components/Toast.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { storeIntoOverture } from '../lib/overture.js'
import { useReveal } from '../lib/useReveal.js'
import { markOnboardingDone } from '../lib/onboarding.js'
import OvertureLoader from '../components/OvertureLoader.jsx'

const LOADING = ['Reading the questions you left.', 'Setting each one against the article.', 'Writing your receipt.']
import { article1 as article } from '../data/articles.js'
import { receiptTargets, receiptPhases } from '../data/receiptReferences.js'
import { generateReceipt, getCachedReceipt, getReceiptQuestions } from '../data/receiptStorage.js'
import receiptExample from '../data/receiptExample.json'
import './Receipt.css'

// once both receipts exist, the combined PDF goes to the signed-in reader's email; a message confirms it
const mailCombined = () => {
  emailCombinedReceipt()
    .then((result) => { if (result.sent) showToast(`Your combined receipt has been sent to ${result.email}.`) })
    .catch((failure) => showToast(`${failure.message} Your receipts are saved.`, 'error'))
}

function SectionHeading({ number, title, note }) {
  return <h2 className="receipt__section-heading"><span>{number} / {title}</span><span>[{note}]</span></h2>
}

function Receipt({ example = false }) {
  // finishing an article sends a guest to sign in (their reading moves into the account); a signed-in reader goes on to the reading room
  const { user } = useAuth()
  const nextArticlePath = user ? '/reading-room' : '/login#create'
  const navigate = useNavigate()
  const storeAndGo = (event) => {
    event.preventDefault()
    if (user && !example) mailCombined()
    storeIntoOverture(document.querySelector('.receipt'), example ? null : 1).then(() => navigate(nextArticlePath))
  }
  const [questions] = useState(() => getReceiptQuestions(article.number))
  const [receipt, setReceipt] = useState(() => example ? receiptExample : getCachedReceipt(article.number, questions))
  useReveal(!!receipt)
  // seeing a real receipt completes onboarding, which is what opens account creation
  useEffect(() => { if (receipt && !example) markOnboardingDone() }, [receipt, example])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [shareStatus, setShareStatus] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (receipt) return
    let current = true
    generateReceipt(article.number, questions).then((result) => {
      if (current) { setReceipt(result); setError('') }
    }).catch((failure) => {
      if (current) setError(failure.name === 'TimeoutError' ? 'Generation took too long. Your questions are saved. Please retry.' : failure.message)
    })
    return () => { current = false }
  }, [questions, receipt, attempt])

  const sharing = useRef(false)
  // mode 'share' opens the share sheet; mode 'save' downloads the PDF. A second click while one runs is ignored.
  const makePdf = async (mode) => {
    if (sharing.current) return
    sharing.current = true
    try {
      const path = example ? '/receipt/example' : '/receipt'
      const copied = await copyText(shareMessage(path)) // copied at the click, while the browser allows it
      setShareStatus('Preparing your PDF…')
      const pdf = await receiptsPdf([path])
      const how = mode === 'save' ? (downloadPdf(pdf, 'cursive-receipt.pdf'), 'downloaded') : await sharePdfFile(pdf, 'cursive-receipt.pdf')
      const note = copied ? ' The message with your link is copied: paste it with the PDF.' : ''
      setShareStatus(how === 'shared' ? `Ready to send.${note}` : `PDF saved to your downloads.${note}`)
    } catch (failure) {
      if (failure.name !== 'AbortError') setShareStatus('Could not share. Please try again.')
      else setShareStatus('')
    } finally {
      sharing.current = false
    }
  }
  const shareReceipt = () => makePdf('share')

  return (
    <main className="receipt-page">
      <header className="receipt__bar"><Link to="/">cursive</Link></header>
      <article className="receipt">
        <div className="receipt__rail">
        <header className="receipt__intro">
          {example && <p className="receipt__example-label">Example · questions from the design reference</p>}
          <p className="receipt__eyebrow">Your Cursive receipt</p>
          <h1>The Questions You<br />Left Open.</h1>
        </header>
        <div className="receipt__metadata">
          <div><span>Completion</span><span>{article.minutes} min read</span></div>
          <p>{article.headline}</p>
          <div className="receipt__interaction"><span>Interaction</span><strong>{article.mechanic}</strong></div>
        </div>

          {receipt && <>
            <footer className="receipt__footer">
              <button type="button" onClick={shareReceipt}>Share receipt</button>
              <Link to={nextArticlePath} onClick={storeAndGo}>Next article <span aria-hidden="true">→</span></Link>
            </footer>
            {shareStatus && <p className="receipt__share-status" role="status">{shareStatus}</p>}
            <button type="button" className="receipt__back" onClick={() => makePdf('save')}>Save as PDF</button>
            <Link className="receipt__back" to="/read">Back to your questions</Link>
          </>}
        </div>
        {!receipt && (
          <section className="receipt__loading" aria-live="polite">
            {error ? <><h2>Your questions are saved.</h2><p role="alert">{error}</p><button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></> : <OvertureLoader messages={LOADING} />}
            <Link to="/read">Return to the article</Link>
          </section>
        )}

        {receipt && <>
          <div className="receipt__sections">
          <section className="receipt__section">
            <SectionHeading number="01" title="What you asked" note="Transcripts preserved" />
            <p className="receipt__description">A record of questions filed during the reading, preserving your original wording and punctuation without correction.</p>
            {receipt.inquiries.map((item) => (
              <div className="receipt__card" key={item.id}>
                <div className="receipt__card-heading"><span>Inquiry {String(item.id).padStart(2, '0')} · {item.label}</span><span className={`receipt__badge receipt__badge--${item.outcome}`}>{item.outcome}</span></div>
                <blockquote>{item.text ? `“${item.text}”` : 'Nothing filed.'}</blockquote>
                <p><span className="receipt__record-label">Record:</span> {item.record}</p>
                {item.thread && <span className="receipt__thread">Continues an earlier line of inquiry</span>}
              </div>
            ))}
          </section>
          <section className="receipt__section">
            <SectionHeading number="02" title="Where the questions sat" note="Path calibration" />
            <p className="receipt__description">Your questions alongside the three editorial reference points.</p>
            <ol className="receipt__path">
              {receipt.inquiries.map((item) => <li key={item.id} className={`receipt__path-item receipt__path-item--${item.text ? 'answered' : item.visited ? 'visited' : 'untouched'}`}>
                <div className="receipt__card-heading"><span>Question {String(item.id).padStart(2, '0')}</span><span>{item.text ? 'Saved' : item.visited ? 'Opened' : 'Untouched'}</span></div>
                <div className={`receipt__path-line receipt__path-line--${item.outcome}`} aria-hidden="true"><i /><span /><i /></div>
                <p>{item.path}</p>
              </li>)}
            </ol>
            <div className="receipt__legend"><span>● Untouched</span><span>● Answered & saved</span><span>● Opened / unanswered</span></div>
            <p className="receipt__description">These markers describe interaction state, not correctness. The path compares the substance of each question with the editorial inquiry at that turn.</p>
          </section>
          <section className="receipt__section">
            <SectionHeading number="03" title="What we would have asked" note="Editorial desk" />
            <p className="receipt__description">Cursive’s reference inquiries at the three narrative turns.</p>
            {receiptTargets.map((target) => <div className="receipt__card" key={target.id}>
              <p className="receipt__small-label">Target {String(target.id).padStart(2, '0')} · {target.title}</p>
              <blockquote>“{target.question}”</blockquote>
              <p>{target.reason}</p>
            </div>)}
          </section>
          <section className="receipt__section">
            <SectionHeading number="04" title="What we noticed" note="Ledger observations" />
            <ol className="receipt__observations">{receipt.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ol>
          </section>
          <section className="receipt__section receipt__section--open">
            <SectionHeading number="05" title="The open file" note="Unresolved proof" />
            {receipt.openFiles.length ? receipt.openFiles.map((file) => <div className="receipt__card" key={file.inquiryId}>
              <p className="receipt__small-label">Identified as unresolved in the piece</p>
              <blockquote>“{receipt.inquiries.find((item) => item.id === file.inquiryId)?.text}”</blockquote>
              <p>{file.explanation}</p>
            </div>) : <p className="receipt__description">No unresolved reporting question was identified in the questions filed. Opinions and questions outside this piece are kept in their own categories.</p>}
          </section>
          <section className="receipt__section">
            <SectionHeading number="06" title="Overall-piece infographic" note="Structural cadence" />
            <p className="receipt__description">The three phases of the article and the questions each brings into view.</p>
            <table className="receipt__table"><thead><tr><th>Phase</th><th>Jurisdiction</th><th>Focal tension</th></tr></thead><tbody>{receiptPhases.map((phase) => <tr key={phase.phase}><th scope="row">{phase.phase}</th><td>{phase.jurisdiction}</td><td>{phase.tension}</td></tr>)}</tbody></table>
            <div className="receipt__note"><span>Note</span><p>{receipt.cadenceNote}</p></div>
          </section>
          </div>
        </>}
      </article>
    </main>
  )
}

export default Receipt
