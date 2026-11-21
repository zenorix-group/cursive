const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBleedItem } = require('../src/lib/bleed');

test('a news item needs a title and a real web address if it has one', () => {
  assert.equal(validateBleedItem({ kind: 'news', title: '  New issue is out ' }).value.title, 'New issue is out');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', url: 'https://example.org/a' }).value.url, 'https://example.org/a');
  assert.equal(validateBleedItem({ kind: 'news', title: '' }).error.field, 'title');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', url: 'javascript:alert(1)' }).error.field, 'url');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', url: 'not a url' }).error.field, 'url');
});

test('an opportunity names its kind, and only a known kind is accepted', () => {
  assert.equal(validateBleedItem({ kind: 'opportunity', title: 'Essay prize', type: 'competition' }).value.type, 'competition');
  assert.equal(validateBleedItem({ kind: 'opportunity', title: 'Essay prize' }).value.type, 'other');
  assert.equal(validateBleedItem({ kind: 'opportunity', title: 'x', type: 'lottery' }).error.field, 'type');
  assert.equal(validateBleedItem({ kind: 'gossip', title: 'x' }).error.field, 'kind');
});

test('lengths and dates are checked', () => {
  assert.equal(validateBleedItem({ kind: 'news', title: 'a'.repeat(141) }).error.field, 'title');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', summary: 'a'.repeat(401) }).error.field, 'summary');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', endsAt: 'tomorrow-ish' }).error.field, 'endsAt');
  assert.ok(validateBleedItem({ kind: 'news', title: 'x', endsAt: '2027-01-01' }).value.endsAt instanceof Date);
});

test('the public list hides items whose date has passed and shows only public fields', () => {
  const { activeFilter, publicItem } = require('../src/lib/bleed');
  const now = new Date('2026-12-01T00:00:00Z');
  assert.deepEqual(activeFilter(now), { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] });
  const shown = publicItem({ _id: 'abc', kind: 'news', type: '', title: 'T', summary: '', url: '', createdAt: now, endsAt: now, __v: 0, secret: 'x' });
  assert.deepEqual(Object.keys(shown).sort(), ['createdAt', 'id', 'kind', 'summary', 'title', 'type', 'url']);
});
