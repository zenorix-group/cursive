const { httpError } = require('./gemini')

// Article 6, "The Retired Gentleman" (Four Cups): the receipt. The key (the promise comes true at the Peepal tree) lives here and only
// here, so it never reaches the page before she files. Every value is a lookup, a count or a test against the answer sheet, made
// before any sentence is written; the sentences are then put together from her rows. Nothing is sent to a model.

const SEATS = { s1: 'Mohan', s2: 'Buntu', s3: 'the old man', s4: 'the travellers', s5: 'the people with problems', s6: 'the disillusioned man', s7: 'the Peepal tree' }
const IDS = Object.keys(SEATS)
const TREE = 's7'
const KIND = { s1: 'close', s2: 'close', s3: 'oldman', s4: 'strangers', s5: 'strangers', s6: 'strangers', s7: 'tree' }
const KIND_PHRASE = { close: 'Mohan and Buntu', oldman: 'the old man', strangers: 'the strangers', tree: 'the Peepal tree' }
const SLIP_MS = 3000
const MAX_WORDS = 450
const MAX_SENTENCE = 40
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth']
const NUM = ['no', 'one', 'two', 'three', 'four']
const words = (text) => text.trim().split(/\s+/).filter(Boolean).length
const sentenceWords = (text) => text.split(/(?<=[.?!])\s+/).map(words)
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const cupList = (ns) => `${list(ns.map((n) => ORD[n]))} cup${ns.length > 1 ? 's' : ''}`
const reachedIndex = (r) => Number(String(r).slice(1)) || 0

// where each seat meets the pull of its own, and the article: from §2 of the answer sheet
const PULL = {
  s1: { words: ['usual'], why: 'the promise asks for an ordinary day, and nothing in his day was more ordinary', meets: 'At Lalla’s, the sound was Murari’s own greeting.' },
  s2: { words: ['lovingly'], why: 'warmth seems a likely home for magic', meets: 'At Buntu’s, Murari was the one giving, with a slap on the back as he arrived.' },
  s3: { words: ['sights and sounds'], why: 'he made the promise, and he danced as if he heard the music himself', meets: 'Those sights and sounds were invisible to the boy, who could only watch.' },
  s4: { words: ['fantastic'], why: 'tales from around the world sound like where wonder would come from', meets: 'Murari’s own days stayed within five kilometres of his home.' },
  s5: { words: ['all the insane kind of problems'], why: 'so much trouble, told at length, sounds like the reality behind the world', meets: 'Those stories pushed him and pleaded with him: they wanted something from him.' },
  s6: { words: ['disillusioned'], why: 'a man stripped of illusions sounds close to what is real', meets: 'His story left Murari wistful, walking home after one more long day of talk.' },
}
const VERBS = ['may have drawn you', 'could have pulled you', 'might have tempted you', 'perhaps led you']
const PRONOUN = { s1: ['him', 'the one'], s2: ['him', 'the one'], s3: ['him', 'the one'], s4: ['them', 'the ones'], s5: ['them', 'the ones'], s6: ['him', 'the one'], s7: ['it', 'the one'] }

