const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateHoldReceipt, validateHoldRequest, judgeHold, habitOf } = require('../src/services/holdReceipt');
const { HOLD_DATA } = require('../src/lib/holdData');

const release = (week) => ({ action: 'release', week });
const end = { action: 'end', week: 0 };
const text = (r) => [r.habitText, r.confidence, ...r.stories.flatMap((s) => s.lines), ...r.questions].join(' ');
const FORBIDDEN = /\b(right|wrong|correct|incorrect|mistake|failed)\b|!/i;

test('a reader who played nothing gets no pattern and three skipped years', () => {
  const r = generateHoldReceipt({ holds: {} });
  assert.equal(r.kind, 'hold');
  assert.equal(r.habit, 'none');
  assert.equal(r.stories.length, 3);
  assert.ok(r.stories.every((s) => !s.played && /skipped this year/.test(s.lines.join(' '))));
  assert.equal(r.marks.length, 3);
  assert.equal(r.questions.length, 3);
});

test('holding every year to the full stop reads as sitting still', () => {
  const r = generateHoldReceipt({ holds: { h1: end, h2: end, h3: end } });
  assert.equal(r.habit, 'still');
  assert.match(r.habitText, /sat still/);
  assert.ok(r.stories.every((s) => s.judged.acted === false));
});

test('letting go in every year reads as letting go every time', () => {
  const r = generateHoldReceipt({ holds: { h1: release(5), h2: release(10), h3: release(20) } });
  assert.equal(r.habit, 'every');
  assert.match(r.confidence, /keep moving money/);
});

test('letting go only while the money falls reads as following the price', () => {
  // h1 fell below the start by week 5; h2 rose above it by week 10; she lets go in the fall and holds the rise
  const r = generateHoldReceipt({ holds: { h1: release(5), h2: end } });
  assert.equal(HOLD_DATA.h1.weeks[5][2] < HOLD_DATA.h1.weeks[0][2], true);
  assert.equal(r.habit, 'price');
});

test('a release is judged against where the share stood, not the price', () => {
  // h1 week 5: ₹71,900 abroad and 12.0 per cent, inside 10 to 15, so the rule said hold
  const j = judgeHold('h1', release(5));
  assert.equal(j.acted, true);
  assert.equal(j.leftRange, false);
  assert.equal(j.ruleAsked, 'wait');
  assert.equal(j.fits, false);
  const r = generateHoldReceipt({ holds: { h1: release(5) } });
  assert.match(r.stories[0].lines.join(' '), /inside that range, so the rule said hold/);
});

test('a hold that reaches the end where the share never left the range fits the rule', () => {
  const j = judgeHold('h3', end);
  assert.equal(j.acted, false);
  assert.equal(typeof j.firstOut === 'object' || j.firstOut === null, true);
});

test('habitOf covers each word', () => {
  assert.equal(habitOf([]), 'none');
  const fit = { fits: true, acted: true, priceMove: 'fall' };
  assert.equal(habitOf([fit]), 'range');
  assert.equal(habitOf([{ fits: false, acted: false, priceMove: 'rise' }, { fits: false, acted: true, priceMove: 'fall' }]), 'price');
  assert.equal(habitOf([{ fits: false, acted: true, priceMove: 'rise' }, { fits: false, acted: false, priceMove: 'fall' }]), 'rises');
  assert.equal(habitOf([{ fits: false, acted: true, priceMove: 'fall' }, { fits: false, acted: false, priceMove: 'fall' }]), 'mixed');
});

test('the receipt never says right or wrong and keeps its sentences short', () => {
  for (const holds of [{}, { h1: release(5), h2: end, h3: release(30) }, { h1: end, h2: end, h3: end }]) {
    const r = generateHoldReceipt({ holds });
    assert.doesNotMatch(text(r), FORBIDDEN);
    for (const s of text(r).split(/(?<=[.?!])\s+/)) assert.ok(s.split(/\s+/).length <= 60, s);
  }
});

test('the request is checked', () => {
  assert.throws(() => validateHoldRequest({}), /Provide the holds/);
  assert.throws(() => validateHoldRequest({ holds: { h1: { action: 'release', week: 0 } } }), /release in a week/);
  assert.throws(() => validateHoldRequest({ holds: { h1: { action: 'release', week: 9999 } } }), /release in a week/);
  assert.throws(() => validateHoldRequest({ holds: { h1: { action: 'tap', week: 3 } } }), /release in a week/);
  const clean = validateHoldRequest({ holds: { h1: { action: 'end', week: 3 }, h9: release(2), h2: release(4) } });
  assert.deepEqual(clean, { h1: { action: 'end', week: HOLD_DATA.h1.weeks.length - 1 }, h2: { action: 'release', week: 4 } });
});
