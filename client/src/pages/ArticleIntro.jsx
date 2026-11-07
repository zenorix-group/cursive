import { Link } from 'react-router-dom'
import plateImg from '../assets/landing/plate-1.png'
import { article1 as article } from '../data/articles.js'
import { outsidePath } from '../data/plates.js'
import './ArticleIntro.css'

function ArticleIntro() {
  const { w, h } = article.plate.size
  const lit = article.plate.flags.find((f) => f.id === article.litFlag)

  return (
    <main className="article">
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
        <section className="card">
          <div className="card__frame" />

          <div className="card__pic">
            <div className="card__crop">
              <img src={plateImg} alt="" draggable="false" />
              <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
                <defs>
                  <clipPath id="found-flag">
                    <polygon points={lit.points} />
                  </clipPath>
                </defs>
                <path className="card__dim" fillRule="evenodd" d={outsidePath(lit.points, w, h)} />
                <image href={plateImg} width={w} height={h} clipPath="url(#found-flag)" className="card__lit" />
                <polygon className="card__edge" points={lit.points} />
              </svg>
            </div>
          </div>

          <div className="card__cap">
            <div className="card__capbg" />
            <div className="card__capin">
              <div className="card__row">
                <h2>{article.mechanic}</h2>
                <span className="card__pill" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M3 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor" /></svg>
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M5 3l14 8-6 2-3 6z" fill="currentColor" /></svg>
                </span>
              </div>
              <p>{article.tagline}</p>
            </div>
          </div>
        </section>

        <p className="article__eyebrow">Article {String(article.number).padStart(2, '0')}</p>
        <h1 className="article__title">
          {article.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className="article__blurb">{article.blurb}</p>

        <Link to="/read" className="article__begin">
          Begin <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  )
}

export default ArticleIntro