// her four rows: what she did (second person), what it suggests, where it meets the article
const ENDED = {
  close: ['you look for wonder close to home, in the people seen every day', 'After his children left for bigger cities and his wife passed away, the faces of his rounds were Murari’s company.'],
  oldman: ['you look for the promise in the one who made it', 'To the boy, the old man was the most interesting thing that had ever happened to him.'],
  strangers: ['you look for wonder in new people and the stories they bring', 'That was Murari’s own search: he carried a tiny, hidden lamp in his heart, hoping each day to meet the stranger with the magic words.'],
  tree: ['you look for wonder in what goes unnoticed', 'The story ends on sunsets and waves, which come every day and are never twice the same.'],
}
const WHEN = {
  asShe: ['you decide as each person arrives', 'Murari chose his strangers that way: a colour, a word or a glint in the eye, and he would start talking.'],
  after: ['you hold your choice until you have the whole story', 'Murari waited too: every morning he wondered whether this could be the day.'],
  both: ['you act on some hunches at once and wait on others', 'Murari did both: he talked to at least five strangers a day, and waited years for one day in particular.'],
}
const SHARE = {
  one: ['you put everything on one seat once you are sure', 'The old man was that sure, yelling his promise at a boy he had only just met.'],
  two: ['you narrow it to two and keep faith with both', 'Murari listened to two kinds as well: the many words of the boastful and the very few of the shy.'],
  spread: ['you give several possibilities a share', 'Murari shared out his days the same way, an hour in each of eight tea shops.'],
  keptSome: ['you spend only what you are sure of', 'Murari held something back too: he stopped telling the old man’s story, first to the world and then to himself.'],
  keptAll: ['you let the story answer for itself', 'Murari let the promise rest for many years too, until it came back to him unasked.'],
}
const MIND = {
  onto: ['you let the story change your mind', 'Murari turned too: his head swung round to the tree’s dancing leaves, his eyes wide with astonishment.'],
  off: ['you doubt even a choice you were sure of', 'Murari doubted himself too: he would smile at his own childishness.'],
  people: ['you keep weighing the people you chose', 'Murari went from conversation to conversation too, sometimes confused, sometimes thrilled.'],
  first: ['you keep to your first choices', 'Murari kept to one very specific routine for ten years.'],
}

function validateCupsRequest(body) {
  const events = body?.events
  if (!Array.isArray(events) || events.length > 400) throw httpError(400, 'Provide the game, cup and back records for article 6.')
  const clean = []
  for (const e of events) {
    if (e?.type === 'game') clean.push({ type: 'game', on: e.on === true })
    else if (e?.type === 'cup' || e?.type === 'back') {
      if (!IDS.includes(e.seatId) || typeof e.ms !== 'number' || !Number.isFinite(e.ms)) throw httpError(400, 'A cup record needs a seat and a time.')
      clean.push({ type: e.type, seatId: e.seatId, reached: IDS.includes(e.reached) ? e.reached : 's0', ms: e.ms })
    }
  }
  return clean
}

// slips: a cup taken back within three seconds of setting it, or set again on the seat it left, drops both records
function dropSlips(records) {
  const out = []
  const seatSets = {}
  const pending = []
  for (const r of records) {
    if (r.type === 'cup') {
      if (pending.length && pending[0].seatId === r.seatId) {
        const back = pending.shift()
        out.splice(out.indexOf(back), 1)
        ;(seatSets[r.seatId] ||= []).push(back.set)
        continue
      }
      const rec = { ...r }
      out.push(rec)
      ;(seatSets[r.seatId] ||= []).push(rec)
    } else {
      const stack = seatSets[r.seatId] || []
      const set = stack[stack.length - 1]
      if (!set) continue
      stack.pop()
      if (r.ms - set.ms <= SLIP_MS) { out.splice(out.indexOf(set), 1); continue }
      const rec = { ...r, set }
      out.push(rec)
      pending.push(rec)
    }
  }
  return out
}

// cups are alike: each cup taken back is matched with the next cup she sets, and the two make a move. Each cup keeps the number of its first setting.
function followCups(records) {
  const cups = []
  const waiting = []
  const changes = []
  const onSeat = {}
  for (const r of records) {
    if (r.type === 'cup') {
      let cup
      if (waiting.length) {
        cup = waiting.shift()
        const change = cup.lastChange
        change.to = r.seatId
        cup.path.push({ seat: r.seatId, reached: reachedIndex(r.reached), ms: r.ms })
      } else {
        cup = { n: cups.length + 1, path: [{ seat: r.seatId, reached: reachedIndex(r.reached), ms: r.ms }], seat: null, lastChange: null }
        cups.push(cup)
      }
      cup.seat = r.seatId
      ;(onSeat[r.seatId] ||= []).push(cup)
    } else {
      const stack = onSeat[r.seatId] || []
      const cup = stack.pop()
      if (!cup) continue
      cup.seat = null
      const change = { n: changes.length + 1, cup: cup.n, from: r.seatId, to: null, reached: reachedIndex(r.reached), ms: r.ms }
      changes.push(change)
      cup.lastChange = change
      waiting.push(cup)
    }
  }
  return { cups, changes }
}

