import { useEffect, useState } from 'react'

// A small message that survives page changes: call showToast('…') from anywhere.
export function showToast(message, tone = 'ok') {
  window.dispatchEvent(new CustomEvent('cursive:toast', { detail: { message, tone, id: Date.now() } }))
}

export default function Toast() {
  const [toast, setToast] = useState(null)
  useEffect(() => {
    let timer
    const onToast = (event) => {
      setToast(event.detail)
      clearTimeout(timer)
      timer = setTimeout(() => setToast(null), 6000)
    }
    window.addEventListener('cursive:toast', onToast)
    return () => { window.removeEventListener('cursive:toast', onToast); clearTimeout(timer) }
  }, [])
  if (!toast) return null
  return (
    <div role="status" aria-live="polite" onClick={() => setToast(null)} style={{
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 100, maxWidth: 'min(92vw, 420px)',
      padding: '14px 20px', borderRadius: 12, background: toast.tone === 'error' ? '#7a2b24' : '#0e1118', color: '#fff',
      font: '500 14px/1.4 var(--text)', boxShadow: '0 10px 30px rgba(0,0,0,.3)', cursor: 'pointer', textAlign: 'center',
    }}>{toast.message}</div>
  )
}
