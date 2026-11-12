import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GLYPH_LEVELS } from './glyphLevels.js'

// The overture mark as a loader: its five levels rise and settle one after another while the receipt is being made,
// with a short line underneath that moves on every few seconds so a long wait still feels like progress.
function OvertureLoader({ messages, interval = 3600 }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (messages.length < 2) return undefined
    const id = setInterval(() => setIndex((i) => Math.min(i + 1, messages.length - 1)), interval)
    return () => clearInterval(id)
  }, [messages, interval])

  return (
    <div className="ov-loader" role="status" aria-live="polite" aria-label={messages[index]}>
      <svg className="ov-loader__glyph" viewBox="0 0 47 47" aria-hidden="true">
        <defs>
          <filter id="ov-wobble" x="8.9" y="8.9" width="28.6" height="29.3" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0629 0.0885" numOctaves="3" seed="2331" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter="url(#ov-wobble)">
          {GLYPH_LEVELS.map((d, i) => <path key={i} d={d} fill="currentColor" style={{ '--i': i }} />)}
        </g>
      </svg>
      <div className="ov-loader__text">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default OvertureLoader
