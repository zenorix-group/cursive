import { useState } from 'react'
import { Link } from 'react-router-dom'
import plateImg from '../assets/landing/plate-1.png'
import { article1 as article } from '../data/articles.js'
import './Reading.css'

function Reading() {
  const [game, setGame] = useState(false)

  return (
    <main className="read">
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="wet-ink" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>
      <header className="read__bar">
        <Link to="/" className="read__brand">cursive</Link>
      </header>

      <figure className="hero">
        <img className="hero__img" src={plateImg} alt="" draggable="false" />
        <div className="hero__shade" />
        <figcaption className="hero__meta">
          Article {String(article.number).padStart(2, '0')} / {String(article.minutes).padStart(2, '0')} min
        </figcaption>

        <div className="hero__game">
          {!game && <p className="hero__tip">Click Here To Enable The Game.</p>}
          <button
            type="button"
            className={`toggle${game ? ' is-on' : ''}`}
            role="switch"
            aria-checked={game}
            aria-label="Enable the game"
            onClick={() => setGame((g) => !g)}
          >
            <span className="toggle__knob">
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M3 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor" />
              </svg>
            </span>
            <svg className="toggle__tap" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M5 3l14 8-6 2-3 6z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </figure>

      <article className="read__body">
        <h1 className="read__title">{article.headline}</h1>

        <div className="read__author">
          <span className="read__avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="9" r="4" fill="currentColor" /><path d="M4 21c1-5 5-7 8-7s7 2 8 7z" fill="currentColor" /></svg>
          </span>
          <span>{article.author}</span>
        </div>

        {article.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}

        <button type="button" className="read__next">Next Article</button>
      </article>
    </main>
  )
}

export default Reading
