import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import SiteMasthead from '../components/SiteMasthead.jsx'
import { articleStatus } from '../data/articleStatus.js'
import { CATS, CTA, IMG, STATUSES, catalog } from '../data/catalog.js'
import '../styles/site.css'

const LABEL = { ns: 'Not started', ip: 'In progress', done: 'Completed' }
const pad = (n) => String(n).padStart(2, '0')
const initials = (name) => name.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const Arrow = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M1 6h10M7 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Plate({ a, children }) {
  return (
    <div className={`cs-plate p${((a.id - 1) % 5) + 1}`}>
      {a.img ? <img alt="" src={IMG[a.img]} /> : <i aria-hidden="true" />}
      {children}
    </div>
  )
}

function Stat({ a, short }) {
  const label = LABEL[a.status] + (a.pct ? ` (${a.pct}%)` : '')
  return (
    <span className="stat lbl">
      {!short && (<><span>{a.read} min read</span><span aria-hidden="true">•</span></>)}
      <span className="st"><span className={`dot dot-${a.status}`} />{short ? LABEL[a.status] : label}</span>
    </span>
  )
}

// the call to action is a link only for the two real articles
function Action({ a, className, children }) {
  return a.to ? <Link className={className} to={a.to}>{children}</Link> : <span className={className} aria-disabled="true" title="Coming soon">{children}</span>
}

// titles and cover images open the article too (only the two real ones have a link)
function Go({ a, children }) {
  return a.to ? <Link className="go" to={a.status === 'done' ? a.paths.ip : a.to}>{children}</Link> : children
}

function Lead({ a }) {
  return (
    <article className="art art-lead">
      <Go a={a}><Plate a={a}><span className="chip">{a.plate || `Plate ref. no. ${pad(a.id)}`}</span></Plate></Go>
      <div className="meta"><span className="lbl kick">{a.kick}</span><Stat a={a} /></div>
      <h2><Go a={a}>{a.title}</Go></h2>
      <p className="dek">{a.dek}</p>
      <div className="lead-actions">
        <div className="author">
          <span className="avatar" aria-hidden="true">{initials(a.by)}</span>
          <div><strong>{a.by}</strong><span>{a.role || 'Contributor'}</span></div>
        </div>
        <Action a={a} className="resume">{a.status === 'ip' ? 'Resume reading' : a.status === 'done' ? 'Open receipt' : 'Begin reading'} <Arrow /></Action>
      </div>
    </article>
  )
}

function Secondary({ a }) {
  return (
    <article className="art art-sec">
      <div className="meta"><span className="lbl kick">{a.kick}</span><Stat a={a} /></div>
      <div className="body">
        <div className="txt"><h3><Go a={a}>{a.title}</Go></h3><p className="dek">{a.dek}</p></div>
        <Go a={a}><Plate a={a} /></Go>
      </div>
      <div className="foot"><span className="by">By <b>{a.by}</b></span><Action a={a} className="cta">{a.cta}</Action></div>
    </article>
  )
}

function Low({ a }) {
  return (
    <article className="art art-low">
      <Go a={a}><Plate a={a} /></Go>
      <div className="meta"><span className="lbl kick">{a.kick}</span><Stat a={a} short /></div>
      <h3><Go a={a}>{a.title}</Go></h3>
      <p className="dek">{a.dek}</p>
      <div className="foot"><span className="by">By <b>{a.by}</b></span><span className="lbl by">{a.read} min read</span></div>
    </article>
  )
}

