import { motion } from 'framer-motion'

// The "File now" message: a small black chat bubble above the Blot that says what to do. It is only a message: she taps the
// Blot itself, and the filing plays on the Blot (ink rising, then a FILED stamp). The bubble follows along in words.
// phase: 'ready' | 'saving' | 'stamped'. AssistiveTouch drives the phases and the timing.
const SPRING = { type: 'spring', stiffness: 320, damping: 30 }

function FileCard({ phase, side, bottom, margin, still, date }) {
  const origin = side === 'left' ? '0% 100%' : '100% 100%'
  const text = phase === 'stamped' ? `Filed · ${date}` : phase === 'saving' ? 'Saving…' : 'File your answers'
  return (
    <motion.p
      className="at__filecard"
      role="status"
      aria-live="polite"
      style={{ [side === 'left' ? 'left' : 'right']: margin, bottom, transformOrigin: origin }}
      initial={still ? false : { opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={still ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9, transition: { duration: 0.28, ease: [0.5, 0, 0.8, 0.4] } }}
      transition={still ? { duration: 0 } : SPRING}
    >
      {text}
    </motion.p>
  )
}

export default FileCard
