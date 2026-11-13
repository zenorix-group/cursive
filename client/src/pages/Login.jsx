import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import SiteMasthead from '../components/SiteMasthead.jsx'
import { onboardingDone } from '../lib/onboarding.js'
import '../styles/site.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const rules = {
  name: (v) => (v.trim() ? '' : 'Enter your full name.'),
  email: (v) => (EMAIL.test(v.trim()) ? '' : 'Enter an email address like reader@cursive-review.org.'),
  signInPassword: (v) => (v ? '' : 'Enter your password.'),
  newPassword: (v) => (v.length >= 8 ? '' : 'Use at least 8 characters.'),
}

// one labelled input with the design's error line underneath
function Field({ id, label, type = 'text', value, onChange, onBlur, error, placeholder, autoComplete, inputMode, withShow, labelExtra }) {
  const [shown, setShown] = useState(false)
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      {labelExtra ? (
        <div className="label-row"><label htmlFor={id}>{label}</label>{labelExtra}</div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <div className="input">
        <input
          id={id}
          type={withShow && shown ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {withShow && (
          <button className="show" type="button" aria-controls={id} aria-pressed={shown} onClick={() => setShown((s) => !s)}>
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <p className="error" id={`${id}-err`}>{error}</p>
    </div>
  )
}

function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // creating an account is only open to someone who has been through onboarding (a first reading and its receipt);
  // everyone else can sign in, or is pointed to the start
  const canCreate = onboardingDone()
  const wantedCreate = window.location.hash === '#create'
  const [tab, setTab] = useState(() => (wantedCreate && canCreate ? 'create' : 'signin'))
  const [entered, setEntered] = useState(false)
  const [values, setValues] = useState({ siEmail: '', siPass: '', caName: '', caEmail: '', caPass: '', caConfirm: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ signin: '', create: '', error: false })
  const [busy, setBusy] = useState(false)
  const tabRefs = useRef({})
  const timer = useRef(null)

  useEffect(() => { document.title = 'Cursive – Sign in and create account' }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const show = (which, focus) => {
    setTab(which)
    setEntered(true)
    try { window.history.replaceState(null, '', `#${which}`) } catch { /* ignore */ }
    if (focus) tabRefs.current[which]?.focus()
  }

  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: check(key, value, { ...values, [key]: value }) }))
  }

  const check = (key, value, all = values) => {
    switch (key) {
      case 'siEmail': case 'caEmail': return rules.email(value)
      case 'siPass': return rules.signInPassword(value)
      case 'caName': return rules.name(value)
      case 'caPass': return rules.newPassword(value)
      case 'caConfirm': return value === all.caPass ? (value ? '' : 'Repeat your password.') : 'Passwords don’t match. Type the same password again.'
      default: return ''
    }
  }
  const blur = (key) => () => { if (values[key]) setErrors((e) => ({ ...e, [key]: check(key, values[key]) })) }

  const submit = (which, keys, run, busyText, doneText) => async (event) => {
    event.preventDefault()
    if (busy) return
    const found = {}
    keys.forEach((k) => { found[k] = check(k, values[k]) })
    setErrors((e) => ({ ...e, ...found }))
    const bad = keys.find((k) => found[k])
    if (bad) {
      setStatus({ signin: '', create: '', error: false })
      document.getElementById(fieldId[bad])?.focus()
      return
    }
    setBusy(true)
    setStatus({ signin: '', create: '', error: false, [which]: busyText })
    try {
      await run()
      setStatus({ signin: '', create: '', error: false, [which]: doneText })
      timer.current = setTimeout(() => navigate(location.state?.from || '/reading-room'), 550)
    } catch (error) {
      // the server names the field when it is a validation problem (e.g. email already used)
      const key = { email: which === 'signin' ? 'siEmail' : 'caEmail', name: 'caName', password: which === 'signin' ? 'siPass' : 'caPass' }[error.field]
      if (key) setErrors((e) => ({ ...e, [key]: error.message }))
      setStatus({ signin: '', create: '', error: true, [which]: key ? '' : error.message })
      setBusy(false)
    }
  }

  const fieldId = { siEmail: 'si-email', siPass: 'si-pass', caName: 'ca-name', caEmail: 'ca-email', caPass: 'ca-pass', caConfirm: 'ca-confirm' }

  return (
    <div className="cs">
      <div className="screen">
        <SiteMasthead />

        <div className="view" id="view-auth">
          <div className="page">
            <div className="back-row">
              <Link className="back" to="/"><span aria-hidden="true">←</span><span>Back to start</span></Link>
            </div>

            <div className="layout">
              <div className="cs-intro">
                <p className="kicker">Read. Question. Return.</p>
                <h1>A little more room for thought.</h1>
                <p className="standfirst">{canCreate ? 'Sign in to return to your reading, or create an account to begin a more thoughtful reading experience.' : 'Sign in to return to your reading. New here? Start with a short reading first; your account comes after it.'}</p>
              </div>

              <main className="form-col">
                <div className="tabs" role="tablist" aria-label="Account">
                  {(canCreate ? [['signin', 'Sign in'], ['create', 'Create account']] : [['signin', 'Sign in']]).map(([key, label]) => (
                    <button
                      key={key}
                      ref={(node) => { tabRefs.current[key] = node }}
                      className="tab"
                      role="tab"
                      id={`tab-${key}`}
                      aria-controls={`panel-${key}`}
                      aria-selected={tab === key}
                      tabIndex={tab === key ? 0 : -1}
                      onClick={() => show(key, false)}
                      onKeyDown={(e) => { if (canCreate && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) show(key === 'signin' ? 'create' : 'signin', true) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <section className={`panel${entered ? ' enter' : ''}`} id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" hidden={tab !== 'signin'}>
                  <h2>Welcome back.</h2>
                  <p className="sub">Pick up where you left off.</p>
                  <form
                    id="form-signin"
                    noValidate
                    onSubmit={submit('signin', ['siEmail', 'siPass'], () => login(values.siEmail.trim(), values.siPass), 'Signing in…', 'Signed in. Opening your reading room…')}
                  >
                    <Field id="si-email" label="Email address" type="email" inputMode="email" autoComplete="email" placeholder="reader@cursive-review.org"
                      value={values.siEmail} onChange={set('siEmail')} onBlur={blur('siEmail')} error={errors.siEmail} />
                    <Field id="si-pass" label="Password" type="password" autoComplete="current-password" placeholder="Your password" withShow
                      value={values.siPass} onChange={set('siPass')} onBlur={blur('siPass')} error={errors.siPass}
                      labelExtra={<a className="forgot" href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>} />
                    <button className="submit" type="submit" disabled={busy}><span>Sign in</span><span aria-hidden="true">→</span></button>
                    <p className={`status${status.error ? ' status--error' : ''}`} role="status" aria-live="polite">{status.signin}</p>
                    {canCreate
                      ? <div className="switch"><span>New to Cursive?</span><button type="button" onClick={() => { show('create', false); window.scrollTo({ top: 0 }) }}>Create an account.</button></div>
                      : <div className="switch"><span>New to Cursive?</span><Link to="/enter" className="switch__link">Start with a short reading.</Link></div>}
                  </form>
                </section>

                {canCreate && <section className={`panel${entered ? ' enter' : ''}`} id="panel-create" role="tabpanel" aria-labelledby="tab-create" hidden={tab !== 'create'}>
                  <h2>Begin your reading life.</h2>
                  <p className="sub">Create an account and make room for stories worth returning to.</p>
                  <form
                    id="form-create"
                    noValidate
                    onSubmit={submit('create', ['caName', 'caEmail', 'caPass', 'caConfirm'], () => register(values.caName.trim(), values.caEmail.trim(), values.caPass), 'Creating your account…', 'Account created. Opening your reading room…')}
                  >
                    <Field id="ca-name" label="Full name" autoComplete="name" placeholder="e.g. Eleanor Vance"
                      value={values.caName} onChange={set('caName')} onBlur={blur('caName')} error={errors.caName} />
                    <Field id="ca-email" label="Email address" type="email" inputMode="email" autoComplete="email" placeholder="reader@cursive-review.org"
                      value={values.caEmail} onChange={set('caEmail')} onBlur={blur('caEmail')} error={errors.caEmail} />
                    <Field id="ca-pass" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" withShow
                      value={values.caPass} onChange={set('caPass')} onBlur={blur('caPass')} error={errors.caPass} />
                    <Field id="ca-confirm" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your password" withShow
                      value={values.caConfirm} onChange={set('caConfirm')} onBlur={blur('caConfirm')} error={errors.caConfirm} />
                    <button className="submit" type="submit" disabled={busy}><span>Create account</span><span aria-hidden="true">→</span></button>
                    <p className={`status${status.error ? ' status--error' : ''}`} role="status" aria-live="polite">{status.create}</p>
                    <div className="switch"><span>Already have an account?</span><button type="button" onClick={() => { show('signin', false); window.scrollTo({ top: 0 }) }}>Sign in.</button></div>
                  </form>
                </section>}
              </main>

              <footer className="folio">
                <div className="quote-wrap"><blockquote>“Reading is not just taking in words. It’s making room to think.”</blockquote></div>
                <div className="colophon"><span>"Scripta manent, verba volant"</span><i aria-hidden="true" /><small>Folio edition MMXXIV</small></div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
