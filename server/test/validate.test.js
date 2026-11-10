const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEmail, parseRecordParams, validateLogin, validateRecordData, validateRegistration,
} = require('../src/lib/validate');

test('registration accepts a good account and normalises the email', () => {
  const { value, error } = validateRegistration({ name: '  Eleanor Vance ', email: ' Reader@Example.COM ', password: 'correct-horse-9' });
  assert.equal(error, undefined);
  assert.deepEqual(value, { name: 'Eleanor Vance', email: 'reader@example.com', password: 'correct-horse-9' });
});

test('registration names the field that is wrong', () => {
  const ok = { name: 'A', email: 'a@b.co', password: 'longenough1' };
  assert.equal(validateRegistration({ ...ok, name: '   ' }).error.field, 'name');
  assert.equal(validateRegistration({ ...ok, email: 'not-an-email' }).error.field, 'email');
  assert.equal(validateRegistration({ ...ok, password: 'short' }).error.field, 'password');
  assert.equal(validateRegistration({ ...ok, password: 'x'.repeat(73) }).error.field, 'password');
});

test('registration and login reject non-string values instead of passing them on to the database', () => {
  assert.equal(validateRegistration({ name: { $gt: '' }, email: 'a@b.co', password: 'longenough1' }).error.field, 'name');
  assert.equal(validateLogin({ email: { $gt: '' }, password: 'x' }).error.field, 'email');
  assert.equal(validateLogin({ email: 'a@b.co', password: { $ne: '' } }).error.field, 'password');
  assert.equal(normalizeEmail({ $gt: '' }), '');
});

test('login needs an email and a password', () => {
  assert.equal(validateLogin({ email: 'a@b.co', password: '' }).error.field, 'password');
  assert.deepEqual(validateLogin({ email: 'A@B.co', password: 'x' }).value, { email: 'a@b.co', password: 'x' });
});

test('record params only allow known articles and kinds', () => {
  assert.deepEqual(parseRecordParams({ articleNumber: '2', kind: 'lift-receipt' }).value, { articleNumber: 2, kind: 'lift-receipt' });
  assert.ok(parseRecordParams({ articleNumber: '3', kind: 'questions' }).error);
  assert.ok(parseRecordParams({ articleNumber: '1.5', kind: 'questions' }).error);
  assert.ok(parseRecordParams({ articleNumber: '1', kind: 'admin' }).error);
});

test('record data must be a plain object without operator keys and under the size limit', () => {
  assert.ok(validateRecordData({ answers: { 1: 'a question' } }).value);
  assert.ok(validateRecordData(null).error);
  assert.ok(validateRecordData([1, 2]).error);
  assert.ok(validateRecordData('text').error);
  assert.ok(validateRecordData({ $set: { x: 1 } }).error);
  assert.ok(validateRecordData({ nested: [{ ok: 1, $where: 'x' }] }).error);
  assert.ok(validateRecordData({ big: 'x'.repeat(40001) }).error);
});
