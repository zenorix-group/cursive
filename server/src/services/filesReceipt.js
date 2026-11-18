const { httpError } = require('./gemini')

// Article 7, "Room 912" (Two Files): the receipt. The key (what the hotel's record holds and what the Bureau holds) lives here and
// only here, so it never reaches the page before she files. The server finds the parts of the report in each note by the words in the
// answer sheet's appendix, picks one row in each table, and then puts the sentences together from her rows. Nothing is sent to a model.

const PARTS = ['request', 'voice', 'saw', 'camera', 'lock', 'towels', 'nobody', 'schedule']
const NAME = { request: 'the request', voice: 'the voice', saw: 'what Sofia saw', camera: 'the camera', lock: 'the lock', towels: 'the towels inside', nobody: 'nobody there', schedule: 'the schedule' }
const DRAWN = ['request', 'voice', 'saw', 'lock', 'towels', 'schedule']
const HOTEL_BAND = ['request', 'lock', 'towels']
const FILE_NAME = { hotel: 'hotel’s', bureau: 'Bureau' }
const REACH = ['none', 'b1', 'b2', 'morning', 'end']
const MAX_WORDS = 300
const MAX_SENTENCE = 40

// how the server finds each part: the words in the appendix, read in lower case
const FIND = {
  request: ['request', 'asked for', 'ordered', 'called for', 'vacant', 'blocked', 'unoccupied', 'unassigned', 'unbooked', 'keycard', 'no guest'],
  voice: ['voice', 'replied', 'answered', 'spoke', 'said', 'man', 'male', 'leave them', 'someone'],
  saw: ['busy', 'crowd', 'people', 'aside', 'pass', 'passed', 'passing', 'passers', 'figure', 'presence', 'light', 'ghost', 'spirit', 'haunted'],
  camera: ['cctv', 'camera', 'footage', 'video'],
  lock: ['lock', 'locked', 'unlock', 'entry', 'entries', 'entered', 'unentered', 'opened', 'unopened', '137', 'sealed'],
  nobody: ['nobody', 'no one', 'no-one', 'occupant', 'empty', 'dark', 'luggage'],
  schedule: ['schedule', 'itinerary', 'timetable', 'kick-off', '13:00', '1pm', 'match', 'fixture', 'predicted', 'prophecy', 'foretold', 'came true', 'brought forward', 'team bus'],
}
const TOWEL_WORDS = ['towel', 'towels']
const TOWEL_WHERE = ['inside', 'in the room', 'in 912', 'rack', 'folded', 'found', 'moved', 'gone', 'missing', 'disappeared', 'vanished', 'taken', 'appeared', 'within', 'crossed']

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const has = (text, word) => new RegExp(`(^|[^a-z0-9])${esc(word)}($|[^a-z0-9])`).test(text)
const anyOf = (text, list) => list.some((w) => has(text, w))

// the parts a note holds
function partsOf(note) {
  const t = String(note || '').toLowerCase().replace(/[’‘]/g, "'")
  const out = new Set()
  for (const [part, list] of Object.entries(FIND)) if (anyOf(t, list)) out.add(part)
  if (anyOf(t, TOWEL_WORDS) && anyOf(t, TOWEL_WHERE)) out.add('towels')
  return out
}

