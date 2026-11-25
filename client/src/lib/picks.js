import { useSyncExternalStore } from 'react'
import { articleStatus } from '../data/articleStatus.js'
import { ARTICLE_TOPICS } from '../data/topics.js'
import { readingConsent, saveReadingConsent, subscribeConsent } from '../data/consent.js'

// Picks for her: after she signs in and agrees (the switch in the reading-room card), the Bleed puts first the items about what she
// has read. The ranking happens in her browser from what is already there; nothing about her reading leaves it for this.
// Breaking items stay on top for everyone. Turning the switch off puts the list back in the same order everyone sees.
const listeners = new Set()
let version = 0
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
subscribeConsent(() => { version += 1; listeners.forEach((fn) => fn()) }) // the choice changed, here or when she signed in
export const usePicksVersion = () => useSyncExternalStore(subscribe, () => version, () => version)

export const picksOn = () => readingConsent()
export function setPicks(on) {
  saveReadingConsent(on)
}

// how much each topic weighs: an article she filed counts twice, one she has begun once
export function interests() {
  const weight = {}
  Object.entries(ARTICLE_TOPICS).forEach(([number, topics]) => {
    const status = articleStatus(Number(number)).status
    const points = status === 'done' ? 2 : status === 'ip' ? 1 : 0
    if (points) topics.forEach((topic) => { weight[topic] = (weight[topic] || 0) + points })
  })
  return weight
}

export const scoreOf = (item, weight) => (item.topics || []).reduce((sum, topic) => sum + (weight[topic] || 0), 0)

// breaking first, then by score, then the order given (newest first). Without consent the list comes back as it is.
export function rankItems(items, { signedIn }) {
  if (!signedIn || !picksOn()) return items
  const weight = interests()
  if (!Object.keys(weight).length) return items
  const scored = items.map((item, index) => ({ item, index, score: scoreOf(item, weight) }))
  scored.sort((a, b) => Number(b.item.priority === 'breaking') - Number(a.item.priority === 'breaking') || b.score - a.score || a.index - b.index)
  return scored.map((entry) => entry.item)
}

// true for an item that is on the list because of what she read
export const isPick = (item, { signedIn }) => signedIn && picksOn() && item.priority !== 'breaking' && scoreOf(item, interests()) > 0
