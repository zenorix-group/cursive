import { motion } from 'framer-motion'

// `custom` reaches the page that is leaving, `handoff` the one arriving. During a handoff (a receipt being put away in
// the overture) the old page is already gone, so it leaves at once and the new one just fades in, with no blur or slide.
const variants = {
  initial: (handoff) => (handoff ? { opacity: 0, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 18, filter: 'blur(6px)' }),
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: (handoff) => (handoff ? { opacity: 0, y: 0, filter: 'blur(0px)', transition: { duration: 0.01 } } : { opacity: 0, y: -12, filter: 'blur(4px)' }),
}

export default function PageTransition({ children, handoff = false }) {
  return (
    <motion.div
      variants={variants}
      custom={handoff}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: handoff ? 0.32 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
