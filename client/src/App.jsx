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
import { article2 } from './data/articles.js'

function App() {
  const location = useLocation()
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
