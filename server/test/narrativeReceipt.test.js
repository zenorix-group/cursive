const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeNarrative, checkProse } = require('../src/services/narrativeReceipt');
const { analyzeLift } = require('../src/services/liftReceipt');

const lines = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, text: `line ${id}` }));
const details = {
  1: { theory: 'atmosphere' }, 2: { theory: 'atmosphere' }, 3: { theory: 'provenance' }, 4: { theory: 'knowledge' }, 5: { theory: 'demeanour' },
  6: { theory: 'urgency' }, 7: { theory: 'credential request' }, 8: { theory: 'demeanour' }, 9: { theory: 'atmosphere' },
};
const targets = [{ id: 1, letter: 'A', lineId: 4 }, { id: 2, letter: 'B', lineId: 3 }, { id: 3, letter: 'C', lineId: 6 }];
const lift = (progress) => ({ ...analyzeLift(progress, targets, lines, details), selectedIds: progress.selectedIds });
const q = (id, label, outcome, text = 'a question') => ({ id, text, label, outcome });

test('the person-watcher from the test example: the person leads, one reason left behind, three picked up', () => {
  const questions = [q(1, 'who', 'answered'), q(2, 'source', 'open'), q(3, 'who', 'match')];
  const result = analyzeNarrative(questions, lift({ selectedIds: [2, 4, 5, 7, 8], answers: { 1: 4, 2: 5, 3: 7 } }), lines, details);
  assert.equal(result.lead, 'person');
  assert.deepEqual(result.carried, ['person']);
  assert.deepEqual(result.leftBehind, ['source']);
  assert.deepEqual(result.pickedUp, ['step', 'particulars', 'sense']);
  assert.equal(result.pattern, 1); // the first story was waiting on the "who" question; no paragraph reaches for a demeanour line
  assert.equal(result.nothingCarried, false);
});

test('a tie on moves goes to pattern recognition, then to the earliest question', () => {
  // source and clock: one question and one line each; the clock line is the one its paragraph reaches for
  const questions = [q(1, 'source', 'open'), q(2, 'next', 'open'), q(3, 'none', 'skipped', '')];
  const byPattern = analyzeNarrative(questions, lift({ selectedIds: [3, 6], answers: { 3: 6 } }), lines, details);
  assert.equal(byPattern.lead, 'clock');
  const byEarliest = analyzeNarrative(questions, lift({ selectedIds: [3, 6], answers: {} }), lines, details);
  assert.equal(byEarliest.lead, 'source');
});

test('with nothing carried the lead is the reason behind most questions, and a skip on it is noted', () => {
  const questions = [q(1, 'who', 'open'), q(2, 'who', 'open'), q(3, 'none', 'skipped', '')];
  const result = analyzeNarrative(questions, lift({ selectedIds: [6], answers: {} }), lines, details);
  assert.equal(result.nothingCarried, true);
  assert.equal(result.lead, 'person');
  assert.deepEqual(result.skips.map((skip) => skip.story), ['first']); // the third marker is about who carries out the handover
});

test('it is not offered without a readable question or a marked line', () => {
  assert.throws(() => analyzeNarrative([q(1, 'none', 'skipped', ''), q(2, 'none', 'skipped', ''), q(3, 'none', 'skipped', '')], lift({ selectedIds: [5], answers: {} }), lines, details), /at least one question/);
  assert.throws(() => analyzeNarrative([q(1, 'who', 'open'), q(2, 'none', 'skipped', ''), q(3, 'none', 'skipped', '')], lift({ selectedIds: [], answers: {} }), lines, details), /at least one question/);
});

test('the prose check catches rule breaks', () => {
  assert.deepEqual(checkProse({ reasoning: 'In both games you looked for *who signs the order*.', closingQuestion: 'Is there someone to hold to account?' }, 140), []);
  assert.ok(checkProse({ reasoning: 'You were right about Q1!', closingQuestion: 'Well.' }, 140).length >= 4);
});