// counts up from 00 the first time the page appears
function Metric({ id, value, delay }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0))
  const first = useRef(true)
  useEffect(() => {
    if (!first.current || reduceMotion()) { setShown(value); return undefined }
    first.current = false
    if (!value) { setShown(0); return undefined }
    let raf
    let t0 = null
    const step = (t) => {
      if (t0 === null) t0 = t
      const k = Math.min(1, Math.max(0, (t - t0 - delay) / 900))
      setShown(Math.round(value * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, delay])
  return <b id={id}>{pad(shown)}</b>
}

function ReadingRoom() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ cat: 'all', status: 'all', q: '', sort: 'recent', view: 'split' })
  const roomRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const barRef = useRef(null)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  // status comes from the reader's saved reading (their account when signed in)
  const articles = useMemo(() => catalog.map((entry) => {
    const status = entry.article ? articleStatus(entry.article) : { status: 'ns' }
    return {
      ...entry,
      ...status,
      to: entry.article ? entry.paths[status.status] : null,
      cta: entry.article ? CTA[status.status] : entry.id === 2 ? 'Open essay →' : 'Begin reading →',
    }
  }), [])

  const count = (s) => articles.filter((a) => a.status === s).length
  const items = useMemo(() => {
    const { cat, status, q, sort } = filters
    const list = articles.filter((a) => (
      (cat === 'all' || a.cat === cat) && (status === 'all' || a.status === status) &&
      (!q || `${a.title} ${a.dek} ${a.by} ${a.kick}`.toLowerCase().includes(q))
    ))
    if (sort === 'short') list.sort((a, b) => a.read - b.read)
    if (sort === 'long') list.sort((a, b) => b.read - a.read)
    if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [articles, filters])
  // the big lead is the article in progress, else one not yet started; completed ones never lead
  const featured = useMemo(() => {
    const pick = (st, real) => items.find((a) => a.status === st && (!real || a.article))
    const lead = pick('ip', true) || pick('ns', true) || pick('ip') || pick('ns') || items[0]
    if (!lead) return items
    // real (readable) articles come right after the lead so they are never buried
    const rest = items.filter((a) => a !== lead)
    return [lead, ...rest.filter((a) => a.article), ...rest.filter((a) => !a.article)]
  }, [items])
  const filtered = filters.cat !== 'all' || filters.status !== 'all' || filters.q

  useEffect(() => { document.title = 'Cursive – Reading room' }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // fade each block in as it scrolls into view
  useEffect(() => {
    if (reduceMotion() || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' })
    let n = 0
    const arm = (nodes) => nodes.forEach((el) => {
      if (el.classList.contains('in')) return
      el.classList.add('rv')
      el.style.setProperty('--d', `${Math.min(n++, 6) * 80}ms`)
      io.observe(el)
    })
    arm([...roomRef.current.querySelectorAll('.r-kicker,.r-head h1,.r-sub,.r-metrics,.r-tools,.r-quote .qgrid,.r-foot .cols,.r-foot .copy')])
    arm([...listRef.current.querySelectorAll('.art,.empty')])
    // never leave content hidden
    const safety = setTimeout(() => {
      roomRef.current?.querySelectorAll('.rv:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('in') })
    }, 2600)
    return () => { io.disconnect(); clearTimeout(safety) }
  }, [items, filters.view])

  // thin reading-progress bar along the top
  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const h = document.documentElement.scrollHeight - innerHeight
      if (barRef.current) barRef.current.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  const clear = () => { set({ cat: 'all', status: 'all', q: '' }); if (searchRef.current) searchRef.current.value = '' }
  const [tab, setTab] = useState('reading')
  const goTab = (name) => {
    if (name === 'you') { navigate('/login'); return }
    setTab(name)
    if (name === 'reading') { set({ status: 'all', cat: 'all' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    if (name === 'archive') { set({ status: 'done' }); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
    if (name === 'search') { searchRef.current?.scrollIntoView({ block: 'center' }); searchRef.current?.focus() }
  }
  const { logout } = useAuth()

  return (
    <div className="cs in-room">
      <div className="screen">
        <SiteMasthead showSignOut={!!user} />

        <div className="view" id="view-room" ref={roomRef}>
          <nav className="r-nav" aria-label="Library filters">
            <div className="wrap">
              <div className="r-cats" id="r-cats" role="group" aria-label="Category">
                {CATS.map(([key, label], i) => (
                  <span key={key} style={{ display: 'contents' }}>
                    {i > 0 && <span className="r-sep" aria-hidden="true">•</span>}
                    <button type="button" aria-pressed={filters.cat === key} onClick={() => set({ cat: key })}>{label}</button>
                  </span>
                ))}
              </div>
              <div className="r-stats" id="r-stats" role="group" aria-label="Reading status">
                <span className="r-vr" aria-hidden="true" />
                {STATUSES.map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={filters.status === key} onClick={() => set({ status: key })}>
                    {key !== 'all' && <span className={`dot dot-${key}`} />}{label}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          <main id="room-main" tabIndex={-1}>
            <div className="wrap">
              <section className="r-head" aria-labelledby="room-title">
                <div className="cs-intro">
                  <div className="r-kicker lbl">
                    <svg width="12" height="15" viewBox="0 0 12 15" fill="none" aria-hidden="true"><path d="M1.5 1h9v12.5L6 10.5l-4.5 3z" stroke="#A33C33" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                    <span>The reading room</span>
                  </div>
                  <h1 id="room-title">Your reading room.</h1>
                  <p className="r-sub">Stories to read, question, and return to. Curated across four quarterly editions.</p>
                </div>
                <div className="r-metrics" aria-label="Your reading at a glance">
                  <div><span className="lbl">Registered</span><Metric id="m-all" value={articles.length} delay={350} /></div>
                  <div><span className="lbl">In progress</span><Metric id="m-ip" value={count('ip')} delay={470} /></div>
                  <div><span className="lbl">Completed</span><Metric id="m-done" value={count('done')} delay={590} /></div>
                </div>
              </section>
            </div>

            <div className="r-toolbar">
              <div className="wrap">
                <div className="r-tools" role="search">
                  <label className="r-search">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="#46474B" strokeWidth="1.5" /><path d="M12.5 12.5L16 16" stroke="#46474B" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    <span className="sr" style={{ position: 'absolute', left: -9999 }}>Search articles</span>
                    <input ref={searchRef} id="r-q" type="search" placeholder="Search articles, authors, topics…" autoComplete="off"
                      onChange={(e) => set({ q: e.target.value.trim().toLowerCase() })} />
                  </label>
                  <div className="r-ctl">
                    <span className="lbl r-count" id="r-count" role="status" aria-live="polite">
                      {filtered ? `${pad(items.length)} of ${pad(articles.length)} articles shown` : `${pad(articles.length)} articles registered`}
                    </span>
                    <div className="r-sort">
                      <select id="r-sort" aria-label="Sort articles" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
                        <option value="recent">Sort: Recently added</option>
                        <option value="short">Sort: Shortest read</option>
                        <option value="long">Sort: Longest read</option>
                        <option value="az">Sort: Title A–Z</option>
                      </select>
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="#0E1118" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div className="r-views" role="group" aria-label="Layout">
                      <button type="button" aria-pressed={filters.view === 'grid'} aria-label="Three-column catalog grid" title="Catalog grid" onClick={() => set({ view: 'grid' })}>
                        <svg width="15" height="12" viewBox="0 0 15 12" fill="currentColor" aria-hidden="true"><rect width="4" height="12" /><rect x="5.5" width="4" height="12" /><rect x="11" width="4" height="12" /></svg>
                      </button>
                      <button type="button" aria-pressed={filters.view === 'split'} aria-label="Editorial split view" title="Editorial split" onClick={() => set({ view: 'split' })}>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true"><rect width="9" height="15" /><rect x="10.5" width="4.5" height="6.5" /><rect x="10.5" y="8" width="4.5" height="7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="wrap">
              <div id="list" ref={listRef}>
                {!items.length ? (
                  <div className="empty">
                    <h2>No articles match.</h2>
                    <p>Nothing in this view yet. Clear the filters to see all {pad(articles.length)} articles.</p>
                    <button type="button" id="r-clear" onClick={clear}>Show all articles</button>
                  </div>
                ) : filters.view === 'grid' ? (
                  <div className="r-grid">{items.map((a) => <Low key={a.id} a={a} />)}</div>
                ) : (
                  <>
                    <div className="split">
                      <Lead a={featured[0]} />
                      <div className="stack">{featured.slice(1, 4).map((a) => <Secondary key={a.id} a={a} />)}</div>
                    </div>
                    {featured.length > 4 && <div className="lower">{featured.slice(4).map((a) => <Low key={a.id} a={a} />)}</div>}
                  </>
                )}
              </div>
            </div>

            <section className="r-quote" aria-label="Folio aphorism">
              <div className="wrap qgrid">
                <div className="cap"><span className="lbl">Folio aphorism</span><p>From the editors’ desk on the responsibility of slow, physical scrutiny.</p></div>
                <figure style={{ margin: 0 }}>
                  <blockquote>“The act of reading is not passive consumption, but an archival testimony against the erasure of nuance.”</blockquote>
                  <cite>— Editorial colophon, Issue XLIV</cite>
                </figure>
              </div>
            </section>
          </main>

          <footer className="r-foot">
            <div className="wrap">
              <div className="cols">
                <div className="brand"><b>Cursive</b><p>An archival quarterly dedicated to critical review, longform essays, philosophy, and typographical clarity.</p></div>
                <div><span className="lbl">Index &amp; archives</span><nav aria-label="Index and archives"><a href="#volume">Volume Register</a><a href="#colophon">Colophon</a><a href="#submissions">Submissions</a></nav></div>
                <div className="imp"><span className="lbl">Impression</span><p>Folio Issue No. 44 — Published in Print &amp; Digital Folio.</p></div>
              </div>
              <p className="copy">© 2026 Cursive . All plates reserved.</p>
            </div>
          </footer>

          <div className="tabbar" role="navigation" aria-label="Main">
            <button type="button" aria-current={tab === 'reading' ? 'page' : undefined} onClick={() => goTab('reading')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12zM13 4h5.5c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5H13V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>Reading
            </button>
            <button type="button" aria-current={tab === 'archive' ? 'page' : undefined} onClick={() => goTab('archive')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="4" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8.5V19h14V8.5M10 12.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Archive
            </button>
            <button type="button" aria-current={tab === 'search' ? 'page' : undefined} onClick={() => goTab('search')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Search
            </button>
            <button type="button" onClick={user ? async () => { await logout(); navigate('/login') } : () => goTab('you')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>{user ? 'Sign out' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
      <div id="rprog" ref={barRef} aria-hidden="true" />
    </div>
  )
}

export default ReadingRoom
