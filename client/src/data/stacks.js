import { articleStatus } from './articleStatus.js'
import { narrativeRequest } from './narrativeStorage.js'

// The onboarding pair (articles 1 and 2) is the only stack with two articles; every article after it stands alone. If editorial
// later groups more articles, change this one table.
// narrative: the route of the stack's narrative receipt and a check that both articles count (filed, with at least one move).
// Only the onboarding pair has a narrative receipt so far.
export const STACKS = [
  { id: 'onboarding', articles: [1, 2], narrative: { path: '/receipt/narrative', ready: () => !!narrativeRequest() } },
  { id: 'stack-3', articles: [3] },
  { id: 'stack-4', articles: [4] },
  { id: 'stack-5', articles: [5] },
  { id: 'stack-6', articles: [6] },
  { id: 'stack-7', articles: [7] },
]
export const ISSUE = [1, 2, 3, 4, 5, 6, 7]

const isFiled = (n) => articleStatus(n).status === 'done'

// The article the reading room's big box names as the next to complete: the unfiled other half of a stack she has started.
// The onboarding pair is checked first, so after her first article the second is the one she is pointed to.
export function pendingMate() {
  for (const stack of STACKS) {
    const [first, second] = stack.articles
    if (second === undefined) continue
    if (isFiled(first) !== isFiled(second)) return isFiled(first) ? second : first
  }
  return null
}

// where Next article goes after a receipt: the other article of her stack if she has not filed it, else the next unfiled
// article of the issue (in issue order, wrapping round); null when every article is filed
export function nextArticle(from) {
  const mate = STACKS.find((stack) => stack.articles.includes(from))?.articles.find((n) => n !== from)
  if (mate && !isFiled(mate)) return mate
  const later = [...ISSUE.slice(from), ...ISSUE.slice(0, from - 1)]
  return later.find((n) => !isFiled(n)) ?? null
}
