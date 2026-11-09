const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { analyzeLift, validateLiftRequest, validateLiftAnalysis, generateLiftReceipt } = require('../src/services/liftReceipt');

const fixtures = [
  { name: 'A', selectedIds: [3, 4, 5, 6, 8], answers: { 1: 4, 2: 3, 3: 6 }, effects: ['proves', 'proves', 'proves'], kept: [5, 8], lean: 'subject' },
  { name: 'B', selectedIds: [1, 3, 4, 5, 8], answers: { 1: 4, 2: 3, 3: 1 }, effects: ['proves', 'proves', 'decorates'], kept: [5, 8], lean: 'correction' },
  { name: 'C', selectedIds: [1, 3, 5, 7, 9], answers: { 1: 7, 2: 5 }, effects: ['misleads', 'decorates', 'empty'], kept: [1, 3, 9], lean: 'reading' },
  { name: 'D', selectedIds: [3, 4, 5, 6, 7], answers: { 1: 3, 2: 6, 3: 4 }, effects: ['illustrates', 'illustrates', 'illustrates'], kept: [5, 7], lean: 'reading' },
];

async function referenceData() {
  const root = path.resolve(__dirname, '../..', 'client/src/data');
  const [{ callLines }, { liftTargets, liftLineDetails }] = await Promise.all([
    import(pathToFileURL(path.join(root, 'callProgress.js')).href),
    import(pathToFileURL(path.join(root, 'liftReferences.js')).href),
  ]);
  return { callLines, liftTargets, liftLineDetails };
}

test('reproduces all four test-report placement patterns without fabricating reading history', async () => {
  const { callLines, liftTargets, liftLineDetails } = await referenceData();
  for (const fixture of fixtures) {
    const progress = validateLiftRequest({ articleNumber: 2, progress: { selectedIds: fixture.selectedIds, answers: fixture.answers } });
    const result = analyzeLift(progress, liftTargets, callLines, liftLineDetails);
    assert.deepEqual(result.placements.map((item) => item.effect), fixture.effects, fixture.name);
    assert.deepEqual(result.kept.map((line) => line.id), fixture.kept, fixture.name);
    assert.equal(result.lean, fixture.lean);
    assert.equal(result.rotation, fixture.name === 'D');
    assert.equal('moved' in result, false);
  }
});

test('distinguishes a partial shared theory from no shared theory', async () => {
  const { callLines, liftTargets, liftLineDetails } = await referenceData();
  const result = analyzeLift(fixtures[2], liftTargets, callLines, liftLineDetails);
  assert.deepEqual(result.theoryCounts, { atmosphere: 2, provenance: 1 });
});

test('validates chosen lines and refuses placements that were never selected', () => {
  for (const progress of [
    { selectedIds: [1, 2, 3, 4, 5, 6], answers: {} },
    { selectedIds: [1, 1], answers: {} },
    { selectedIds: [1], answers: { 1: 4 } },
    { selectedIds: [1], answers: { 4: 1 } },
    { selectedIds: [10], answers: {} },
    { selectedIds: ['3'], answers: {} },
    { selectedIds: [1], answers: null },
  ]) assert.throws(() => validateLiftRequest({ articleNumber: 2, progress }), { status: 400 });
  assert.deepEqual(validateLiftRequest({ articleNumber: 2, progress: { selectedIds: [], answers: {} } }), { selectedIds: [], answers: {} });
});

test('validates every paragraph explanation and refuses incomplete model prose', () => {
  assert.throws(() => validateLiftAnalysis({ prose: [], placements: [], confidence: '', keptObservation: '' }), { status: 502 });
  assert.throws(() => validateLiftAnalysis({ prose: ['Text'], placements: [{ id: 1, explanation: 'One' }, { id: 1, explanation: 'Two' }, { id: 3, explanation: 'Three' }], confidence: 'Text', keptObservation: 'Text' }), { status: 502 });
});

test('Gemini receives authoritative pattern analysis; model cannot overwrite placements or add invented events', async () => {
  const prior = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  try {
    const receipt = await generateLiftReceipt({ articleNumber: 2, progress: { selectedIds: fixtures[3].selectedIds, answers: fixtures[3].answers } }, async (url, options) => {
      assert.equal(options.headers['x-goog-api-key'], 'test-key');
      assert.equal(url.includes('test-key'), false);
      const request = JSON.parse(options.body);
      const context = JSON.parse(request.contents[0].parts[0].text);
      assert.equal(context.rotation, true);
      assert.equal(context.article.paragraphs.length, 6);
      assert.equal(context.transcript.length, 9);
      assert.match(request.systemInstruction.parts[0].text, /No history or paragraph read events were recorded/);
      assert.equal(context.placements[0].placedLineId, 3);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        prose: ['You selected the three demonstration lines and placed them against different paragraph arguments.'],
        placements: [1, 2, 3].map((id) => ({ id, explanation: 'This line addresses a different paragraph mechanism.', placedLineId: 9 })),
        keptObservation: 'The unused lines concern demeanour and an OTP request.', confidence: 'The article separates knowledge, display and urgency.', moved: true,
      }) }] } }] }));
    });
    assert.equal(receipt.placements[0].placedLineId, 3);
    assert.equal(receipt.rotation, true);
    assert.equal('moved' in receipt, false);
    assert.equal(receipt.kind, 'lift');
  } finally {
    if (prior === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prior;
  }
});
