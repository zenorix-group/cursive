import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Plate from './pages/Plate.jsx'
import ArticleIntro from './pages/ArticleIntro.jsx'
import Reading from './pages/Reading.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/enter" element={<Plate />} />
      <Route path="/article/1" element={<ArticleIntro />} />
      <Route path="/read" element={<Reading />} />
    </Routes>
  )
}

export default App
