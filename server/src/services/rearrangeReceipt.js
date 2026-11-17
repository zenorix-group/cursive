const { httpError } = require('./gemini');

// Article 5, "Behind Don Quixote": the receipt for the Re-Arrange game. The key (which title belongs where) lives here and only
// here, so it never reaches the page before she files. Every value is a lookup, a count or a test against the answer sheet, made
// before any sentence is written; the sentences are then put together from her rows. Nothing is sent to a model.

const MID = ['m2', 'm3', 'm4']
const ALL = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']
const START = { m2: 'Freedom', m3: 'The Soldier', m4: 'The Captive' }
const BELONGS = { m2: 'The Soldier', m3: 'The Captive', m4: 'Freedom' }
const PLAIN = { m1: 'Before the Battle', m5: 'The Writer', m6: 'The Question' }
const NAME = { m2: 'the battle', m3: 'the capture', m4: 'the release' }
const FACT = {
  m2: 'At the battle, he becomes a soldier and fights at Lepanto in 1571, and a wound impairs his left hand for life',
  m3: 'At the capture, corsairs take his ship on the way home, and he spends five years captive in Algiers',
  m4: 'At the release, he is ransomed and returns to Spain in 1580, and his adventures seem over',
}
// shorter forms, used only when the receipt would run past 300 words
const SHORT_FACT = {
  m2: 'At the battle, he fights at Lepanto in 1571, and a wound impairs his left hand for life',
  m3: 'At the capture, corsairs take his ship, and he spends five years captive in Algiers',
  m4: 'At the release, he is ransomed and returns to Spain in 1580',
}
const SHORTEST_FACT = {
  m2: 'At the battle, he fights at Lepanto in 1571, and a wound impairs his left hand',
  m3: 'At the capture, corsairs take his ship and hold him in Algiers for five years',
  m4: 'At the release, he is ransomed and returns to Spain in 1580',
}
const SHORT_MEETS = {
  'Freedom@m3': 'the paragraph opens with “freedom” and returns to it in its last line',
  'The Captive@m4': 'the paragraph looks back on “Algiers” and “captivity”',
  'The Soldier@m4': 'the paragraph carries “war” and “wounded”',
}
// where a title she left on a moment meets the article. `pull` marks the rows with a pulling word.
const MEETS = {
  'Freedom@m2': { pull: false, text: 'nothing in the battle speaks of freedom, which comes two moments later' },
  'The Captive@m2': { pull: false, text: 'nothing in the battle speaks of capture, which comes one moment later' },
  'Freedom@m3': { pull: true, text: 'the paragraph opens with “freedom” and returns to it in its last line, since the moment is freedom lost' },
  'The Soldier@m3': { pull: false, text: 'the fighting is behind him by then' },
  'The Captive@m4': { pull: true, text: 'the paragraph looks back on “Algiers” and “captivity” as he comes home' },
  'The Soldier@m4': { pull: true, text: 'he comes home with “war” and “wounded” in the paragraph, the war now a memory' },
}
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const ord = (k) => ORD[k] || `${k}th`
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const words = (text) => text.trim().split(/\s+/).filter(Boolean).length
const sentenceWords = (text) => text.split(/(?<=[.?!])\s+/).map(words)
const MAX_WORDS = 300
const MAX_SENTENCE = 40

// the tap and move records, checked; anything else the page sends is ignored
function validateRearrangeRequest(body) {
  const events = body?.events
  if (!Array.isArray(events) || events.length > 300) throw httpError(400, 'Provide the tap and move records for article 5.')
  const clean = []
  for (const e of events) {
    if (e?.type === 'tap' && ALL.includes(e.momentId)) clean.push({ type: 'tap', momentId: e.momentId })
    else if (e?.type === 'move') {
      if (!MID.includes(e.from) || !MID.includes(e.to) || e.from === e.to) throw httpError(400, 'A move must swap two of the three middle moments.')
      clean.push({ type: 'move', from: e.from, to: e.to })
    }
  }
  return clean
}

