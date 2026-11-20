const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateHighlightsReceipt, analyze, check, drawing, listSubject, present, serverSections, validateHighlightsRequest } = require('../src/services/highlightsReceipt');

const mark = (sentenceId, action = 'mark') => ({ type: 'mark', sentenceId, action });
const offer = (...pairs) => ({ type: 'offer', words: pairs.map(([word, sentenceId]) => ({ word, sentenceId })) });
const keep = (word, sentenceId, action = 'keep') => ({ type: 'keep', word, sentenceId, action });
const line = (text, wordA, wordB) => ({ type: 'line', text, wordA, wordB });
const clean = (events) => validateHighlightsRequest({ events });

// the test readers from the second-draft answer sheet
const A = clean([mark('S2'), mark('S3'), mark('S4'), mark('S9'),
  offer(['voice', 'S2'], ['writing', 'S3'], ['work', 'S4'], ['pen', 'S9'], ['planet', 'S2'], ['citizens', 'S3']),
  keep('pen', 'S9'), keep('planet', 'S2'),
  line('A pen cannot save the planet, but it can make someone look.', 'pen', 'planet')]);
const B = clean([...['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S9', 'S10', 'S13'].map((id) => mark(id)), mark('S6', 'unmark'),
  offer(['words', 'S1'], ['voice', 'S2'], ['writing', 'S3'], ['oceans', 'S5'], ['drawers', 'S7'], ['pens', 'S10']),
  keep('voice', 'S2'), keep('drawers', 'S7'), keep('voice', 'S2', 'release'), keep('writing', 'S3'),
  line('I have been writing in secret, and my drawers are full.', 'drawers', 'writing')]);
const D = clean([mark('S7'), mark('S12'),
  offer(['texts', 'S7'], ['prizewinners', 'S12'], ['drawers', 'S7'], ['Paris', 'S12']),
  keep('drawers', 'S7'), keep('Paris', 'S12'),
  line('I left my drawers behind in Paris.', 'drawers', 'Paris')]);

test('reader A: every mark is one of the four, her habit is the joins, nothing let go', () => {
  const a = analyze(A);
  assert.deepEqual(a.marks, ['S2', 'S3', 'S4', 'S9']);
  assert.equal(a.coverage, 1);
  assert.equal(a.precision, 1);
  assert.equal(a.habit.id, 'joins');
  assert.deepEqual([a.letGo, a.released, a.passed.map((p) => p.word)], [[], [], ['voice', 'writing', 'work', 'citizens']]);
  assert.deepEqual(a.kept.map((k) => k.word), ['pen', 'planet']);
  assert.equal(a.lineHasWords, true);
  assert.equal(a.cap, 250);
});

test('reader B: nine marks, one let go, S5 left out of precision, habit is writing, voice released', () => {
  const a = analyze(B);
  assert.equal(a.marks.length, 9);
  assert.deepEqual(a.letGo, ['S6']);
  assert.equal(a.coverage, 1);
  assert.equal(a.precision, 0.5);
  assert.equal(a.habit.id, 'writing');
  assert.deepEqual(a.released.map((r) => r.word), ['voice']);
  assert.deepEqual(a.kept.map((k) => k.word), ['drawers', 'writing']);
  assert.deepEqual(a.passed.map((p) => p.word), ['words', 'oceans', 'pens']);
  assert.equal(a.cap, 300);
  assert.equal(listSubject('oceans', 'S5'), 'earth');
});

test('reader D: marks outside the four, habit is objects and places, nothing counted', () => {
  const a = analyze(D);
  assert.equal(a.coverage, 0);
  assert.equal(a.precision, 0);
  assert.equal(a.habit.id, 'things');
  assert.equal(listSubject('Paris', 'S12'), 'neither');
  assert.equal(listSubject('future', 'S9'), 'earth');
  assert.equal(listSubject('future', 'S3'), 'neither');
});

test('a reader with one mark has no single habit, and went-back marks are found', () => {
  assert.equal(analyze(clean([mark('S7')])).habit, null);
  const back = analyze(clean([mark('S9'), mark('S2')]));
  assert.deepEqual(back.wentBack, [{ to: 'S2', after: 'S9' }]);
});

test('a kept word counts in any inflected form', () => {
  assert.ok(present('my drawer is full', 'drawers'));
  assert.ok(present('Pens everywhere', 'pen'));
  assert.ok(!present('a pencil', 'pen'));
});

test('the drawing shows the thirteen sentences in page order with her states', () => {
  const d = drawing(analyze(B));
  assert.equal(d.rows.length, 13);
  assert.equal(d.rows[5].state, 'letgo');
  assert.equal(d.rows[5].tag, 'sounds important · let go');
  assert.equal(d.rows[4].tag, 'lists the subjects · arguable');
  assert.deepEqual(d.words.map((w) => w.state), ['passed', 'released', 'kept', 'passed', 'kept', 'passed']);
  assert.equal(d.rows[1].four, true);
});

const good = {
  holds: 'both', weight: 'both', broughtWord: '', wordsInLine: [{ word: 'pen', subject: 'writing' }, { word: 'planet', subject: 'earth' }],
  line: [{ text: 'Your line reads “A pen cannot save the planet, but it can make someone look.”', type: 'reasoning' }, { text: 'Strike pen and the line no longer says what cannot save the planet.', type: 'reasoning' }],
  confidence: 'Climate fiction is a label for stories shaped by a changing climate.',
};
const ok = (extra = {}) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...good, ...extra }) }] } }] }) });

