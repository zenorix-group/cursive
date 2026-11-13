function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function upstreamError(status) {
  if (status === 429) return httpError(503, 'Gemini is rate limited right now. Your choices are saved; please try again shortly.');
  if (status === 503) return httpError(503, 'Gemini is busy right now and could not finish your receipt. Your choices are saved; please try again shortly.');
  if ([401, 403].includes(status)) return httpError(503, 'Gemini rejected the server API credentials. Check the server API key before retrying.');
  if (status === 404) return httpError(503, 'The configured Gemini model is unavailable. Check the server model setting.');
  if (status === 400) return httpError(503, 'Gemini rejected the receipt request. Check the server model configuration.');
  return httpError(503, 'Gemini is temporarily unavailable. Your choices are saved; please try again shortly.');
}

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

// Vercel AI Gateway is used when AI_GATEWAY_API_KEY is set, or when AI_PROVIDER=gateway and the deployment's
// VERCEL_OIDC_TOKEN is available. Otherwise requests go straight to Gemini with GEMINI_API_KEY.
// The gateway needs a credit card on the Vercel team before it serves requests (that also unlocks its free credits).
function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  if (process.env.AI_PROVIDER === 'gateway' && process.env.VERCEL_OIDC_TOKEN) return process.env.VERCEL_OIDC_TOKEN;
  return null;
}

function isConfigured() {
  return Boolean(gatewayToken() || process.env.GEMINI_API_KEY);
}

// Builds the provider request for one JSON-schema generation. Returns the URL, fetch options (without a signal),
// the model name to report, and a function that pulls the generated JSON text out of the provider's response body.
function buildRequest({ instructions, context, schema }) {
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const token = gatewayToken();
  if (token) {
    const model = process.env.AI_GATEWAY_MODEL || `google/${geminiModel}`;
    return {
      url: GATEWAY_URL,
      model,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: 'system', content: instructions }, { role: 'user', content: JSON.stringify(context) }],
          response_format: { type: 'json_schema', json_schema: { name: 'receipt', schema } },
          reasoning: { effort: 'low' },
          max_tokens: 12000,
        }),
      },
      extractText: (result) => result.choices?.[0]?.message?.content,
    };
  }
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    model: geminiModel,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, thinkingConfig: { thinkingLevel: 'LOW' }, maxOutputTokens: 12000 },
      }),
    },
    extractText: (result) => result.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join(''),
  };
}

async function generateJson({ instructions, context, schema }, fetchImpl = fetch) {
  if (!isConfigured()) throw httpError(503, 'Receipt generation is not configured yet. Your choices are saved locally.');
  const { url, model, options, extractText } = buildRequest({ instructions, context, schema });
  let response;
  const deadline = Date.now() + 110000; // stays under the 120s Vercel function limit
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    } catch (error) {
      if (attempt === 2 || Date.now() >= deadline || ['TimeoutError', 'AbortError'].includes(error.name)) {
        throw httpError(503, ['TimeoutError', 'AbortError'].includes(error.name) ? 'Receipt generation took too long. Your choices are saved; please retry.' : 'Could not reach Gemini. Your choices are saved; please retry.');
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      continue;
    }
    if (response.ok) break;
    const transient = [429, 500, 502, 503, 504].includes(response.status);
    if (!transient || attempt === 2 || Date.now() + 500 >= deadline) {
      console.error('Model request failed:', response.status, (await response.text().catch(() => '')).slice(0, 300));
      throw upstreamError(response.status);
    }
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  try {
    const result = await response.json();
    return { analysis: JSON.parse(extractText(result)), model };
  } catch {
    throw httpError(502, 'Gemini did not return a complete receipt. Please retry.');
  }
}

module.exports = { buildRequest, generateJson, httpError, isConfigured };