// replay the moves from the starting placement; the final placement is whatever the swaps lead to
function replay(events) {
  let placement = { ...START }
  const moves = []
  for (const e of events) {
    if (e.type !== 'move') continue
    const before = placement
    const after = { ...before, [e.from]: before[e.to], [e.to]: before[e.from] }
    moves.push({ k: moves.length + 1, from: e.from, to: e.to, title: before[e.from], other: before[e.to], before, after })
    placement = after
  }
  return { placement, moves }
}

const belongs = (id, placement) => placement[id] === BELONGS[id]
const tookAway = (move) => MID.some((id) => belongs(id, move.before) && !belongs(id, move.after))

function analyze(events) {
  const { placement, moves } = replay(events)
  const firstMoveAt = events.findIndex((e) => e.type === 'move')
  const taps = []
  for (const e of events) if (e.type === 'tap' && !taps.includes(e.momentId)) taps.push(e.momentId)
  const tapsBefore = []
  for (const e of firstMoveAt === -1 ? events : events.slice(0, firstMoveAt)) if (e.type === 'tap' && !tapsBefore.includes(e.momentId)) tapsBefore.push(e.momentId)
  const midBefore = tapsBefore.filter((id) => MID.includes(id))
  const plainBefore = tapsBefore.filter((id) => !MID.includes(id))

  let opened
  if (!taps.length) opened = 'nothing'
  else if (!moves.length) opened = 'looked'
  else if (midBefore.length === 3 && plainBefore.length) opened = 'frame'
  else if (midBefore.length === 3) opened = 'pieces'
  else opened = 'asShe'

  let moved = null
  if (moves.length) {
    if (moves.some(tookAway)) moved = 'second'
    else if (moves.length === 2 && MID.every((id) => belongs(id, placement))) moved = 'straight'
    else if (moves.length === 1) moved = 'one'
  }

  let placed = null
  if (moves.length) {
    if (MID.every((id) => belongs(id, placement))) placed = 'events'
    else if (MID.some((id) => MEETS[`${placement[id]}@${id}`]?.pull)) placed = 'words'
    else placed = 'neither'
  }

  // the move the first question asks about, and the moment the last question and the ending are joined to
  const taken = moves.filter(tookAway)
  const askMove = taken.length ? taken[taken.length - 1] : moves[0] || null
  let endMoment = 'm3'
  if (taken.length) {
    const last = taken[taken.length - 1]
    endMoment = belongs(last.from, last.before) && !belongs(last.from, last.after) ? last.from : last.to
  } else if (moves.length) endMoment = moves[0].to
  else if (taps.filter((id) => MID.includes(id)).length) endMoment = taps.filter((id) => MID.includes(id)).pop()

  return { placement, moves, taps, midBefore, plainBefore, opened, moved, placed, askMove, endMoment }
}

// how a title reached a moment, from the moves
function arrival(id, a) {
  for (let i = a.moves.length - 1; i >= 0; i -= 1) {
    const m = a.moves[i]
    if (m.to === id) return { k: m.k, how: 'own', other: m.other }
    if (m.from === id) return { k: m.k, how: 'swap', other: m.title }
  }
  return null
}

// the belonging title's visits to a moment: when it arrived, left and returned
function visits(id, a) {
  const title = BELONGS[id]
  const parts = []
  let seen = false
  for (const m of a.moves) {
    const wasHere = m.before[id] === title
    const isHere = m.after[id] === title
    if (!wasHere && isHere) {
      const own = m.title === title
      parts.push(`${seen ? 'returned in' : 'arrived with'} your ${ord(m.k)} move${own ? '' : `, trading places with ${m.title}`}`)
      seen = true
    } else if (wasHere && !isHere) {
      const own = m.title === title
      const dest = own ? m.to : m.from
      parts.push(own ? `left for ${NAME[dest]} with your ${ord(m.k)} move` : `left for ${NAME[dest]} when ${m.title} took its place in your ${ord(m.k)} move`)
    }
  }
  return parts
}

