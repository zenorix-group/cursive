import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import plateImg from '../assets/landing/plate-1.png'
import { article1 } from '../data/articles.js'
import { outsidePath } from '../data/plates.js'
import './ArticleIntro.css'

const ease = [0.22, 1, 0.36, 1]
const rise = (delay = 0, y = 24) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay },
})

function ArticleIntro({ article = article1 }) {
  const { w, h } = article.plate.size
  const lit = article.plate.flags.find((f) => f.id === article.litFlag)
  const litPoints = article.litPoints ?? lit.points
  const crop = article.crop && { width: article.crop.width, marginLeft: article.crop.left, marginTop: article.crop.top }

  return (
    <main className={`article${article.number === 2 ? ' article--india' : ''}`}>
      {/* torn paper edge for the card backgrounds only, so text stays crisp */}
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="deckle" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
        </filter>
        <filter id="wet-ink" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>

      <header className="article__bar">
        <Link to="/" className="article__brand">cursive</Link>
      </header>

      <div className="article__body">
        <motion.section className="card" initial={{ opacity: 0, y: 40, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, ease }}>
          <div className="card__frame" />

          <div className={`card__pic${article.number === 2 ? ' card__pic--india' : ''}`}>
            <div className="card__crop" style={crop}>
              <motion.img src={plateImg} alt="" draggable="false" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease }} />
              <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
                <defs>
                  <clipPath id="found-flag">
                    <polygon points={litPoints} />
                  </clipPath>
                </defs>
                <motion.path
                  className="card__dim"
                  fillRule="evenodd"
                  d={outsidePath(litPoints, w, h)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.7 }}
                />
                <motion.image
                  href={plateImg}
                  width={w}
                  height={h}
                  clipPath="url(#found-flag)"
                  className="card__lit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.7 }}
                />
                <motion.polygon
                  className="card__edge"
                  points={litPoints}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.8 }}
                />
                <polygon className="card__run" points={litPoints} pathLength="1" />
              </svg>
            </div>
          </div>

          <motion.div className="card__cap" {...rise(0.55, 30)}>
            <div className="card__capbg" />
            <div className="card__capin">
              <div className="card__row">
                <h2>{article.mechanic}</h2>
              </div>
              <p>{article.tagline}</p>
            </div>
          </motion.div>
        </motion.section>

        <div className="article__copy">
        <motion.p className="article__eyebrow" {...rise(0.8, 16)}>Article {String(article.number).padStart(2, '0')}</motion.p>
        <motion.h1 className="article__title" {...rise(0.9)}>
          {article.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </motion.h1>
        <motion.p className="article__blurb" {...rise(1.05)}>{article.blurb}</motion.p>

        {article.number === 2 && !article.readPath ? <motion.button type="button" className="article__begin" disabled {...rise(1.2)}>
          Begin <span aria-hidden="true">→</span>
        </motion.button> : <motion.div {...rise(1.2)}><Link to={article.readPath || '/read'} className="article__begin">
          Begin <span aria-hidden="true">→</span>
        </Link></motion.div>}
        </div>
      </div>
    </main>
  )
}

export default ArticleIntro
