const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateCupsReceipt } = require('../src/services/cupsReceipt');

const game = (on) => ({ type: 'game', on });
const cup = (seatId, reached, ms) => ({ type: 'cup', seatId, reached, ms });
const back = (seatId, reached, ms) => ({ type: 'back', seatId, reached, ms });
// the test readers from the answer sheet's test file
const early = [game(true), cup('s2', 's2', 10000), cup('s3', 's3', 30000), cup('s4', 's4', 50000), cup('s6', 's6', 70000)];
const late = [game(true), cup('s1', 's1', 10000), cup('s3', 's3', 30000), cup('s3', 's3', 31000), back('s3', 's7', 90000), cup('s7', 's7', 92000)];
const third = [game(true), cup('s2', 's2', 10000), back('s2', 's2', 20000), cup('s4', 's4', 21000), cup('s5', 's5', 40000), back('s4', 's7', 90000)];
const text = (r) => [...r.reading, r.drawing.sentence, ...r.seats, r.tree, ...r.questions].join(' ');

test('the early spender: the strangers, as she went, spread, first choices', () => {
  const r = generateCupsReceipt({ events: early });
  const reading = r.reading.join(' ');
  assert.match(reading, /ended with the strangers/);
  assert.match(reading, /before you had read as far as the Peepal tree/);
  assert.match(reading, /four different seats/);
  assert.match(reading, /You took no cup back/);
  assert.equal(r.drawing.sentence, 'Your cups all sit above the Peepal tree’s pale band.');
  assert.equal(r.questions[0], 'So what was it about Buntu that made him the one to get your very first cup?');
  assert.match(r.tree, /You set no cup beside the Peepal tree/);
});

test('the late convert: close to home on a tie, both, kept some, onto the tree', () => {
  const r = generateCupsReceipt({ events: late });
  const reading = r.reading.join(' ');
  assert.match(reading, /The first of your cups to reach its last seat went to Mohan/);
  assert.match(reading, /your third cup after/);
  assert.match(reading, /you kept one/);
  assert.match(reading, /moving a cup onto the Peepal tree/);
  assert.equal(r.questions[0], 'So what made you move your third cup to the Peepal tree?');
  assert.match(r.seats[1], /You took the third back when you reached the Peepal tree, and set it there/);
  assert.match(r.drawing.sentence, /faint outline/);
});

test('the third reader: changed her mind twice, both about people; the cup taken back and kept', () => {
  const r = generateCupsReceipt({ events: third });
  assert.match(r.reading.join(' '), /twice, both times about people/);
  assert.equal(r.questions[0], 'So, once you got to the Peepal tree, what made you take your first cup back from the travellers and keep it?');
});

test('a reader who never turned the game on, and one who turned it on and set nothing', () => {
  const plain = generateCupsReceipt({ events: [] });
  assert.match(plain.reading[0], /read the story without the game/);
  assert.equal(plain.seats.length, 0);
  assert.equal(plain.questions.length, 1);
  assert.match(plain.tree, /^At the old Peepal tree, the promise came true/);
  const kept = generateCupsReceipt({ events: [game(true)] });
  assert.match(kept.reading[0], /kept all four cups/);
  assert.equal(kept.questions[0], 'What kept your four cups with you?');
});

test('a cup taken back within three seconds, or set again where it left, is a slip', () => {
  const quick = generateCupsReceipt({ events: [game(true), cup('s1', 's1', 10000), back('s1', 's1', 11000)] });
  assert.match(quick.reading[0], /kept all four cups/);
  const undone = generateCupsReceipt({ events: [game(true), cup('s1', 's1', 10000), back('s1', 's1', 20000), cup('s1', 's1', 25000)] });
  assert.match(undone.reading.join(' '), /You took no cup back/);
});

test('every receipt stays inside the rules: 450 words, no sentence past 40, no judging words', () => {
  const seats = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
  for (let i = 0; i < 400; i += 1) {
    const events = [game(true)];
    let ms = 1000;
    const placed = [];
    for (let j = 0; j < (i % 12); j += 1) {
      ms += 4000 + ((i * 7919 + j * 104729) % 30000);
      const reached = `s${Math.min(7, (i + j) % 8)}`;
      if (placed.length < 4 && (i + j) % 3) { const s = seats[(i * 3 + j * 5) % 7]; placed.push(s); events.push(cup(s, reached, ms)); }
      else if (placed.length) { const s = placed.splice((i + j) % placed.length, 1)[0]; events.push(back(s, reached, ms)); }
    }
    const r = generateCupsReceipt({ events });
    const all = text(r);
    assert.ok(all.split(/\s+/).length <= 450, `${all.split(/\s+/).length} words`);
    for (const sentence of all.split(/(?<=[.?!])\s+/)) assert.ok(sentence.split(/\s+/).length <= 40);
    assert.doesNotMatch(all, /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i);
  }
});

test('rejects records that do not name a seat and a time', () => {
  assert.throws(() => generateCupsReceipt({ events: [{ type: 'cup', seatId: 'x', reached: 's1', ms: 1 }] }), { status: 400 });
  assert.throws(() => generateCupsReceipt({}), { status: 400 });
});