function readingSentences(a, short) {
  const out = []
  if (a.opened === 'nothing') {
    out.push('You read his life without opening a title.', 'The paragraphs carry the story on their own, and the titles only name it.')
  } else if (a.opened === 'looked') {
    const mid = a.taps.filter((id) => MID.includes(id)).map((id) => NAME[id])
    out.push(`You opened ${a.taps.length === 1 ? 'a title' : `${a.taps.length} titles`}${mid.length ? `, among them ${mid.length === 1 ? 'the one' : 'those'} on ${list(mid)},` : ''} and made no move.`)
    out.push('You look, then let the account stand, and the article ends by asking what the record leaves out.')
  } else if (a.opened === 'frame') {
    const plain = a.plainBefore.map((id) => PLAIN[id])
    const items = plain.length > 1 ? [plain[0], 'the three middle titles', ...plain.slice(1)] : [plain[0], 'the three middle titles']
    out.push(`You opened ${list(items)} before your first move.`)
    out.push(short ? 'You want the whole shape before you touch a part, and the plain titles frame his life: a young man of letters, then an ageing one.' : 'You want the whole shape before you touch a part, and the plain titles hold the frame of his life: a young man of letters before the battle, an ageing one after the release.')
  } else if (a.opened === 'pieces') {
    out.push('You opened the three middle titles before your first move, and none of the others.')
    out.push('You go straight to what can change, and those three moments are the ones the article vouches for as real, the part of a life that history can tell.')
  } else {
    out.push(`You made your first move after opening only ${list(a.midBefore.map((id) => START[id]))}.`)
    out.push(short ? 'You meet each moment as it arrives, the way his life reached him, with no view of the next.' : 'You meet each moment as it arrives and act on it there, the way his life reached him, one moment at a time with no view of the next.')
  }

  if (a.moved === 'straight') out.push('You made two moves and let both stand.', 'Once you decide, you do not go back, the way he insisted on fighting though he was ill.')
  if (a.moved === 'one') out.push('You made one move.', 'You make one change and let the rest stand, and in the end a single act set him free.')
  if (a.moved === 'second') {
    const k = a.moves.findIndex((m) => a.moves[m.k - 2] && m.from === a.moves[m.k - 2].to && m.to === a.moves[m.k - 2].from && m.title === a.moves[m.k - 2].title) + 1
    out.push(k ? `Your ${ord(k)} move reversed your ${ord(k - 1)}.` : `You made ${a.moves.length} moves, and a title that had settled on its moment left it again.`)
    out.push('You test a choice by undoing it, and in Algiers he tried to escape again and again.')
  }

  if (a.placed === 'events') out.push('In the end, your titles sat with the events of their moments.', short ? 'You read for what happens under the words, and you found it in every paragraph.' : 'You read for what happens under the words: history tells what happened, and you found it in every paragraph.')
  if (a.placed === 'words') {
    const where = MID.filter((id) => MEETS[`${a.placement[id]}@${id}`]?.pull).map((id) => NAME[id])
    out.push(`Your titles on ${list(where)} match words in their paragraphs.`, short ? 'You let a paragraph’s own words choose its title, words spent on how things felt, the half of his life history leaves out.' : 'You let a paragraph’s own words choose its title, words spent on how things felt, the half of his life the article says history leaves out.')
  }
  if (a.placed === 'neither') out.push('Your titles keep a time of their own, a step off his.', 'His life runs in one order, and each moment leads to the next.')
  return out
}

// one short paragraph per middle moment; `level` drops detail until the receipt fits
function momentText(id, a, level) {
  const B = BELONGS[id]
  const here = a.placement[id]
  const fact = level <= -3 ? SHORTEST_FACT[id] : level < 0 ? SHORT_FACT[id] : FACT[id]
  const so = level <= -5 ? '.' : ', so'
  const meetsText = (title) => (level < 0 && SHORT_MEETS[`${title}@${id}`]) || MEETS[`${title}@${id}`].text
  if (a.opened === 'nothing') return `${fact}${so} ${B} belongs here. The title there was ${here}.`
  if (!a.moves.length) {
    return `${fact}${so} ${B} belongs there. Yours was ${here}, and ${meetsText(here)}.`
  }
  if (here === B) {
    const history = visits(id, a)
    return `${fact}. ${B} belongs here.${level >= 1 && history.length ? ` It ${list(history)}.` : ''}`
  }
  const arr = arrival(id, a)
  const how = !arr ? 'which you never moved' : arr.how === 'own' ? `which your ${ord(arr.k)} move brought here` : `which came here when ${arr.other} traded places with it in your ${ord(arr.k)} move`
  const left = visits(id, a)
  const gone = level >= 1 && left.length ? ` ${B} ${list(left)}.` : ''
  return `${fact}${so} ${B} belongs here.${gone} Yours is ${here}${level >= 1 ? `, ${how}` : ''}, and ${meetsText(here)}.`
}

