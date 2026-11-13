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

test('uses Vercel AI Gateway when a gateway credential is present', async () => {
  const saved = { gw: process.env.AI_GATEWAY_API_KEY, gem: process.env.GEMINI_API_KEY };
  process.env.AI_GATEWAY_API_KEY = 'gateway-test-key';
  delete process.env.GEMINI_API_KEY;
  try {
    const schema = { type: 'object', properties: { ready: { type: 'boolean' }, note: { type: 'string' } }, required: ['ready'] };
    const result = await generateJson({ ...request, schema }, async (url, options) => {
      assert.equal(url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer gateway-test-key');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'google/gemini-3.5-flash');
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
      assert.deepEqual(body.response_format.json_schema.schema.required, ['ready', 'note']);
      assert.equal(body.messages[0].content, 'Test');
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ready":true}' } }] }));
    });
    assert.deepEqual(result, { analysis: { ready: true }, model: 'google/gemini-3.5-flash' });
  } finally {
    for (const [key, value] of [['AI_GATEWAY_API_KEY', saved.gw], ['GEMINI_API_KEY', saved.gem]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
