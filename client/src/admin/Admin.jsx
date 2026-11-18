import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './admin.css'

async function api(path, options) {
  const response = await fetch(`/api/admin${path}`, { credentials: 'same-origin', ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Something went wrong.')
  return data
}

// loads data and re-runs when `deps` change; `reload` refetches after an action
function useLoad(path) {
  const [state, setState] = useState({ data: null, error: '' })
  const load = useCallback(() => {
    api(path).then((data) => setState({ data, error: '' }), (e) => setState({ data: null, error: e.message }))
  }, [path])
  useEffect(() => { setState({ data: null, error: '' }); load() }, [load])
  return { ...state, reload: load }
}

const date = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const STATUS = { ns: 'Not started', ip: 'In progress', done: 'Completed' }

function Loading({ state }) {
  if (state.error) return <p className="ad-error">{state.error}</p>
  return state.data ? null : <p className="ad-muted">Loading…</p>
}

function Dashboard() {
  const state = useLoad('/stats')
  const s = state.data
  return (
    <>
      <h1>Overview</h1>
      <Loading state={state} />
      {s && (
        <>
          <div className="ad-cards">
            <div className="ad-card"><span>Readers</span><b>{s.users}</b></div>
            <div className="ad-card"><span>Active this week</span><b>{s.activeWeek}</b></div>
            <div className="ad-card"><span>Receipts</span><b>{s.receipts}</b></div>
          </div>
          <div className="ad-grid">
            <section className="ad-panel">
              <h2>Article completion</h2>
              {s.articles.map((a) => (
                <div className="ad-bar-row" key={a.number}>
                  <span>Article {a.number}</span>
                  <div className="ad-bar"><i style={{ width: a.started ? `${(a.completed / a.started) * 100}%` : 0 }} /></div>
                  <small>{a.completed}/{a.started} finished</small>
                </div>
              ))}
            </section>
            <section className="ad-panel">
              <h2>Last 14 days</h2>
              <Spark title="Sign-ups" rows={s.signups} />
              <Spark title="Receipts generated" rows={s.receiptsByDay} />
            </section>
          </div>
        </>
      )}
    </>
  )
}

function Spark({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="ad-spark">
      <span>{title} <b>{rows.reduce((n, r) => n + r.count, 0)}</b></span>
      <div>{rows.map((r) => <i key={r.date} title={`${r.date}: ${r.count}`} style={{ height: `${Math.max(4, (r.count / max) * 100)}%` }} />)}</div>
    </div>
  )
}

function Readers() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(t) }, [q])
  const state = useLoad(`/users?q=${encodeURIComponent(term)}`)
  return (
    <>
      <h1>Readers</h1>
      <input className="ad-input" type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <Loading state={state} />
      {state.data && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>Name</th><th>Email</th><th>Completed</th><th>Last active</th><th>Joined</th></tr></thead>
            <tbody>
              {state.data.users.map((u) => (
                <tr key={u.id}>
                  <td><Link to={`/admin/readers/${u.id}`}>{u.name}</Link></td>
                  <td>{u.email}</td><td>{u.completed}/6</td><td>{date(u.lastActive)}</td><td>{date(u.createdAt)}</td>
                </tr>
              ))}
              {!state.data.users.length && <tr><td colSpan="5" className="ad-muted">No readers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useLoad(`/users/${id}`)
  const [open, setOpen] = useState(null)
  const [message, setMessage] = useState('')

  const run = async (path, confirmText, after) => {
    if (!window.confirm(confirmText)) return
    try { await api(path, { method: 'DELETE' }); after() } catch (e) { setMessage(e.message) }
  }

  const d = state.data
  return (
    <>
      <p><Link to="/admin/readers" className="ad-back">← Readers</Link></p>
      <Loading state={state} />
      {d && (
        <>
          <div className="ad-head">
            <div><h1>{d.user.name}</h1><p className="ad-muted">{d.user.email} · joined {date(d.user.createdAt)}</p></div>
            {(
              <button className="ad-btn danger" onClick={() => run(`/users/${id}`, `Delete ${d.user.name} and all their saved reading? This cannot be undone.`, () => navigate('/admin/readers'))}>Delete account</button>
            )}
          </div>
          {message && <p className="ad-error">{message}</p>}
          <section className="ad-panel">
            <h2>Articles</h2>
            {d.articles.map((a) => (
              <div className="ad-article" key={a.number}>
                <span>Article {a.number}</span>
                <span className={`ad-status ${a.status}`}>{STATUS[a.status]}</span>
                <small className="ad-muted">{a.updatedAt ? `Updated ${date(a.updatedAt)}` : ''}</small>
                {a.status !== 'ns' && (
                  <button className="ad-btn" onClick={() => run(`/users/${id}/articles/${a.number}`, `Reset article ${a.number} for ${d.user.name}? Their answers and receipt will be deleted.`, state.reload)}>Reset</button>
                )}
              </div>
            ))}
          </section>
          <section className="ad-panel">
            <h2>Saved records &amp; receipts</h2>
            {!d.records.length && <p className="ad-muted">Nothing saved yet.</p>}
            {d.records.map((r) => (
              <div className="ad-record" key={r.id}>
                <div className="ad-record-row">
                  <button className="ad-link" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    Article {r.articleNumber} · {r.kind}{r.isReceipt && <em className="ad-tag">receipt</em>}
                  </button>
                  <small className="ad-muted">{date(r.updatedAt)}</small>
                  <button className="ad-btn" onClick={() => run(`/records/${r.id}`, 'Delete this record?', state.reload)}>Delete</button>
                </div>
                {open === r.id && <pre>{JSON.stringify(r.data, null, 2)}</pre>}
              </div>
            ))}
          </section>
        </>
      )}
    </>
  )
}

const NAMES = { receipt: 'Receipt (articles 1–3)', narrative: 'Narrative receipt (AI)', rearrange: 'Re-Arrange receipt', cups: 'Four Cups receipt', files: 'Two Files receipt', email: 'Combined receipt email' }
const time = (value) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`

function UsageTable({ rows }) {
  if (!rows.length) return <p className="ad-muted">No activity yet.</p>
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead><tr><th>Service</th><th>Requests</th><th>Failed</th><th>Avg time</th><th>Slowest</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.endpoint}>
              <td>{NAMES[r.endpoint] || r.endpoint}</td><td>{r.total}</td>
              <td className={r.failed ? 'ad-bad' : ''}>{r.failed}</td><td>{secs(r.avgMs)}</td><td>{secs(r.maxMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Usage() {
  const state = useLoad('/usage')
  const d = state.data
  return (
    <>
      <h1>AI &amp; receipts</h1>
      <Loading state={state} />
      {d && (
        <>
          <h2>Last 24 hours</h2>
          <UsageTable rows={d.last24h} />
          <h2 className="ad-gap">Last 7 days</h2>
          <UsageTable rows={d.last7d} />
          <h2 className="ad-gap">Recent failures</h2>
          {!d.failures.length && <p className="ad-muted">No failures recorded.</p>}
          {d.failures.length > 0 && (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>When</th><th>Service</th><th>Status</th><th>Time</th><th>Message</th></tr></thead>
                <tbody>
                  {d.failures.map((f, i) => (
                    <tr key={i}>
                      <td>{time(f.createdAt)}</td><td>{NAMES[f.endpoint] || f.endpoint}</td>
                      <td>{f.status === 429 ? '429 rate limited' : f.status || '—'}</td><td>{f.ms ? secs(f.ms) : '—'}</td>
                      <td className="ad-wrap">{f.message || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

function Dot({ ok }) { return <span className={`ad-dot ${ok ? 'on' : 'off'}`} /> }

function System() {
  const state = useLoad('/system')
  const d = state.data
  return (
    <>
      <h1>System</h1>
      <Loading state={state} />
      {d && (
        <>
          <section className="ad-panel">
            <h2>Services</h2>
            <div className="ad-row"><span><Dot ok={d.database} /> Database</span><small>{d.database ? 'Connected' : 'Not connected'}</small></div>
            <div className="ad-row"><span><Dot ok={d.ai.configured} /> AI receipts</span><small>{d.ai.configured ? `${d.ai.provider}${d.ai.model ? ` · ${d.ai.model}` : ''}` : 'No API key set'}</small></div>
            <div className="ad-row"><span><Dot ok={d.email.configured} /> Email (SMTP)</span><small>{d.email.configured ? d.email.host : 'Not set up — combined receipt emails are off'}</small></div>
          </section>
          <section className="ad-panel">
            <h2>Rate limits <small className="ad-muted">per visitor</small></h2>
            {d.limits.map((l) => <div className="ad-row" key={l.label}><span>{l.label}</span><small>{l.max} per {l.minutes >= 60 ? `${l.minutes / 60} hour` : `${l.minutes} min`}</small></div>)}
            <p className="ad-muted ad-note">Limits are set in <code>server/src/lib/limits.js</code>. Blocked requests show up under AI &amp; receipts as 429 failures.</p>
          </section>
        </>
      )}
    </>
  )
}

function Settings() {
  const state = useLoad('/settings')
  const [message, setMessage] = useState('')
  const s = state.data?.settings
  const save = async (patch) => {
    setMessage('')
    try {
      await api('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      state.reload()
    } catch (e) { setMessage(e.message) }
  }
  const toggleArticle = (n) => save({ hiddenArticles: s.hiddenArticles.includes(n) ? s.hiddenArticles.filter((x) => x !== n) : [...s.hiddenArticles, n] })
  return (
    <>
      <h1>Settings</h1>
      <Loading state={state} />
      {message && <p className="ad-error">{message}</p>}
      {s && (
        <>
          <section className="ad-panel">
            <h2>Site</h2>
            <label className="ad-switch"><input type="checkbox" checked={s.registrationOpen} onChange={(e) => save({ registrationOpen: e.target.checked })} /><span><b>New sign-ups open</b><small>Turn off to stop new accounts. Existing readers can still sign in.</small></span></label>
            <label className="ad-switch"><input type="checkbox" checked={s.receiptsEnabled} onChange={(e) => save({ receiptsEnabled: e.target.checked })} /><span><b>Receipt generation on</b><small>Turn off to pause all receipts, for example if the AI service is down or costing too much.</small></span></label>
          </section>
          <section className="ad-panel">
            <h2>Articles shown in the reading room</h2>
            {state.data.articles.map((n) => (
              <label className="ad-switch" key={n}>
                <input type="checkbox" checked={!s.hiddenArticles.includes(n)} onChange={() => toggleArticle(n)} />
                <span><b>Article {n}</b><small>{s.hiddenArticles.includes(n) ? 'Hidden from readers' : 'Visible'}</small></span>
              </label>
            ))}
          </section>
        </>
      )}
    </>
  )
}

function Activity() {
  const state = useLoad('/audit')
  return (
    <>
      <h1>Activity log</h1>
      <p className="ad-muted ad-note">Everything done from this panel.</p>
      <Loading state={state} />
      {state.data && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>When</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {state.data.entries.map((e) => <tr key={e._id}><td>{time(e.createdAt)}</td><td>{e.action}</td><td className="ad-wrap">{e.detail}</td></tr>)}
              {!state.data.entries.length && <tr><td colSpan="3" className="ad-muted">Nothing yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function AdminLogin({ onDone }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      onDone()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }
  return (
    <div className="admin ad-center">
      <form className="ad-login" onSubmit={submit}>
        <h1>Admin sign in</h1>
        <label>Username<input className="ad-input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
        <label>Password<input className="ad-input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {error && <p className="ad-error">{error}</p>}
        <button className="ad-btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

export default function Admin() {
  // undefined = still checking, false = signed out, true = signed in as admin
  const [admin, setAdmin] = useState(undefined)
  const check = useCallback(() => { api('/me').then((d) => setAdmin(d.admin), () => setAdmin(false)) }, [])
  useEffect(() => { check() }, [check])
  if (admin === undefined) return <div className="admin ad-center"><p className="ad-muted">Loading…</p></div>
  if (!admin) return <AdminLogin onDone={check} />
  const logout = async () => { await api('/logout', { method: 'POST' }).catch(() => {}); setAdmin(false) }
  return (
    <div className="admin">
      <aside className="ad-side">
        <strong>Cursive Admin</strong>
        <nav>
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/readers">Readers</NavLink>
          <NavLink to="/admin/usage">AI &amp; receipts</NavLink>
          <NavLink to="/admin/system">System</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
          <NavLink to="/admin/activity">Activity log</NavLink>
        </nav>
        <div className="ad-side-foot">
          <Link to="/reading-room">Back to site</Link>
          <button className="ad-link" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="ad-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="readers" element={<Readers />} />
          <Route path="readers/:id" element={<Reader />} />
          <Route path="usage" element={<Usage />} />
          <Route path="system" element={<System />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<Activity />} />
        </Routes>
      </main>
    </div>
  )
}