function analyze(events) {
  const records = dropSlips(events.filter((e) => e.type === 'cup' || e.type === 'back'))
  const { cups, changes } = followCups(records)
  const gameEver = events.some((e) => e.type === 'game' && e.on)
  const placed = cups.filter((c) => c.seat)
  const kept = 4 - placed.length
  const everSet = cups.length > 0

  // where her cups ended: the kind of seat that holds the most; a tie goes to the kind of the cup that reached its last seat first
  let ended = null
  let tie = null
  if (placed.length) {
    const count = {}
    for (const c of placed) count[KIND[c.seat]] = (count[KIND[c.seat]] || 0) + 1
    const top = Math.max(...Object.values(count))
    const leaders = Object.keys(count).filter((k) => count[k] === top)
    if (leaders.length === 1) ended = leaders[0]
    else {
      const arrivals = placed.filter((c) => leaders.includes(KIND[c.seat])).sort((x, y) => x.path[x.path.length - 1].ms - y.path[y.path.length - 1].ms)
      ended = KIND[arrivals[0].seat]
      tie = { cup: arrivals[0], seat: arrivals[0].seat }
    }
  }

  // when her cups got there: how far she had read as each reached its last seat
  let when = null
  if (placed.length) {
    const after = placed.filter((c) => c.path[c.path.length - 1].reached >= 7)
    when = after.length === 0 ? 'asShe' : after.length === placed.length ? 'after' : 'both'
  }

  // how she shared them
  let share = null
  if (gameEver && placed.length === 0) share = 'keptAll'
  else if (placed.length) {
    const distinct = new Set(placed.map((c) => c.seat)).size
    share = placed.length < 4 ? 'keptSome' : distinct === 1 ? 'one' : distinct === 2 ? 'two' : 'spread'
  }

  // how she changed her mind: the first row that fits
  let mind = null
  if (everSet) {
    if (changes.some((c) => c.to === TREE)) mind = 'onto'
    else if (changes.some((c) => c.from === TREE)) mind = 'off'
    else if (changes.length) mind = 'people'
    else mind = 'first'
  }

  // the change the first question asks about, or else a cup
  let ask = null
  if (mind === 'onto') ask = { change: changes.find((c) => c.to === TREE) }
  else if (mind === 'off') ask = { change: changes.find((c) => c.from === TREE) }
  else if (mind === 'people') ask = { change: changes[changes.length - 1] }
  else if (everSet) {
    const cup = cups.find((c) => c.path.some((p) => p.seat !== TREE)) || cups[0]
    ask = { cup }
  }
  return { cups, changes, gameEver, placed, kept, everSet, ended, tie, when, share, mind, ask }
}

const cap = (s) => s[0].toUpperCase() + s.slice(1)

