import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { onboardingDone } from './lib/onboarding.js'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import PageTransition from './components/PageTransition.jsx'
import RouteMenu from './components/RouteMenu.jsx'
import Toast from './components/Toast.jsx'
import { isHandoff } from './lib/overture.js'
import Landing from './pages/Landing.jsx'
import Plate from './pages/Plate.jsx'
import ArticleIntro from './pages/ArticleIntro.jsx'
import Reading from './pages/Reading.jsx'
import Receipt from './pages/Receipt.jsx'
import CallTranscript from './pages/CallTranscript.jsx'
import LiftReceipt from './pages/LiftReceipt.jsx'
import NarrativeReceipt from './pages/NarrativeReceipt.jsx'
import VaultReceipt from './pages/VaultReceipt.jsx'
import HoldReading from './pages/HoldReading.jsx'
import HoldReceipt from './pages/HoldReceipt.jsx'
import HighlightsReading from './pages/HighlightsReading.jsx'
import HighlightsReceipt from './pages/HighlightsReceipt.jsx'
import ReArrange from './pages/ReArrange.jsx'
import ReArrangeReceipt from './pages/ReArrangeReceipt.jsx'
import CupsReading from './pages/CupsReading.jsx'
import CupsReceipt from './pages/CupsReceipt.jsx'
import TwoFilesReading from './pages/TwoFilesReading.jsx'
import FilesReceipt from './pages/FilesReceipt.jsx'
import Admin from './admin/Admin.jsx'
import Login from './pages/Login.jsx'
import ReadingRoom from './pages/ReadingRoom.jsx'
import LoadError from './auth/LoadError.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { article2, article3, article4, article5, article6, article7 } from './data/articles.js'

// the app proper is for signed-in readers; a guest is sent to sign in and brought back afterwards
function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

// no account is needed, but the app proper opens once the first reading and its receipt are done
function AfterOnboarding({ children }) {
  const { user } = useAuth()
  return user || onboardingDone() ? children : <Navigate to="/" replace />
}

function App() {
  const location = useLocation()
  const { status, error, retry } = useAuth()
  // wait until we know who is signed in and their saved reading is loaded, so no page starts from an empty copy
  const handoff = isHandoff()
  if (status === 'loading') return null
  if (status === 'error') return <LoadError message={error} onRetry={retry} />
  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence mode="wait" custom={handoff}>
    {/* the admin panel is one page: moving between its sections must not fade the whole screen out and back in */}
    <PageTransition key={location.pathname.startsWith('/admin') ? '/admin' : location.pathname} handoff={handoff}>
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/enter" element={<Plate />} />
      <Route path="/article/1" element={<ArticleIntro />} />
      <Route path="/article/2" element={<ArticleIntro article={article2} />} />
      <Route path="/article/3" element={<ArticleIntro article={article3} />} />
      <Route path="/read/3" element={<HoldReading key="article-3" />} />
      <Route path="/receipt/3" element={<HoldReceipt />} />
      <Route path="/article/4" element={<ArticleIntro article={article4} />} />
      <Route path="/read/4" element={<HighlightsReading key="article-4" />} />
      <Route path="/receipt/4" element={<HighlightsReceipt />} />
      <Route path="/article/5" element={<ArticleIntro article={article5} />} />
      <Route path="/read/5" element={<ReArrange key="article-5" />} />
      <Route path="/receipt/5" element={<ReArrangeReceipt />} />
      <Route path="/article/6" element={<ArticleIntro article={article6} />} />
      <Route path="/read/6" element={<CupsReading key="article-6" />} />
      <Route path="/receipt/6" element={<CupsReceipt />} />
      <Route path="/article/7" element={<ArticleIntro article={article7} />} />
      <Route path="/read/7" element={<TwoFilesReading key="article-7" />} />
      <Route path="/receipt/7" element={<FilesReceipt />} />
      <Route path="/read" element={<Reading key="article-1" />} />
      <Route path="/read/2" element={<Reading key="article-2" article={article2} />} />
      <Route path="/read/2/call" element={<CallTranscript />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/login" element={<Login />} />
      {/* reading and playing never need an account: the sign-in is asked once, at the door, and never as a gate */}
      <Route path="/reading-room" element={<AfterOnboarding><ReadingRoom /></AfterOnboarding>} />
      <Route path="/receipt" element={<Receipt />} />
      <Route path="/receipt/2" element={<LiftReceipt />} />
      <Route path="/receipt/example" element={<Receipt key="example" example />} />
      <Route path="/receipt/narrative" element={<RequireAuth><NarrativeReceipt /></RequireAuth>} />
      <Route path="/receipt/vault" element={<RequireAuth><VaultReceipt /></RequireAuth>} />
      <Route path="/receipt/narrative/example" element={<NarrativeReceipt key="example" example />} />
    </Routes>
    </PageTransition>
    </AnimatePresence>
    {!location.pathname.startsWith('/admin') && <RouteMenu />}
    <Toast />
    </MotionConfig>
  )
}

export default App
