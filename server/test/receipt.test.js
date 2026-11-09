const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateReceipt, validateRequest, validateAnalysis } = require('../src/services/receipt');

const questions = [
  { id: 1, text: '  did it work??  ', visited: true },
  { id: 2, text: 'how much was taken', visited: true },
  { id: 3, text: '', visited: false },
];
const analysis = () => ({
  inquiries: [
    { id: 1, outcome: 'match', label: 'dependence', record: 'Asks about the application outcome.', path: 'Same dependency as the target.', thread: false },
    { id: 2, outcome: 'outside', label: 'number', record: 'The amount is not carried by this article.', path: 'A factual detail outside this piece.', thread: false },
    { id: 3, outcome: 'skipped', label: 'none', record: 'No question filed.', path: 'Nothing filed at this turn.', thread: false },
  ],
  observations: ['Your first question asks the article to confirm an outcome.'],
  openFiles: [],
  cadenceNote: 'The article separates the judicial decision from the physical handover.',
});

test('rejects missing, duplicate, oversized and unsupported question requests', () => {
  for (const body of [null, { articleNumber: 2, questions }, { articleNumber: 1, questions: [questions[0], questions[0], questions[2]] },
    { articleNumber: 1, questions: [{ ...questions[0], text: 'x'.repeat(4001) }, ...questions.slice(1)] }]) {
    assert.throws(() => validateRequest(body), { status: 400 });
  }
});

test('preserves exact transcripts and keeps opinions/outside questions out of the open file', () => {
  const output = validateAnalysis(analysis(), questions);
  assert.equal(output.inquiries[0].text, questions[0].text);
  assert.equal(output.inquiries[1].outcome, 'outside');
  const invalid = analysis();
  invalid.openFiles = [{ inquiryId: 2, explanation: 'Do not file this outside question as a reporting hole.' }];
  assert.throws(() => validateAnalysis(invalid, questions), { status: 502 });
});

test('rejects invented submissions and malformed classifications', () => {
  const skipped = analysis();
  skipped.inquiries[2].outcome = 'match';
  assert.throws(() => validateAnalysis(skipped, questions), { status: 502 });
  const malformed = analysis();
  malformed.inquiries[0].label = 'personality';
  assert.throws(() => validateAnalysis(malformed, questions), { status: 502 });
});

test('sends article context and server-only credential; validates generated JSON', async () => {
  const prior = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-key';
  try {
    const receipt = await generateReceipt({ articleNumber: 1, questions }, async (url, options) => {
      assert.match(url, /:generateContent$/);
      assert.ok(!url.includes('test-only-key'));
      assert.equal(options.headers['x-goog-api-key'], 'test-only-key');
      const request = JSON.parse(options.body);
      const context = JSON.parse(request.contents[0].parts[0].text);
      assert.equal(context.article.paragraphs.length, 8);
      assert.deepEqual(context.readerQuestions.map((q) => q.afterParagraph), [2, 4, 6]);
      assert.equal(context.readerQuestions[0].text, questions[0].text);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis()) }] } }] }));
    });
    assert.equal(receipt.inquiries[0].text, questions[0].text);
    assert.equal(JSON.stringify(receipt).includes('test-only-key'), false);
  } finally {
    if (prior === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prior;
  }
});

test('handles model failures and refuses incomplete JSON instead of fabricating a receipt', async () => {
  const prior = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-key';
  try {
    await assert.rejects(generateReceipt({ articleNumber: 1, questions }, async () => new Response('{}', { status: 429 })), { status: 503 });
    await assert.rejects(generateReceipt({ articleNumber: 1, questions }, async () => new Response('{}')), { status: 502 });
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(generateReceipt({ articleNumber: 1, questions }), { status: 503 });
  } finally {
    if (prior === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prior;
  }
});
