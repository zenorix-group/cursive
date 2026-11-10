import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

// The wordmark bar shared by the sign-in page and the reading room (desktop shows "Sign out" here once signed in).
function SiteMasthead({ showSignOut = false }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="masthead">
      <div className="wordmark">cursive</div>
      {showSignOut && (
        <button className="signout" type="button" id="signout" onClick={async () => { await logout(); navigate('/login') }}>
          Sign out
        </button>
      )}
    </header>
  )
}

export default SiteMasthead
