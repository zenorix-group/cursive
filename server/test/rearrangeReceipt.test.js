const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateRearrangeReceipt } = require('../src/services/rearrangeReceipt');

const tap = (momentId) => ({ type: 'tap', momentId });
const move = (from, to) => ({ type: 'move', from, to });
// the test readers from the answer sheet's test file
const onlooker = [tap('m1'), tap('m2'), tap('m3'), tap('m6')];
const backtracker = [tap('m1'), tap('m2'), tap('m3'), tap('m4'), tap('m5'), move('m4', 'm3'), move('m3', 'm4'), move('m3', 'm2'), move('m3', 'm4')];
const quick = [tap('m2'), move('m2', 'm3'), tap('m5')];
const text = (r) => [...r.reading, r.drawing.sentence, ...r.moments.map((m) => m.text), ...r.ending, ...r.questions].join(' ');

test('the onlooker looked and left, with no row for moves or placement', () => {
  const r = generateRearrangeReceipt({ events: onlooker });
  assert.match(r.reading.join(' '), /made no move/);
  assert.match(r.reading.join(' '), /let the account stand/);
  assert.doesNotMatch(r.reading.join(' '), /Once you decide|second move|match words/);
  assert.equal(r.questions[0], 'So what made you leave the titles just as they started?');
  assert.match(r.ending[0], /the capture/);
  assert.equal(r.drawing.lines.filter((l) => l.belongs).length, 3);
});

test('the backtracker: the frame first, second thoughts, the events', () => {
  const r = generateRearrangeReceipt({ events: backtracker });
  assert.match(r.reading.join(' '), /whole shape before you touch a part/);
  assert.match(r.reading.join(' '), /Your second move reversed your first/);
  assert.match(r.reading.join(' '), /you found it in every paragraph/);
  assert.equal(r.drawing.sentence, 'Your drawing shows your titles where they belong, with nothing beside them.');
  assert.equal(r.questions[0], 'What made you take The Captive off the capture just after putting it there?');
  assert.match(r.ending[0], /the capture/);
});

test('the quick mover: as she went, one move, the words', () => {
  const r = generateRearrangeReceipt({ events: quick });
  assert.match(r.reading.join(' '), /first move after opening only Freedom/);
  assert.match(r.reading.join(' '), /You made one move/);
  assert.match(r.reading.join(' '), /match words in their paragraphs/);
  assert.equal(r.drawing.sentence, 'Your drawing shows Freedom and The Captive in each other’s places.');
  assert.equal(r.questions[0], 'So what made you move Freedom from the battle to the capture?');
  assert.match(r.moments[1].text, /“freedom”/);
});

test('a reader who opened nothing gets no first question', () => {
  const r = generateRearrangeReceipt({ events: [] });
  assert.equal(r.questions.length, 1);
  assert.match(r.reading.join(' '), /without opening a title/);
  assert.match(r.moments[0].text, /The title there was Freedom/);
});

test('every receipt stays inside the rules: 300 words, no sentence past 40, no judging words', () => {
  const kinds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  const mid = ['m2', 'm3', 'm4'];
  for (let i = 0; i < 400; i += 1) {
    const events = [];
    for (let j = 0; j < (i % 11); j += 1) {
      if ((i + j) % 2) events.push(tap(kinds[(i * 7 + j * 3) % 6]));
      else { const from = mid[(i + j) % 3]; events.push(move(from, mid[(i + j + 1 + (i % 2)) % 3] === from ? mid[(i + j + 2) % 3] : mid[(i + j + 1 + (i % 2)) % 3])); }
    }
    const r = generateRearrangeReceipt({ events });
    const all = text(r);
    assert.ok(all.split(/\s+/).length <= 300, `${all.split(/\s+/).length} words`);
    for (const sentence of all.split(/(?<=[.?!])\s+/)) assert.ok(sentence.split(/\s+/).length <= 40);
    assert.doesNotMatch(all, /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i);
  }
});

test('rejects a move that is not a swap of two middle moments', () => {
  assert.throws(() => generateRearrangeReceipt({ events: [move('m2', 'm2')] }), { status: 400 });
  assert.throws(() => generateRearrangeReceipt({ events: [move('m1', 'm2')] }), { status: 400 });
  assert.throws(() => generateRearrangeReceipt({}), { status: 400 });
});
