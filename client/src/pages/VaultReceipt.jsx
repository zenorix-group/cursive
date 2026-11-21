import { Link, useSearchParams } from 'react-router-dom'
import { LENSES } from '../components/BackPage.jsx'
import BrandLink from '../components/BrandLink.jsx'
import { issueCount } from '../data/issue.js'
import './Receipt.css'

// The vault receipt reads her across the whole issue through the lens she picked. Its rubric and test document come from editorial;
// until they exist this page holds the choice and says so, rather than inventing a reading.
function VaultReceipt() {
  const [params] = useSearchParams()
  const lens = LENSES.find((item) => item.id === params.get('lens')) ?? LENSES[0]
  return (
    <main className="receipt-page">
      <header className="receipt__bar"><BrandLink /></header>
      <article className="receipt">
        <div className="receipt__rail">
          <header className="receipt__intro">
            <p className="receipt__eyebrow">Your Cursive receipt</p>
            <h1>Your issue,<br />{lens.label}.</h1>
          </header>
          <div className="receipt__metadata"><div><span>The vault</span><span>{issueCount()} of 6 counted</span></div><p>{lens.line}</p></div>
          <Link className="receipt__back" to="/reading-room">Back to home</Link>
        </div>
        <section className="receipt__loading">
          <h2>Your vault receipt is not written yet.</h2>
          <p>It is written from every article in your issue once its rubric is set. Your lens, {lens.label.toLowerCase()}, is saved.</p>
        </section>
      </article>
    </main>
  )
}

export default VaultReceipt
