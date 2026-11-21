import { articleStatus } from './articleStatus.js'
import { loadReadingProgress } from './readingProgress.js'
import { loadCallProgress } from './callProgress.js'
import { loadHoldProgress } from './holdProgress.js'
import { loadHighlights } from './highlightProgress.js'
import { loadMoves } from './moveProgress.js'
import { loadCups } from './cupProgress.js'
import { loadFiles } from './fileProgress.js'

// Seven articles make an issue. An article counts toward its stack and the issue once it is filed and she made at least one move in it.
// Six counted articles bring the show-through; in her first issue the onboarding pair counts as one.
export const ISSUE_ID = 'issue-1'
export const ISSUE_NEEDED = 6

const moved = (n) => {
  try {
    if (n === 1) return Object.keys(loadReadingProgress(1).answers).length > 0
    if (n === 2) { const c = loadCallProgress(); return c.selectedIds.length > 0 || Object.keys(c.answers).length > 0 }
    if (n === 3) return Object.keys(loadHoldProgress().holds).length > 0
    if (n === 4) return loadHighlights().marked.length > 0
    if (n === 5) return Object.keys(loadMoves().opened).length > 0
    if (n === 6) return loadCups().cups.some((cup) => cup !== null)
    if (n === 7) return Object.values(loadFiles().notes).some((note) => note.trim())
  } catch { /* unreadable progress counts as no move */ }
  return false
}

export const counts = (n) => articleStatus(n).status === 'done' && moved(n)

// how many of the six she has: articles 3 to 7 one each, and the onboarding pair as one once both count
export function issueCount() {
  const pair = counts(1) && counts(2) ? 1 : 0
  return pair + [3, 4, 5, 6, 7].filter(counts).length
}
