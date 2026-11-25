// What each article is about, using the same fixed list the Bleed's items are tagged with (server/src/lib/bleed.js).
// Draft pairing: editorial changes this one table. Used only for a reader who signed in and agreed to the use of her reading data.
export const TOPICS = ['finance', 'law', 'safety', 'writing', 'history', 'environment', 'fiction']
export const ARTICLE_TOPICS = {
  1: ['law', 'finance'], // the Nirav Modi extradition
  2: ['finance', 'safety'], // banking frauds
  3: ['finance'], // equities abroad
  4: ['writing', 'environment'], // Write for the Earth
  5: ['writing', 'history'], // Don Quixote
  6: ['fiction'], // the Retired Gentleman
  7: ['fiction'], // Room 912
}
