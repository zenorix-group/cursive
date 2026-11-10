// Shown only if a signed-in reader's saved reading could not be loaded, so we never show them an empty library by mistake.
function LoadError({ message, onRetry }) {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700 }}>We couldn’t load your reading.</p>
        <p style={{ margin: '10px 0 20px', fontFamily: 'var(--text)', fontSize: 17 }}>{message || 'Please check your connection and try again.'}</p>
        <button type="button" onClick={onRetry} style={{ padding: '12px 22px', border: 0, background: '#000', color: '#fff', fontSize: 15, cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </main>
  )
}

export default LoadError
