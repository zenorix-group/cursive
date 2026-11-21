// One motion language for the companion. Every movement uses these, so they all settle the same way, and none runs
// louder than the meaning it carries.
export const EASE = [0.22, 1, 0.36, 1] // settles softly: forming, swelling, folding, merging
export const EASE_IN = [0.5, 0, 0.9, 0.4] // gathers speed: a drop falling
export const T = { feedback: 0.2, state: 0.5, ambient: 1.2 } // a tap answering, a state changing, a slow background rhythm (seconds)
export const SPRING = { type: 'spring', stiffness: 320, damping: 22 } // presses and small pops
export const SOFT = { type: 'spring', stiffness: 120, damping: 16 } // things arriving