function readingParagraphs(a, level = 1) {
  const out = []
  // the last resort, when a receipt would run past the cap: only the first reading keeps where it meets the article
  const tieOf = (tie) => (level <= -2 && out.length ? '' : ` ${tie}`)
  if (!a.gameEver) {
    out.push('You read the story without the game. The game asks where the old man’s promise comes true, with four cups of tea to set beside seven seats.')
    return out
  }
  if (a.ended) {
    const [why, tie] = ENDED[a.ended]
    const did = a.tie
      ? `The first of your cups to reach its last seat went to ${SEATS[a.tie.seat]}, and you gave no other kind of seat more cups than ${KIND_PHRASE[KIND[a.tie.seat]]}.`
      : `More of your cups ended with ${KIND_PHRASE[a.ended]} than anywhere else.`
    out.push(`${did} That suggests ${why}.${tieOf(tie)}`)
  }
  if (a.when) {
    const [why, tie] = WHEN[a.when]
    let did
    if (a.when === 'asShe') did = 'You set every cup you left on a seat before you had read as far as the Peepal tree.'
    else if (a.when === 'after') did = 'You set every cup you left on a seat after you had read as far as the Peepal tree.'
    else {
      const before = a.placed.filter((c) => c.path[c.path.length - 1].reached < 7).map((c) => c.n).sort()
      const after = a.placed.filter((c) => c.path[c.path.length - 1].reached >= 7).map((c) => c.n).sort()
      did = `You set your ${cupList(before)} before you had read as far as the Peepal tree, and your ${cupList(after)} after.`
    }
    out.push(`${did} Chances are ${why}.${tieOf(tie)}`)
  }
  if (a.share) {
    const [why, tie] = SHARE[a.share]
    const distinct = new Set(a.placed.map((c) => c.seat)).size
    const did = {
      one: 'All four of your cups ended on one seat.',
      two: 'Your four cups ended on two seats.',
      spread: `Your four cups ended on ${NUM[distinct]} different seats.`,
      keptSome: `${cap(NUM[a.placed.length])} of your cups sat on seats when you filed, and you kept ${NUM[a.kept]}.`,
      keptAll: 'You turned the game on and kept all four cups.',
    }[a.share]
    out.push(`${did} That may mean ${why}.${tieOf(tie)}`)
  }
  if (a.mind) {
    const [why, tie] = MIND[a.mind]
    const n = a.changes.length
    const times = n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`
    const did = a.mind === 'first' ? 'You took no cup back.'
      : a.mind === 'onto' ? `You changed your mind ${times}, moving a cup onto the Peepal tree${a.ask.change.reached >= 7 ? ' once you had read it' : ''}.`
      : a.mind === 'off' ? `You changed your mind ${times}, taking a cup back from the Peepal tree.`
      : `You changed your mind ${times}, ${n === 1 ? 'about a person' : n === 2 ? 'both times about people' : 'every time about people'}.`
    out.push(`${did} This hints that ${why}.${tieOf(tie)}`)
  }
  return out
}

function drawing(a) {
  const mine = Object.fromEntries(IDS.map((id) => [id, a.placed.filter((c) => c.seat === id).length]))
  const faint = Object.fromEntries(IDS.map((id) => [id, a.changes.filter((c) => c.from === id).length]))
  const lines = IDS.map((id) => ({ id, name: SEATS[id], cups: mine[id], faint: faint[id], band: id === TREE }))
  const above = IDS.filter((id) => id !== TREE).some((id) => mine[id] > 0)
  const onTree = mine[TREE] > 0
  let sentence
  if (!a.placed.length) sentence = 'The seats stand empty, down to the Peepal tree on its pale band.'
  else if (above && onTree) sentence = 'Your cups sit above the Peepal tree’s band and on it'
  else if (onTree) sentence = 'Your cups all sit on the Peepal tree’s band'
  else sentence = 'Your cups all sit above the Peepal tree’s pale band'
  if (a.placed.length) {
    const fTree = faint[TREE] > 0
    const fUp = IDS.filter((id) => id !== TREE).some((id) => faint[id] > 0)
    if (fTree && fUp) sentence += ', with faint outlines where you took cups back'
    else if (fTree) sentence += ', with a faint outline on the band where you took one back'
    else if (fUp) sentence += ', with a faint outline further up where you took one back'
    sentence += '.'
  }
  return { lines, kept: a.gameEver ? a.kept : 0, showKept: a.gameEver && a.kept > 0 && a.placed.length > 0, sentence }
}

// one paragraph for each seat other than the tree that ever held one of her cups
function seatParagraphs(a, level) {
  const out = []
  let v = 0
  for (const id of IDS.filter((s) => s !== TREE)) {
    const here = a.cups.filter((c) => c.path.some((p) => p.seat === id)).map((c) => c.n)
    if (!here.length) continue
    const p = PULL[id]
    const quoted = `${p.words.length > 1 || p.words[0].includes(' ') ? 'the words' : 'the word'} “${p.words.join('” and “')}”`
    const first = `Your ${cupList(here)} went to ${SEATS[id]}, and ${quoted} ${VERBS[v % VERBS.length]}${level >= 0 ? ' there' : ''}: ${p.why}.`
    v += 1
    const parts = [first]
    if (level >= 0) parts.push(p.meets)
    const back = a.changes.filter((c) => c.from === id)
    if (level >= 1 && back.length) {
      const c = back[0]
      const when = c.reached >= 7 ? 'when you reached the Peepal tree' : 'before you reached the Peepal tree'
      const next = c.to ? (c.to === TREE ? 'set it there' : `set it with ${SEATS[c.to]}`) : 'kept it'
      parts.push(`You took the ${ORD[c.cup]} back ${when}, and ${next}.`)
    }
    out.push(parts.join(' '))
  }
  return out
}

function treeParagraph(a) {
  const promise = 'The promise was that on one absolutely ordinary day, Murari would hear “the special music consistently playing in the background of the surrounding noise”. On an ordinary evening, he heard the “familiar rustling” of the old Peepal tree as he never had before. The promise came true because the music had been there all along, in a sound so familiar he had stopped hearing it, beneath the voices he spent his days on.'
  if (!a.gameEver) return `At the old Peepal tree, the promise came true. ${promise}`
  const here = a.placed.filter((c) => c.seat === TREE)
  const left = a.changes.filter((c) => c.from === TREE)
  let open
  if (!here.length) open = a.everSet && !left.length && a.placed.length ? 'You set no cup beside the Peepal tree, where the promise came true.' : 'No cup ended on the Peepal tree, where the promise came true.'
  else {
    const moved = here.filter((c) => c.path.length > 1)
    const plain = here.filter((c) => c.path.length === 1)
    const bits = []
    if (here.length === 4) bits.push('All four of your cups ended on the Peepal tree')
    else {
      if (plain.length) bits.push(`Your ${cupList(plain.map((c) => c.n))} ended on the Peepal tree`)
      if (moved.length) bits.push(plain.length
        ? `and your ${cupList(moved.map((c) => c.n))} ended there, moved from ${list(moved.map((c) => SEATS[c.path[c.path.length - 2].seat]))}`
        : `Your ${cupList(moved.map((c) => c.n))} ended on the Peepal tree, moved there from ${list(moved.map((c) => SEATS[c.path[c.path.length - 2].seat]))}`)
    }
    open = `${bits.join(', ')}${left.length ? `, where your ${list(left.map((c) => ORD[c.cup]))} sat until you took it back` : ''}.`
  }
  return `${open} ${promise}`
}

function questions(a) {
  const out = []
  if (a.gameEver) {
    if (!a.everSet) out.push('What kept your four cups with you?')
    else if (a.ask.change) {
      const c = a.ask.change
      if (c.to === TREE) out.push(`So what made you move your ${ORD[c.cup]} cup to the Peepal tree?`)
      else if (c.to) out.push(`So what made you move your ${ORD[c.cup]} cup from ${SEATS[c.from]} to ${SEATS[c.to]}?`)
      else out.push(`So${c.reached >= 7 ? ', once you got to the Peepal tree,' : ''} what made you take your ${ORD[c.cup]} cup back from ${SEATS[c.from]} and keep it?`)
    } else {
      const cup = a.ask.cup
      const seat = cup.path[0].seat
      const [pron, one] = PRONOUN[seat]
      out.push(`So what was it about ${SEATS[seat]} that made ${pron} ${one} to get your ${cup.n === 1 ? 'very first' : ORD[cup.n]} cup?`)
    }
  }
  out.push(a.gameEver ? 'And on your own ordinary days, which familiar sound might you pass without hearing it?' : 'On your own daily rounds, which familiar sound might you pass without hearing?')
  return out
}

function compose(a, level) {
  const reading = readingParagraphs(a, level)
  const draw = drawing(a)
  const seats = a.gameEver ? seatParagraphs(a, level) : []
  const tree = treeParagraph(a)
  const qs = questions(a)
  const text = [...reading, draw.sentence, ...seats, tree, ...qs].join(' ')
  return { reading, drawing: draw, seats, tree, questions: qs, text }
}

const FORBIDDEN = /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i

function generateCupsReceipt(body) {
  const events = validateCupsRequest(body)
  const a = analyze(events)
  let made
  for (const level of [1, 0, -1, -2]) {
    made = compose(a, level)
    if (words(made.text) <= MAX_WORDS && sentenceWords(made.text).every((n) => n <= MAX_SENTENCE)) break
  }
  if (FORBIDDEN.test(made.text)) throw httpError(502, 'The receipt could not be written. Please retry.')
  return { kind: 'cups', reading: made.reading, drawing: made.drawing, seats: made.seats, tree: made.tree, questions: made.questions, words: words(made.text) }
}

module.exports = { generateCupsReceipt, validateCupsRequest, analyze, compose }
