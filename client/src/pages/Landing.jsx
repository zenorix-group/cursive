import { Link } from 'react-router-dom'
import next from '../assets/landing/poster-next-question.png'
import quixote from '../assets/landing/poster-don-quixote.png'
import gentlemen from '../assets/landing/poster-retired-gentlemen.png'
import international from '../assets/landing/poster-international.png'
import banking from '../assets/landing/poster-banking.png'
import flyerCenter from '../assets/landing/flyer-center.png'
import flyerRight from '../assets/landing/flyer-right.png'
import flyerLeft from '../assets/landing/flyer-left.png'
import './Landing.css'

// x is the image's centre offset from the page centre, y its top edge, w its width; all in the 402px phone frame.
const flyers = [
  { id: 'center', src: flyerCenter, x: 0, y: 130, w: 285 },
  { id: 'right', src: flyerRight, x: 134, y: 620, w: 194 },
  { id: 'left', src: flyerLeft, x: -169, y: 700, w: 125 },
]

const posters = [
  { id: 'banking', alt: 'Banking Frauds', src: banking, x: -136.5, y: -3, w: 129 },
  { id: 'international', alt: 'International Desk', src: international, x: 134, y: -6, w: 134 },
  { id: 'quixote', alt: 'Don Quixote', src: quixote, x: -131.5, y: 296, w: 139 },
  { id: 'gentlemen', alt: 'Retired Gentlemen', src: gentlemen, x: 131, y: 296, w: 140 },
  { id: 'next', alt: 'The Next Question', src: next, x: 0, y: 236, w: 171 },
]

const place = ({ x, y, w }) => ({ '--x': x, '--y': y, '--w': w })

function Landing() {
  return (
    <main className="landing">
      <header className="landing__bar">
        <span className="landing__brand">cursive</span>
      </header>

      <div className="landing__body">
      <section className="fan" aria-label="Featured reads">
        {flyers.map((f) => (
          <img key={f.id} className="flyer" src={f.src} alt="" style={place(f)} />
        ))}
        {posters.map((p) => (
          <img key={p.id} className={`poster poster--${p.id}`} src={p.src} alt={p.alt} style={place(p)} />
        ))}
      </section>

      <section className="intro">
        <p className="intro__eyebrow">An interactive reading platform</p>
        <h1 className="intro__title">Read Differently</h1>
        <p className="intro__lines">
          Stories worth your attention.
          <br />
          Questions worth asking,
          <br />
          Things worth noticing
        </p>
        <Link className="intro__cta" to="/enter">
          Enter Cursive <span aria-hidden="true">→</span>
        </Link>
      </section>
      </div>
    </main>
  )
}

export default Landing
