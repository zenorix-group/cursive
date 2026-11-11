import lead from '../assets/site/lead.jpg'
import book from '../assets/site/book.jpg'
import building from '../assets/site/building.jpg'
import wet from '../assets/site/wet.jpg'
import equities from '../assets/site/equities.jpg'
import earth from '../assets/site/earth.jpg'
import quixote from '../assets/site/quixote.jpg'
import gentleman from '../assets/site/gentleman.jpg'
import room912 from '../assets/site/room912.jpg'

export const IMG = { lead, book, building, wet, equities, earth, quixote, gentleman, room912 }

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
    id: 2, img: 'equities', cat: 'finance', kick: '¶ Finance & Law', read: 5,
    title: 'Should You Invest In Foreign Or International Equities?',
    dek: 'The financial equivalent of putting all your nest eggs in one basket is keeping every rupee inside one country. Funds that buy foreign shares have been climbing the ladder since they first arrived in India…',
    by: 'Cursive Desk',
  },
  {
    id: 3, img: 'earth', cat: 'essays', kick: '¶ Essays & Culture', read: 6,
    title: 'Write for the Earth',
    dek: 'A writing competition that asks for sentences about writing and the earth in the same breath. Mark the lines that carry both themes, then write to us with what is running through them…',
    by: 'Cursive Desk',
  },
  {
    id: 4, article: 2, img: 'lead', cat: 'finance', kick: '¶ Finance & Law', read: 8,
    title: 'Common Banking Frauds Everyone Should Know',
    dek: 'An archival examination of deceptive clearinghouse mechanics, synthetic identity generation, and consumer safeguards…',
    by: 'Arthur Pendelton',
    paths: { ns: '/article/2', ip: '/read/2', done: '/receipt/2' },
  },
  {
    id: 5, img: 'quixote', cat: 'essays', kick: '§ Essays & Culture', read: 6,
    title: 'Behind Don Quixote',
    dek: 'Before he created one of literature’s most famous adventurers, Miguel de Cervantes had already lived an extraordinary adventure of his own: from Renaissance Italy to the battle of Lepanto…',
    by: 'Cursive Desk',
  },
  {
    id: 6, img: 'gentleman', cat: 'essays', kick: '§ Essays & Culture', read: 7,
    title: 'The Retired Gentleman',
    dek: 'Mr. Murari Lal retired from his state bus driving duty some 15 years ago. He put his two kids through college, and just as he settled into retired life, his wife passed away…',
    by: 'Saumya Dikshit',
  },
  {
    id: 7, img: 'room912', cat: 'investigations', kick: '§ Investigations', read: 3,
    title: 'Room 912',
    dek: 'At 23:18, housekeeping received a request for fresh towels from Room 912, a room blocked from guest allocation since the start of the season. Reception confirmed: Room Status: Vacant…',
    by: 'Bureau of Unfiled Incidents',
  },
]

export const CTA = { ns: 'Begin reading →', ip: 'Resume reading →', done: 'Open receipt →' }