test('a receipt keeps the four, the drawing and an unverified note', async () => {
  process.env.GEMINI_API_KEY = 'test';
  const r = await generateHighlightsReceipt({ events: A }, ok());
  assert.equal(r.refused, false);
  assert.deepEqual(r.sections.map((s) => s.id), ['pattern', 'four', 'pair', 'line']);
  assert.match(r.sections[2].sentences.join(' '), /You kept pen, from the president’s claim, and planet, from the invitation to every author\./);
  assert.match(r.sections[2].sentences.join(' '), /the word pen carries writing, and the word planet carries the earth/);
  assert.equal(r.four.length, 4);
  assert.match(r.four[0].text, /You marked it\.$/);
  assert.equal(r.confidence.source, 'unverified');
  assert.equal(r.confidence.topic, 'Climate fiction as a category, and the different arguments people make about it.');
  assert.equal(r.infographic.rows.length, 13);
});

test('the sheet’s rules: forbidden words, article quotes, sentence numbers and her exact line', () => {
  const a = analyze(A);
  const bad = (text) => check({ pattern: [], pulls: [], pair: [] }, a, [...good.line, { text, type: 'reasoning' }]).problems;
  assert.ok(bad('Your marks were right.').length);
  assert.ok(bad('Your line shows great reach.').length);
  assert.ok(bad('You marked S2 first.').length);
  assert.ok(bad('You marked “texts are still asleep in notebooks”.').length);
  assert.ok(bad('You marked three of the four.').length);
  assert.ok(bad('You marked the next sentence.').length);
  assert.deepEqual(bad('Your line sits where the word “while” ties the themes together.'), []);
  assert.ok(check({ pattern: [], pulls: [], pair: [] }, a, [{ text: 'Your line reads something else.', type: 'reasoning' }]).problems.length);
  assert.equal(check({ pattern: [], pulls: [], pair: [] }, a, [{ text: `Your line reads “${a.line}”.`, type: 'reasoning' }]).list[0].text, `Your line reads “${a.line}”`);
});

test('the server’s own sentences name each point once in full, then briefly, and stay within the limits', () => {
  const inLine = [{ word: 'drawers', subject: 'neither' }, { word: 'writing', subject: 'writing' }];
  for (const events of [A, B, D]) {
    const a = analyze(events);
    const sections = serverSections(a, inLine);
    const { problems, list } = check(sections, a, [{ text: `Your line reads “${a.line}”.`, type: 'reasoning' }]);
    assert.deepEqual(problems, []);
    assert.ok(list.every((s) => s.text.split(/\s+/).length <= 40));
    assert.ok(list.reduce((n, s) => n + s.text.split(/\s+/).length, 0) <= a.cap);
  }
  const b = serverSections(analyze(B), inLine);
  assert.match(b.pattern[0], /^Your marks followed writing, with or without the earth\.$/);
  assert.match(b.pattern[1], /^You marked the prize as a channel for expression and a celebration of creativity, then let it go\.$/);
  assert.match(b.pulls.join(' '), /defensible call in marking the environmental subjects/);
  assert.match(b.pair.join(' '), /You passed over oceans, a word that carries the earth\./);
  assert.ok(b.pulls.every((t) => !/notebooks line/.test(t)));
  const d = serverSections(analyze(D), [{ word: 'drawers', subject: 'neither' }, { word: 'Paris', subject: 'neither' }]);
  assert.match(d.pattern[0], /objects and places/);
  assert.match(d.pair.join(' '), /You passed over texts, a word that carries writing\./);
});

test('the word limit and the judgment ratio are met by trimming, and a failure is never first', () => {
  const a = analyze(A);
  const long = Array.from({ length: 40 }, (_, i) => `You marked a thing in your reading, number ${i} on the page, and the page took it in plain words.`);
  const { list } = check({ pattern: ['Your marks followed the joins.'], pulls: long, pair: [] }, a, good.line);
  assert.ok(list.reduce((n, s) => n + s.text.trim().split(/\s+/).length, 0) <= 250);
  assert.ok(list.some((s) => s.text.includes('A pen cannot save')));
  const judged = check({ pattern: ['Your marks followed the joins.'], pulls: [], pair: ['You kept pen, from the president’s claim.'] }, a, [...good.line, { text: 'Your line rests on writing alone.', type: 'failure' }]).list;
  assert.ok(judged.filter((s) => s.type !== 'reasoning').length <= Math.floor(judged.length / 5));
  const first = check({ pattern: [], pulls: [], pair: [] }, a, [{ text: 'Your line rests on writing alone.', type: 'failure' }, ...good.line]).list;
  assert.notEqual(first[0].type, 'failure');
});

test('with fewer than two sentences it refuses in one plain line, and the four still appear', async () => {
  process.env.GEMINI_API_KEY = 'test';
  const r = await generateHighlightsReceipt({ events: [] }, ok({ wordsInLine: [], line: [], holds: 'none', weight: 'none' }));
  assert.equal(r.refused, true);
  assert.equal(r.message, 'There is not enough here to say anything.');
  assert.deepEqual(r.sections.map((s) => s.id), ['four']);
  assert.ok(r.confidence.text);
});

test('a first draft with a forbidden word is sent back once, then passes', async () => {
  process.env.GEMINI_API_KEY = 'test';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    const draft = calls === 1 ? { ...good, line: [...good.line, { text: 'Your line is correct.', type: 'reasoning' }] } : good;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] }) };
  };
  const r = await generateHighlightsReceipt({ events: A }, fetchImpl);
  assert.equal(calls, 2);
  assert.equal(r.refused, false);
});

test('a bad request is refused', () => {
  assert.throws(() => validateHighlightsRequest({ events: 'no' }), /Provide the reading events/);
  assert.deepEqual(validateHighlightsRequest({ events: [{ type: 'mark', sentenceId: 'S99', action: 'mark' }, null] }), []);
});
