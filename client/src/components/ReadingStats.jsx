import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { articleStatus } from '../data/articleStatus.js'
import { catalog } from '../data/catalog.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { picksOn, setPicks, usePicksVersion } from '../lib/picks.js'

// "Your reading room": the introduction and the three counts (registered, in progress, completed). It no longer sits at the top of the
// home page: it opens inside the Overture when she double-clicks the companion.
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let hiddenCache = null
const loadHidden = () => {
  if (!hiddenCache) hiddenCache = fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).then((d) => d?.hiddenArticles || []).catch(() => [])
  return hiddenCache
}

function useCounts() {
  const [hidden, setHidden] = useState([])
  useEffect(() => { let live = true; loadHidden().then((list) => { if (live) setHidden(list) }); return () => { live = false } }, [])
  const items = catalog.filter((entry) => !hidden.includes(entry.article))
  const status = (entry) => (entry.article ? articleStatus(entry.article).status : 'ns')
  return { all: items.length, ip: items.filter((e) => status(e) === 'ip').length, done: items.filter((e) => status(e) === 'done').length }
}

const pad = (n) => String(n).padStart(2, '0')

// counts up from 00 when the card opens
function Metric({ value, delay }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0))
  useEffect(() => {
    if (reduceMotion() || !value) { setShown(value); return undefined }
    let raf
    let t0 = null
    const step = (t) => {
      if (t0 === null) t0 = t
      const k = Math.min(1, Math.max(0, (t - t0 - delay) / 800))
      setShown(Math.round(value * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, delay])
  return <b>{pad(shown)}</b>
}

// The switch for picks: on means Cursive may use what she has read to put the right news and opportunities first. Off by default.
function PicksSwitch() {
  const { user } = useAuth()
  usePicksVersion()
  if (!user) return null
  const on = picksOn()
  return (
    <label className="at__picks">
      <span>
        <b>Choose news for me</b>
        <small>{on ? 'On: items about what you have read come first. This happens in your browser.' : 'Off: everyone sees the same list. Turn on to let Cursive use what you have read to put the right items first.'}</small>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(event) => setPicks(event.target.checked)} />
    </label>
  )
}

function ReadingStats() {
  const counts = useCounts()
  const ref = useRef(null)
  return (
    <motion.section ref={ref} className="at__stats" aria-label="Your reading at a glance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <p className="at__stats-kick">
        <svg width="10" height="13" viewBox="0 0 12 15" fill="none" aria-hidden="true"><path d="M1.5 1h9v12.5L6 10.5l-4.5 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        The reading room
      </p>
      <h2>Your reading room.</h2>
      <p className="at__stats-sub">Stories to read, question, and return to. Curated across four quarterly editions.</p>
      <div className="at__stats-row">
        <div><span>Registered</span><Metric value={counts.all} delay={150} /></div>
        <div><span>In progress</span><Metric value={counts.ip} delay={250} /></div>
        <div><span>Completed</span><Metric value={counts.done} delay={350} /></div>
      </div>
      <PicksSwitch />
    </motion.section>
  )
}

export default ReadingStats
