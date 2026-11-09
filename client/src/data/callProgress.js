export const callLines = [
  { id: 1, text: 'It is Tuesday afternoon. Your phone buzzes with a message from your bank about a transaction you did not make.' },
  { id: 2, text: 'You begin to fret.' },
  { id: 3, text: "The phone rings, and the number on the screen is your bank's, the same one saved in your contacts." },
  { id: 4, text: 'The caller knows which branch you opened your account at, and reads out the last four digits of your card without being asked.' },
  { id: 5, text: 'She sounds calm and professional, like someone who does this all day.' },
  { id: 6, text: "She says the transfer hasn't gone through yet, and that she can hold it for two minutes." },
  { id: 7, text: 'She says an OTP is on its way to your phone, and that she needs it to stop the payment.' },
  { id: 8, text: "She doesn't rush you while you read it out." },
  { id: 9, text: 'Nothing about the call feels wrong until the second message arrives.' },
]

const storageKey = 'cursive:article:2:call:v1'

export function normalizeCallProgress(value) {
  const selectedIds = [...new Set(Array.isArray(value?.selectedIds) ? value.selectedIds : [])]
    .filter((id) => callLines.some((line) => line.id === id)).slice(0, 5)
  const answers = {}
  for (const blank of [1, 2, 3]) {
    if (selectedIds.includes(value?.answers?.[blank])) answers[blank] = value.answers[blank]
  }
  return { selectedIds, answers }
}

export function loadCallProgress() {
  try {
    return normalizeCallProgress(JSON.parse(localStorage.getItem(storageKey)))
  } catch {
    return { selectedIds: [], answers: {} }
  }
}

export function saveCallProgress(progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(normalizeCallProgress(progress)))
    return true
  } catch {
    return false
  }
}

export function toggleCallLine(progress, id) {
  const selectedIds = progress.selectedIds.includes(id)
    ? progress.selectedIds.filter((selected) => selected !== id)
    : progress.selectedIds.length < 5 ? [...progress.selectedIds, id] : progress.selectedIds
  return normalizeCallProgress({ ...progress, selectedIds })
}

export function getCallOptions(progress) {
  const usedIds = new Set(Object.values(progress.answers))
  return callLines
    .filter((line) => progress.selectedIds.includes(line.id))
    .map((line) => ({ ...line, used: usedIds.has(line.id) }))
    .sort((first, second) => Number(first.used) - Number(second.used))
}
