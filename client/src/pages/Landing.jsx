import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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

const ease = [0.22, 1, 0.36, 1]
const spring = { type: 'spring', stiffness: 120, damping: 14, mass: 0.9 }

// each cover gets its own entrance: where it flies in from, how it turns, when it lands
const enter = {
  banking: { initial: { x: -90, y: -70, rotate: -18 }, delay: 0.35 },
  international: { initial: { x: 90, y: -70, rotate: 18 }, delay: 0.5 },
  quixote: { initial: { x: -120, y: 60, rotate: -14 }, delay: 0.65 },
  gentlemen: { initial: { x: 120, y: 60, rotate: 14 }, delay: 0.8 },
  next: { initial: { y: 140, scale: 0.6, rotate: 6 }, delay: 0.95 },
}
const flyerEnter = { center: 0.05, right: 0.15, left: 0.25 }

const list = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 1.1 } } }
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

const place = ({ x, y, w }) => ({ '--x': x, '--y': y, '--w': w })

function Landing() {
  return (
    <main className="landing">
      <motion.header className="landing__bar" initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease }}>
        <span className="landing__brand">cursive</span>
      </motion.header>

      <div className="landing__body">
      <section className="fan" aria-label="Featured reads">
        {flyers.map((f) => (
          <div key={f.id} className="slot slot--flyer" style={place(f)}>
            <motion.img
              className="flyer"
              src={f.src}
              alt=""
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.1, ease, delay: flyerEnter[f.id] }}
            />
          </div>
        ))}
        {posters.map((p) => (
          <div key={p.id} className={`slot slot--${p.id}`} style={place(p)}>
            <motion.img
              className={`poster poster--${p.id}`}
              src={p.src}
              alt={p.alt}
              initial={{ opacity: 0, ...enter[p.id].initial }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
              transition={{ ...spring, opacity: { duration: 0.5, delay: enter[p.id].delay }, delay: enter[p.id].delay }}
              whileHover={{ y: -8, scale: 1.05, rotate: p.x < 0 ? -2 : 2, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
              whileTap={{ scale: 0.97 }}
            />
          </div>
        ))}
      </section>

      <motion.section className="intro" variants={list} initial="hidden" animate="show">
        <motion.p variants={item} className="intro__eyebrow">An interactive reading platform</motion.p>
        <motion.h1 variants={item} className="intro__title">Read Differently</motion.h1>
        <motion.p variants={item} className="intro__lines">
          Stories worth your attention.
          <br />
          Questions worth asking,
          <br />
          Things worth noticing
        </motion.p>
        <motion.div variants={item}>
          <Link className="intro__cta" to="/enter">
          Enter Cursive <span aria-hidden="true">→</span>
        </Link>
          <Link className="intro__signin" to="/login">Already have an account? <span>Sign in</span></Link>
        </motion.div>
      </motion.section>
      </div>
    </main>
  )
}

export default Landing
