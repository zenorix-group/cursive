import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import PageTransition from './components/PageTransition.jsx'
import Landing from './pages/Landing.jsx'
import Plate from './pages/Plate.jsx'
import ArticleIntro from './pages/ArticleIntro.jsx'
import Reading from './pages/Reading.jsx'
import Receipt from './pages/Receipt.jsx'
import CallTranscript from './pages/CallTranscript.jsx'
import LiftReceipt from './pages/LiftReceipt.jsx'
import Login from './pages/Login.jsx'
import ReadingRoom from './pages/ReadingRoom.jsx'
import LoadError from './auth/LoadError.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { article2 } from './data/articles.js'

function App() {
  const location = useLocation()
  const { status, error, retry } = useAuth()
  // wait until we know who is signed in and their saved reading is loaded, so no page starts from an empty copy
  if (status === 'loading') return null
  if (status === 'error') return <LoadError message={error} onRetry={retry} />
  return (
    <MotionConfig reducedMotion="user">
    <AnimatePresence mode="wait">
    <PageTransition key={location.pathname}>
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/enter" element={<Plate />} />
      <Route path="/article/1" element={<ArticleIntro />} />
      <Route path="/article/2" element={<ArticleIntro article={article2} />} />
      <Route path="/read" element={<Reading key="article-1" />} />
      <Route path="/read/2" element={<Reading key="article-2" article={article2} />} />
      <Route path="/read/2/call" element={<CallTranscript />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reading-room" element={<ReadingRoom />} />
      <Route path="/receipt" element={<Receipt />} />
      <Route path="/receipt/2" element={<LiftReceipt />} />
      <Route path="/receipt/example" element={<Receipt key="example" example />} />
    </Routes>
    </PageTransition>
    </AnimatePresence>
    </MotionConfig>
  )
}

export default App
