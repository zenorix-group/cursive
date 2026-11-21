import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { onboardingDone } from '../lib/onboarding.js'

// The "cursive" wordmark in every page's bar. Once the reader has been through onboarding (or has an account) it goes to the
// reading room; while they are still in onboarding it goes back to the first page. It is decided at the click, because finishing
// a receipt completes onboarding after the bar has already been drawn.
function BrandLink({ className, children = 'cursive' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const target = () => (user || onboardingDone() ? '/reading-room' : '/')
  return (
    <Link
      to={target()}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return
        event.preventDefault()
        navigate(target())
      }}
    >{children}</Link>
  )
}

export default BrandLink
