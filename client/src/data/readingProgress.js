const gapIds = [1, 3, 5]
const storageKey = (articleNumber) => `cursive:article:${articleNumber}:questions:v1`

export function loadReadingProgress(articleNumber) {
  const progress = { answers: {}, visitedGaps: {} }
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(articleNumber)))
    for (const id of gapIds) {
      if (stored?.visitedGaps?.[id] === true) progress.visitedGaps[id] = true
      if (typeof stored?.answers?.[id] === 'string' && stored.answers[id].trim()) {
        progress.answers[id] = stored.answers[id]
        progress.visitedGaps[id] = true
      }
    }
  } catch {
    // Missing, corrupt, or unavailable storage should not prevent reading.
  }
  return progress
}

export function saveReadingProgress(articleNumber, progress) {
  try {
    localStorage.setItem(storageKey(articleNumber), JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}
