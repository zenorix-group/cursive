import lead from '../assets/site/lead.jpg'
import book from '../assets/site/book.jpg'
import building from '../assets/site/building.jpg'
import wet from '../assets/site/wet.jpg'

export const IMG = { lead, book, building, wet }

export const CATS = [
  ['all', 'All articles'],
  ['investigations', 'Investigations'],
  ['finance', 'Finance & Law'],
  ['environment', 'Environment'],
  ['essays', 'Essays & culture'],
]
export const STATUSES = [
  ['all', 'All statuses'],
  ['ns', 'Not started'],
  ['ip', 'In progress'],
  ['done', 'Completed'],
]

// The reading room catalogue from the design. Entries with `article` are the two real, readable articles
// (their status comes from the reader's saved reading); the rest are catalogue entries without a story behind them yet.
export const catalog = [
  {
    id: 1, article: 1, img: 'lead', cat: 'investigations', kick: '§ Law & Accountability', read: 6,
    title: 'The Courts Said Yes. Now Get Nirav Modi Home.',
    dek: 'Winning an extradition case and completing an extradition are two distinct operational realities. An archival inquiry into sovereign jurisdiction, diplomatic leverage, and appellate delay across the United Kingdom and Indian judicial ledgers.',
    by: 'Siddharth Varadarajan', role: 'Senior Contributing Jurist • London Bureau', plate: 'Plate ref. no. 01 — High Court of Justice',
    paths: { ns: '/article/1', ip: '/read', done: '/receipt' },
  },
  {
    id: 2, img: 'book', cat: 'finance', kick: '¶ Finance & Law', read: 29,
    title: 'The Sovereign Arbitrage of Sovereign Debt',
    dek: 'Examining how opaque vulture syndicates weaponize distressed debt litigation in secondary municipal markets across South…',
    by: 'Marcus Holloway',
  },
  {
    id: 3, img: 'wet', cat: 'environment', kick: '¶ Environment', read: 16,
    title: 'Subterranean Aquifers and the Legal Commons',
    dek: 'Ground rights, hydraulic capture, and the contested judicial boundaries of deep water tables under private agrarian titles in the arid…',
    by: 'Dr. Aris Thorne',
  },
  {
    id: 4, article: 2, img: 'lead', cat: 'finance', kick: '¶ Finance & Law', read: 8,
    title: 'Common Banking Frauds Everyone Should Know',
    dek: 'An archival examination of deceptive clearinghouse mechanics, synthetic identity generation, and consumer safeguards…',
    by: 'Arthur Pendelton',
    paths: { ns: '/article/2', ip: '/read/2', done: '/receipt/2' },
  },
  {
    id: 5, img: 'wet', cat: 'environment', kick: '§ Environment', read: 18,
    title: 'The Quiet Erasure of Coastal Wetlands',
    dek: 'Tracing fifty years of estuarine transformation and the unseen costs of rapid infrastructure expansion along the western shore.',
    by: 'Elena Rostov',
  },
  {
    id: 6, img: 'wet', cat: 'environment', kick: '§ Environment', read: 18,
    title: 'The Quiet Erasure of Coastal Wetlands',
    dek: 'Tracing fifty years of estuarine transformation and the unseen costs of rapid infrastructure expansion along the western shore.',
    by: 'Elena Rostov',
  },
  {
    id: 7, img: 'wet', cat: 'environment', kick: '§ Environment', read: 18,
    title: 'The Quiet Erasure of Coastal Wetlands',
    dek: 'Tracing fifty years of estuarine transformation and the unseen costs of rapid infrastructure expansion along the western shore.',
    by: 'Elena Rostov',
  },
]

export const CTA = { ns: 'Begin reading →', ip: 'Resume reading →', done: 'Open receipt →' }
