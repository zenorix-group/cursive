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
  assert.deepEqual(Object.keys(shown).sort(), ['createdAt', 'endsAt', 'id', 'kind', 'priority', 'summary', 'title', 'topics', 'type', 'url']);
  assert.equal(shown.priority, 'normal');
});

test('an item can be marked breaking, and anything else is normal; breaking sorts first', () => {
  const { listOrder } = require('../src/lib/bleed');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', priority: 'breaking' }).value.priority, 'breaking');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', priority: 'urgent!!' }).value.priority, 'normal');
  assert.equal(validateBleedItem({ kind: 'news', title: 'x' }).value.priority, 'normal');
  const { orderItems } = require('../src/lib/bleed');
  assert.deepEqual(listOrder, { createdAt: -1 });
  // breaking first, then the order given (newest first); an old item with no priority counts as normal
  const sorted = orderItems([{ id: 'a' }, { id: 'b', priority: 'breaking' }, { id: 'c', priority: 'normal' }, { id: 'd', priority: 'breaking' }]);
  assert.deepEqual(sorted.map((i) => i.id), ['b', 'd', 'a', 'c']);
});

test('the companion\'s records: only known kinds and short plain values are kept', () => {
  const { cleanRows } = require('../src/lib/companionEvents');
  const good = { sessionId: 's1abc', readerId: 's1abc', type: 'bleed', itemId: 'x1', action: 'opened', ms: 120.4, seq: 3 };
  const rows = cleanRows([good, { ...good, type: 'hack' }, { ...good, seq: -1 }, { ...good, sessionId: '<script>' }, null, { ...good, seq: 4, note: 'a'.repeat(200), 'bad key!': 1 }]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].data, { itemId: 'x1', action: 'opened' });
  assert.equal(rows[0].ms, 120);
  assert.deepEqual(rows[1].data, { itemId: 'x1', action: 'opened' }); // the long note and the odd key are dropped
  assert.deepEqual(cleanRows('nope'), []);
  assert.equal(cleanRows(Array.from({ length: 500 }, () => good)).length, 200);
});

test('an item can name topics from the fixed list, once each', () => {
  assert.deepEqual(validateBleedItem({ kind: 'news', title: 'x', topics: ['law', 'finance', 'law'] }).value.topics, ['law', 'finance']);
  assert.deepEqual(validateBleedItem({ kind: 'news', title: 'x' }).value.topics, []);
  assert.equal(validateBleedItem({ kind: 'news', title: 'x', topics: ['gossip'] }).error.field, 'topics');
});
