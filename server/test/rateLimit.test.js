const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimit = require('../src/middleware/rateLimit');

const run = (limiter, ip) => {
  const res = { headers: {}, statusCode: 200, body: null,
    set(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let passed = false;
  limiter({ ip, path: '/login' }, res, () => { passed = true; });
  return { passed, res };
};

test('allows up to the limit, then answers 429 with Retry-After', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 3 });
  for (let i = 0; i < 3; i += 1) assert.equal(run(limiter, '1.1.1.1').passed, true);
  const blocked = run(limiter, '1.1.1.1');
  assert.equal(blocked.passed, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.ok(blocked.res.headers['Retry-After']);
});

test('counts each client address separately', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 1 });
  assert.equal(run(limiter, '1.1.1.1').passed, true);
  assert.equal(run(limiter, '2.2.2.2').passed, true);
  assert.equal(run(limiter, '1.1.1.1').passed, false);
});