// a few of her own words, exactly as she wrote them, around the first word the server found for a part (or from the start)
function quoteOf(note, part) {
  const tokens = String(note || '').trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return ''
  let at = 0
  if (part) {
    const list = part === 'towels' ? [...TOWEL_WORDS] : FIND[part] || []
    const idx = tokens.findIndex((tok) => anyOf(tok.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9:'-]/g, ' ').trim(), list))
    if (idx > 0) at = Math.max(0, idx - 1)
  }
  return tokens.slice(at, at + 3).join(' ').replace(/[.,;:]+$/, '')
}

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length
const sentenceWords = (text) => text.split(/(?<=[.?!])\s+/).map(words)
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

function validateFilesRequest(body) {
  const events = body?.events
  if (!Array.isArray(events) || events.length > 400) throw httpError(400, 'Provide the game, note and file records for article 7.')
  const clean = []
  for (const e of events) {
    if (e?.type === 'game') clean.push({ type: 'game', on: e.on === true })
    else if (e?.type === 'note') {
      if (!['hotel', 'bureau'].includes(e.file) || typeof e.text !== 'string' || e.text.length > 600) throw httpError(400, 'A note record needs its file and its text.')
      clean.push({ type: 'note', file: e.file, text: e.text, reached: REACH.includes(e.reached) ? e.reached : 'none' })
    } else if (e?.type === 'file') {
      if (typeof e.hotel !== 'string' || typeof e.bureau !== 'string' || e.hotel.length > 600 || e.bureau.length > 600) throw httpError(400, 'The file record needs the text of both notes.')
      clean.push({ type: 'file', hotel: e.hotel, bureau: e.bureau, reached: REACH.includes(e.reached) ? e.reached : 'end' })
    }
  }
  return clean
}

const reachIndex = (r) => REACH.indexOf(r)

function analyze(events) {
  const gameEver = events.some((e) => e.type === 'game' && e.on)
  const noteRecs = events.filter((e) => e.type === 'note')
  const fileRec = events.filter((e) => e.type === 'file').pop() || null
  const last = { hotel: '', bureau: '' }
  const states = [] // the two notes after each record, with how far she had read
  for (const r of noteRecs) {
    last[r.file] = r.text
    states.push({ hotel: last.hotel, bureau: last.bureau, reached: reachIndex(r.reached) })
  }
  const final = fileRec ? { hotel: fileRec.hotel, bureau: fileRec.bureau } : { hotel: last.hotel, bureau: last.bureau }
  if (fileRec && (final.hotel !== last.hotel || final.bureau !== last.bureau)) states.push({ hotel: final.hotel, bureau: final.bureau, reached: reachIndex(fileRec.reached) })
  const written = states.some((s) => s.hotel.trim() || s.bureau.trim()) || !!(final.hotel.trim() || final.bureau.trim())

  const parts = (s) => ({ hotel: partsOf(s.hotel), bureau: partsOf(s.bureau) })
  const finalParts = parts(final)
  const all = states.map((s) => ({ ...parts(s), reached: s.reached }))
  // her notes as they stood before the second break came on her screen
  const early = states.filter((s) => s.reached < 2).pop() || { hotel: '', bureau: '' }
  const earlyParts = parts(early)

  const bureau = finalParts.bureau
  const hotel = finalParts.hotel
  const goingAfter = !written ? null
    : (bureau.has('voice') || bureau.has('saw')) && !bureau.has('towels') ? 'sofia'
    : bureau.has('towels') && !bureau.has('voice') && !bureau.has('saw') ? 'locked'
    : bureau.has('towels') ? 'both'
    : bureau.has('request') ? 'request' : 'neither'
  const hotelRow = !written ? null : (hotel.has('voice') || hotel.has('saw')) ? 'letIn' : final.hotel.trim() ? 'keptOut' : 'empty'

  // the schedule: from every version of her Bureau note
  let schedule = null
  if (written) {
    const seen = all.filter((s) => s.bureau.has('schedule'))
    schedule = !seen.length ? 'never' : seen.some((s) => s.reached < 3) ? 'before' : 'after'
  }

  // her changes: moved, cut, added or first words
  let changes = null
  let moved = null
  let cut = null
  if (written) {
    const chain = [...all, { ...finalParts, reached: 4 }]
    const other = { hotel: 'bureau', bureau: 'hotel' }
    for (const from of ['hotel', 'bureau']) {
      for (const part of PARTS) {
        const wasIn = chain.findIndex((s) => s[from].has(part))
        if (wasIn === -1 || finalParts[from].has(part)) continue
        const to = other[from]
        const later = chain.findIndex((s, i) => i > wasIn && s[to].has(part))
        if (later !== -1) {
          if (!moved || later < moved.at) moved = { part, from, to, at: later }
        } else if (later === -1) {
          const leftAt = chain.findIndex((s, i) => i > wasIn && !s[from].has(part))
          if (!cut || leftAt < cut.at) cut = { part, from, at: leftAt }
        }
      }
    }
    const first = { hotel: new Set(), bureau: new Set() }
    for (const f of ['hotel', 'bureau']) for (const s of chain) if (s[f].size) { first[f] = s[f]; break }
    const keptAll = ['hotel', 'bureau'].every((f) => [...first[f]].every((p) => finalParts[f].has(p)))
    const grew = ['hotel', 'bureau'].some((f) => finalParts[f].size > first[f].size)
    changes = moved ? 'moved' : cut ? 'cut' : keptAll && grew ? 'added' : 'first'
  }

  // up to two pulls, each part once, in the answer sheet's order
  const pulls = []
  if (written) {
    const inHotel = hotel.has('voice') || hotel.has('saw')
    const inEither = bureau.has('voice') || bureau.has('saw') || inHotel
    if (inHotel) pulls.push('voiceIn')
    else if (!inEither) pulls.push('voiceOut')
    if (!bureau.has('towels')) pulls.push('towelsOut')
    if (!bureau.has('schedule')) pulls.push('scheduleOut')
    if (!hotel.has('request')) pulls.push('requestOut')
    if (!hotel.has('lock') || !hotel.has('towels')) pulls.push('checksOut')
  }

  // the move the first question asks about
  let ask = null
  if (written) {
    if (hotel.has('voice') || hotel.has('saw')) ask = { kind: 'letIn', part: hotel.has('voice') ? 'voice' : 'saw' }
    else if (moved) ask = { kind: 'moved', ...moved }
    else if (cut) ask = { kind: 'cut', ...cut }
    else { const p = PARTS.find((x) => bureau.has(x)); if (p) ask = { kind: 'first', part: p } }
  }
  return { gameEver, written, final, finalParts, earlyParts, all, goingAfter, hotelRow, schedule, changes, moved, cut, pulls: pulls.slice(0, 2), ask }
}

const GOING = {
  sofia: (a) => [`Your Bureau note held ${list(['voice', 'saw'].filter((p) => a.finalParts.bureau.has(p)).map((p) => NAME[p]))}: you are chasing her night.`, 'Sofia herself thought the room had been assigned in error.'],
  locked: () => ['Your filed Bureau note held the towels inside, so you chase the one fact the checks cannot square.', 'The hotel’s books agreed: no keycard all season.'],
  both: () => ['Your Bureau note held the towels inside with the voice or what Sofia saw, so you are chasing the whole night, felt and found.', 'One report sentence held both: the corridor felt unusually busy despite no guests being present.'],
  request: () => ['You gave the Bureau only the request: you are going after where the night began.', 'The report never closed it either.'],
  neither: () => ['Your Bureau note held none of the night’s strange parts, so you are going after an account the hotel’s own checks can close.', 'The report ends there too, with no further inquiry requested.'],
}
const HOTEL = {
  keptOut: () => ['You gave the hotel’s record only what the hotel itself can stand behind.', 'The hotel’s own statuses stopped there too, marking the room serviced and its occupancy pending.'],
  letIn: (a) => [`Your hotel’s note held ${list(['voice', 'saw'].filter((p) => a.finalParts.hotel.has(p)).map((p) => NAME[p]))}, a sign you take a witness at her word.`, 'The report did too: calm, male, 30 to 40.'],
  empty: () => ['You filed the hotel’s record empty, suggesting you write nothing there until something is certain.', 'The room’s occupancy stayed pending too.'],
}
const SCHEDULE = {
  before: () => ['The schedule reached your Bureau note before the league’s announcement: you see where a detail points before anyone confirms it.', 'The schedule itself pointed ahead, under the heading Tomorrow.'],
  after: () => ['You noted the schedule only after the announcement, a sign you wait for predictions to come true.', 'Even then, the league cited only operational considerations.'],
  never: () => ['The schedule never reached your Bureau note, as though you file only the past.', 'To the report, it was one more bedside item.'],
}
const CHANGES = {
  moved: (a) => [`You moved ${NAME[a.moved.part]} from your ${FILE_NAME[a.moved.from]} note to your ${FILE_NAME[a.moved.to]} note; you change your mind about which file should hold a fact.`, 'The report crossed over too, headed Matchday Accommodation Unit and filed by the Bureau.'],
  cut: (a) => [`${NAME[a.cut.part][0].toUpperCase()}${NAME[a.cut.part].slice(1)} left your ${FILE_NAME[a.cut.from]} note, suggesting you make room for what matters more.`, 'Engineering’s findings were as short: dry bathroom, made bed.'],
  added: () => ['Your notes kept every part they first held and gained more, which suggests you build on your first account and keep all of it.', 'The report grew that way too: three checks followed Sofia’s statement, and none replaced it.'],
  first: () => ['Your notes never changed; what you write, it seems, you let stand.', 'The hotel let its own word stand too: Room 912 remains unavailable for booking.'],
}

function readingParagraphs(a, level) {
  if (!a.gameEver) return ['You read the report without the game. The game asks you to keep two files on one night, the hotel’s record and the Bureau of Unfiled Incidents, in up to twelve words each, and to update them at two breaks in the report.']
  if (!a.written) return ['You turned the game on and wrote nothing in either note.']
  const rows = [GOING[a.goingAfter](a), HOTEL[a.hotelRow](a), SCHEDULE[a.schedule](a)]
  if (level >= 0) rows.push(CHANGES[a.changes](a))
  return rows.map(([did, meets]) => `${did} ${meets}`)
}

function drawing(a) {
  const cells = DRAWN.map((part) => ({
    part, name: NAME[part],
    hotel: a.finalParts.hotel.has(part) ? 'dot' : a.all.some((s) => s.hotel.has(part)) ? 'ring' : null,
    bureau: a.finalParts.bureau.has(part) ? 'dot' : a.all.some((s) => s.bureau.has(part)) ? 'ring' : null,
    hotelBand: HOTEL_BAND.includes(part), bureauBand: true,
  }))
  const dots = cells.flatMap((c) => [c.hotel === 'dot' ? c : null, c.bureau === 'dot' ? c : null]).filter(Boolean)
  const off = cells.filter((c) => c.hotel === 'dot' && !c.hotelBand)
  const rings = cells.filter((c) => c.hotel === 'ring' || c.bureau === 'ring')
  let sentence
  if (!a.gameEver) sentence = 'Both files stand empty, and the pale bands show where each part can go.'
  else if (!dots.length) sentence = 'Your files stand empty, and the bands show where each part can go.'
  else {
    const total = cells.reduce((n, c) => n + (c.hotel === 'dot') + (c.bureau === 'dot'), 0)
    if (off.length) sentence = `Your marks sit on the bands, except ${list(off.map((c) => `${c.name} on the hotel’s record`))}.`
    else sentence = total === 1 ? 'Your mark sits on its band.' : 'Every mark sits on a band.'
    if (rings.length) sentence = sentence.replace(/\.$/, '') + (rings.length === 1 ? `, with a faint ring for ${rings[0].name}.` : ', with faint rings.')
    if (words(sentence) > 14) sentence = sentence.replace(/, with a faint ring for .*\.$/, ', with a faint ring.')
    if (words(sentence) > 14 && off.length) sentence = 'Your marks sit on the bands, except one.'
  }
  return { cells, sentence }
}

// each pull is what may have led her, then where it meets the article
function pullText(a, pull) {
  const q = (file, part) => quoteOf(a.final[file], part)
  switch (pull) {
    case 'voiceIn': return [`Your “${quoteOf(a.final.hotel, a.finalParts.hotel.has('voice') ? 'voice' : 'saw')}” may come from Sofia, the hotel’s own attendant, whose word can read as the hotel’s own.`, 'Engineering found the room dark.']
    case 'voiceOut': return [`A calm voice answering through a door can sound like any guest’s, which may have kept it from your “${q('bureau')}” note.`, 'Engineering found the room dark.']
    case 'towelsOut': return [`Each check is in order on its own, so the towels inside may not seem strange, which may have kept them from your “${q('bureau')}” note.`, 'Security found the towels gone from outside the door.']
    case 'scheduleOut': return ['Engineering found the schedule like everything else, so it may read as one more check.', 'It was laid out exactly like the visiting club’s schedule.']
    case 'requestOut': return [`A towel request looks routine, a line not worth filing, which may have kept it from your “${q('hotel')}” note.`, 'The room it came from is blocked from guests on football weekends.']
    default: return ['The checks may seem to add nothing the hotel did not already know.', 'Security found the towels gone from outside the door.']
  }
}

function filesParagraphs(a, opts) {
  const pulls = a.gameEver && a.written && opts.pulls ? a.pulls : []
  const text = (p) => { const [why, meets] = pullText(a, p); return opts.meets ? `${why} ${meets}` : why }
  const first = ['voiceIn', 'voiceOut', 'requestOut'].filter((p) => pulls.includes(p)).map(text)
  const second = ['towelsOut', 'scheduleOut', 'checksOut'].filter((p) => pulls.includes(p)).map(text)
  const p1 = [
    `At the first break${a.gameEver ? '' : ', after Sofia’s statement'}, the request belongs on the hotel’s record: Housekeeping received it and Reception confirmed the room vacant. The Bureau may hold it too.`,
    'The voice and what Sofia saw belong in the Bureau: only Sofia heard the voice and made way for people passing, while the hotel’s own camera showed the corridor empty.',
    ...first,
  ]
  const p2 = [
    'At the second break, the hotel’s record takes the lock, with no entry in 137 days, and the towels inside, which Engineering found on the rack.',
    'The Bureau takes the towels inside a room nobody entered, and the schedule with its 13:00 kick-off for a 20:00 match. It may hold the lock too.',
    ...second,
  ]
  return [p1.join(' '), p2.join(' ')]
}

function ending(a) {
  return `At 08:00 the next morning, the league brought kick-off forward to 13:00, and the visiting club’s revised schedule matched ${a.finalParts.bureau.has('schedule') ? 'the one in your Bureau note' : 'Room 912’s exactly'}.`
}

function questions(a) {
  const out = []
  if (a.gameEver) {
    if (!a.written) out.push('So what kept both your notes empty until you filed?')
    else if (a.ask) {
      const k = a.ask
      if (k.kind === 'letIn') out.push(`So what put ${NAME[k.part]} on the hotel’s record?`)
      else if (k.kind === 'moved') out.push(`So why move ${NAME[k.part]} into the ${k.to === 'bureau' ? 'Bureau' : 'hotel’s record'}?`)
      else if (k.kind === 'cut') out.push(`So why take ${NAME[k.part]} out of your ${FILE_NAME[k.from]} note?`)
      else out.push(`So what sent ${NAME[k.part]} to the Bureau?`)
    }
  }
  out.push('What have you seen or heard that no record of yours shows?')
  return out
}

// the sheet's own ways to fit 300 words, in order: drop the pattern on her changes and fold how the story ends into item 3, then
// keep each pull's reasoning without where it meets the article, then drop the pulls
const LEVELS = [
  { changes: true, mergeEnd: false, meets: true, pulls: true },
  { changes: false, mergeEnd: true, meets: true, pulls: true },
  { changes: false, mergeEnd: true, meets: false, pulls: true },
  { changes: false, mergeEnd: true, meets: false, pulls: false },
]

function compose(a, opts) {
  const reading = readingParagraphs(a, opts.changes ? 1 : -1)
  const draw = drawing(a)
  const files = filesParagraphs(a, opts)
  const end = ending(a)
  const qs = questions(a)
  const joined = opts.mergeEnd ? [files[0], `${files[1]} ${end}`] : files
  const parts = [...reading, draw.sentence, ...joined, ...(opts.mergeEnd ? [] : [end]), ...qs]
  return { reading, drawing: draw, files: joined, ending: opts.mergeEnd ? null : end, questions: qs, text: parts.join(' ') }
}

const FORBIDDEN = /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i

function generateFilesReceipt(body) {
  const events = validateFilesRequest(body)
  const a = analyze(events)
  let made
  for (const opts of LEVELS) {
    made = compose(a, opts)
    if (words(made.text) <= MAX_WORDS && sentenceWords(made.text).every((n) => n <= MAX_SENTENCE)) break
  }
  if (FORBIDDEN.test(made.text)) throw httpError(502, 'The receipt could not be written. Please retry.')
  return { kind: 'files', reading: made.reading, drawing: made.drawing, files: made.files, ending: made.ending, questions: made.questions, words: words(made.text) }
}

module.exports = { generateFilesReceipt, validateFilesRequest, analyze, compose, partsOf }
