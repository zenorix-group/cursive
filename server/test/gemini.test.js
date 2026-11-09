const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateJson } = require('../src/services/gemini');

const request = { instructions: 'Test', context: {}, schema: { type: 'object' } };
const success = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ready":true}' }] } }] }));

async function withKey(run) {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  try { await run() } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
}

test('retries temporary overload and returns the generated JSON', async () => withKey(async () => {
  let calls = 0;
  const result = await generateJson(request, async () => {
    calls++;
    return calls < 3 ? new Response('{}', { status: 503 }) : success();
  });
  assert.equal(calls, 3);
  assert.deepEqual(result.analysis, { ready: true });
}));

test('stops after bounded rate-limit retries with a specific error', async () => withKey(async () => {
  let calls = 0;
  await assert.rejects(generateJson(request, async () => { calls++; return new Response('{}', { status: 429 }); }), /rate limited/);
  assert.equal(calls, 3);
}));

test('does not retry rejected credentials or unavailable model configuration', async () => withKey(async () => {
  for (const [status, message] of [[403, /API credentials/], [404, /model is unavailable/], [400, /model configuration/]]) {
    let calls = 0;
    await assert.rejects(generateJson(request, async () => { calls++; return new Response('{}', { status }); }), message);
    assert.equal(calls, 1);
  }
}));

test('retries transient connection errors without inventing receipt output', async () => withKey(async () => {
  let calls = 0;
  const result = await generateJson(request, async () => {
    calls++;
    if (calls === 1) throw new TypeError('fetch failed');
    return success();
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.analysis, { ready: true });
}));