function askQuestion(a) {
  if (a.opened === 'nothing') return null
  if (!a.moves.length) return 'So what made you leave the titles just as they started?'
  const m = a.askMove
  const prev = a.moves[m.k - 2]
  if (prev && prev.title === m.title && prev.to === m.from) return `What made you take ${m.title} off ${NAME[m.from]} just after putting it there?`
  return `So what made you move ${m.title} from ${NAME[m.from]} to ${NAME[m.to]}?`
}

function drawing(a) {
  const lines = ALL.map((id) => (MID.includes(id)
    ? { id, marker: 'para', title: a.placement[id], belongs: belongs(id, a.placement) ? null : BELONGS[id] }
    : { id, marker: 'dot', title: PLAIN[id], faint: true }))
  const out = MID.filter((id) => !belongs(id, a.placement))
  let sentence
  if (!out.length) sentence = 'Your drawing shows your titles where they belong, with nothing beside them.'
  else if (out.length === 2 && a.placement[out[0]] === BELONGS[out[1]] && a.placement[out[1]] === BELONGS[out[0]] && a.moves.length) {
    sentence = `Your drawing shows ${a.placement[out[0]]} and ${a.placement[out[1]]} in each other’s places.`
  } else sentence = 'Your drawing shows your titles on the lines marked ¶, with the titles that belong set beside them.'
  return { lines, sentence }
}

const ENDING_SHORT = 'In Algiers he would not accept the world imposed on him, and decades later he wrote a hero who refuses the limits of the world before him. What he endured may be why he understood that hero so well.'
const ENDING = 'In Algiers he would not accept the world imposed on him, and decades later he wrote a hero who refuses the limits of the world before him. What he endured, without giving up his imagination, may be why he understood his hero so well.'

function compose(a, level) {
  const reading = readingSentences(a, level <= -2)
  const draw = drawing(a)
  const moments = MID.map((id) => ({ id, name: NAME[id], text: momentText(id, a, level) }))
  const ending = [`The end of his story echoes ${NAME[a.endMoment]}.`, level <= -2 ? ENDING_SHORT : ENDING]
  const first = askQuestion(a)
  const questions = [first, level <= -4 ? `And what did ${NAME[a.endMoment]} feel like inside him?` : `And what did ${NAME[a.endMoment]} feel like to him, from the inside?`].filter(Boolean)
  const text = [...reading, draw.sentence, ...moments.map((m) => m.text), ...ending, ...questions].join(' ')
  return { reading, drawing: draw, moments, ending, questions, text }
}

const FORBIDDEN = /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i

function generateRearrangeReceipt(body) {
  const events = validateRearrangeRequest(body)
  const a = analyze(events)
  let made
  for (const level of [2, 1, 0, -1, -2, -3, -4, -5]) {
    made = compose(a, level)
    const fits = words(made.text) <= MAX_WORDS && sentenceWords(made.text).every((n) => n <= MAX_SENTENCE)
    if (fits) break
  }
  if (FORBIDDEN.test(made.text)) throw httpError(502, 'The receipt could not be written. Please retry.')
  return { kind: 'rearrange', reading: made.reading, drawing: made.drawing, moments: made.moments, ending: made.ending, questions: made.questions, words: words(made.text) }
}

module.exports = { generateRearrangeReceipt, validateRearrangeRequest, analyze, compose }
