import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { nextArticle } from '../data/stacks.js'
import { logCompanion } from '../lib/companion.js'
import { onboardingDone } from '../lib/onboarding.js'

// Every receipt ends the same way, with two buttons: Next article, and Back to home. A signed-in reader goes to the other article of
// her stack if she has not filed it, else the next unfiled article of the issue; a guest, still in onboarding, goes to sign in.
// props: articleId, store (an async function that keeps the receipt in the Overture before she leaves)
function ReceiptEnding({ articleId, store }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const next = user ? nextArticle(articleId) : null
  const nextPath = !user ? '/login#create' : next ? `/article/${next}` : '/reading-room'
  const homePath = user || onboardingDone() ? '/reading-room' : '/'

  const go = (choice, path) => (event) => {
    event.preventDefault()
    logCompanion('next', { articleId, choice })
    // keeping the receipt must never stop her leaving, even if it fails or throws
    Promise.resolve().then(() => store?.()).catch(() => {}).then(() => navigate(path))
  }

  return (
    <footer className="receipt__footer receipt__footer--end">
      <Link to={nextPath} onClick={go('next', nextPath)}>Next article <span aria-hidden="true">→</span></Link>
      <Link className="is-home" to={homePath} onClick={go('home', homePath)}>Back to home</Link>
    </footer>
  )
}

export default ReceiptEnding
