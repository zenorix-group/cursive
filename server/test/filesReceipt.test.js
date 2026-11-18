const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateFilesReceipt, partsOf } = require('../src/services/filesReceipt');

const game = (on) => ({ type: 'game', on });
const note = (file, text, reached) => ({ type: 'note', file, text, reached });
const filed = (hotel, bureau, reached = 'end') => ({ type: 'file', hotel, bureau, reached });
// the test readers from the answer sheet's test file
const witness = [game(true), note('hotel', 'Guest’s voice answered', 'b1'), note('bureau', 'busy corridor, cctv empty', 'b1'), note('bureau', 'man’s voice, busy corridor, people passing', 'b2'), filed('Guest’s voice answered', 'man’s voice, busy corridor, people passing')];
const clerk = [game(true), note('hotel', 'towel request received, room vacant', 'b1'), note('bureau', 'voice answered, corridor busy', 'b1'), note('hotel', 'towel request received, room vacant; lock history no entry 137 days', 'b2'), note('bureau', 'towels found inside, schedule 13:00 kick-off', 'b2'), filed('towel request received, room vacant; lock history no entry 137 days', 'towels found inside, schedule 13:00 kick-off, voice answered, corridor busy')];
const late = [game(true), note('hotel', 'Man’s voice', 'b1'), note('hotel', 'lock history, towels folded on the rack', 'b2'), note('bureau', 'man’s voice', 'b2'), note('bureau', 'towels inside an empty room, schedule 13:00', 'end'), filed('lock history, towels folded on the rack', 'towels inside an empty room, schedule 13:00')];
const single = [game(true), note('bureau', 'request for towels from blocked room', 'b1'), filed('', 'request for towels from blocked room')];
const all = (r) => [...r.reading, r.drawing.sentence, ...r.files, r.ending, ...r.questions].filter(Boolean).join(' ');

test('the server finds parts by the appendix words', () => {
  assert.deepEqual([...partsOf('Man’s voice, busy corridor')].sort(), ['saw', 'voice']);
  assert.ok(partsOf('towels folded on the rack').has('towels'));
  assert.ok(!partsOf('towel request').has('towels'));
  assert.ok(partsOf('13:00 kick-off').has('schedule'));
  assert.ok(!partsOf('many people').has('voice'));
});

test('the witness: Sofia’s night, let in, never, cut', () => {
  const r = generateFilesReceipt({ events: witness });
  const reading = r.reading.join(' ');
  assert.match(reading, /Your Bureau note held the voice and what Sofia saw: you are chasing her night/);
  assert.match(reading, /Your hotel’s note held the voice, a sign you take a witness at her word/);
  assert.match(reading, /The schedule never reached your Bureau note/);
  assert.equal(r.drawing.sentence, 'Your marks sit on the bands, except the voice on the hotel’s record.');
  assert.equal(r.questions[0], 'So what put the voice on the hotel’s record?');
});

test('the clerk: both, kept out, before the morning', () => {
  const r = generateFilesReceipt({ events: clerk });
  const reading = r.reading.join(' ');
  assert.match(reading, /chasing the whole night, felt and found/);
  assert.match(reading, /only what the hotel itself can stand behind/);
  assert.match(reading, /before the league’s announcement/);
  assert.equal(r.drawing.sentence, 'Every mark sits on a band.');
});

test('the late mover: the locked room, kept out, after the morning, moved', () => {
  const r = generateFilesReceipt({ events: late });
  assert.match(r.reading.join(' '), /held the towels inside, so you chase the one fact the checks cannot square/);
  assert.match(r.reading.join(' '), /only after the announcement/);
  assert.equal(r.questions[0], 'So why move the voice into the Bureau?');
  assert.match(r.drawing.sentence, /faint ring for the voice/);
});

test('the single note: the request, left empty, never, first words', () => {
  const r = generateFilesReceipt({ events: single });
  assert.match(r.reading.join(' '), /You gave the Bureau only the request/);
  assert.match(r.reading.join(' '), /filed the hotel’s record empty/);
  assert.equal(r.questions[0], 'So what sent the request to the Bureau?');
  assert.equal(r.drawing.sentence, 'Your mark sits on its band.');
});

test('a blank page and a plain reader', () => {
  const blank = generateFilesReceipt({ events: [game(true), filed('', '')] });
  assert.equal(blank.reading[0], 'You turned the game on and wrote nothing in either note.');
  assert.equal(blank.questions[0], 'So what kept both your notes empty until you filed?');
  const plain = generateFilesReceipt({ events: [] });
  assert.match(plain.reading[0], /You read the report without the game/);
  assert.equal(plain.questions.length, 1);
});

test('a note is quoted a few words at a time, never whole', () => {
  const r = generateFilesReceipt({ events: witness });
  const text = all(r);
  assert.ok(!text.includes('Guest’s voice answered'.repeat(2)));
  assert.doesNotMatch(text, /man’s voice, busy corridor, people passing/);
});

test('every receipt stays inside the rules: 300 words, no sentence past 40, no judging words', () => {
  const bank = ['towel request', 'voice answered', 'man’s voice', 'busy corridor', 'people passing', 'cctv camera', 'lock history 137 days', 'towels found inside', 'nobody there', 'schedule 13:00 kick-off', 'blocked room vacant'];
  const reach = ['b1', 'b2', 'morning', 'end'];
  for (let i = 0; i < 400; i += 1) {
    const events = [game(true)];
    let hotel = '';
    let bureau = '';
    for (let j = 0; j < (i % 6); j += 1) {
      const file = (i + j) % 2 ? 'hotel' : 'bureau';
      const text = [bank[(i * 3 + j) % 11], bank[(i + j * 5) % 11]].join(', ');
      if (file === 'hotel') hotel = text; else bureau = text;
      events.push(note(file, text, reach[(i + j) % 4]));
    }
    events.push(filed(hotel, bureau));
    const r = generateFilesReceipt({ events });
    const text = all(r);
    assert.ok(text.split(/\s+/).length <= 300, `${text.split(/\s+/).length} words`);
    for (const sentence of text.split(/(?<=[.?!])\s+/)) assert.ok(sentence.split(/\s+/).length <= 40);
    assert.doesNotMatch(text, /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i);
  }
});

test('rejects records that are not notes with a file and text', () => {
  assert.throws(() => generateFilesReceipt({ events: [{ type: 'note', file: 'x', text: 'a', reached: 'b1' }] }), { status: 400 });
  assert.throws(() => generateFilesReceipt({}), { status: 400 });
});
