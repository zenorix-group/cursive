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

async function generateJson({ instructions, context, schema }, fetchImpl = fetch) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw httpError(503, 'Receipt generation is not configured yet. Your choices are saved locally.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  let response;
  const deadline = Date.now() + 110000; // stays under the 120s Vercel function limit
  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: instructions }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, thinkingConfig: { thinkingLevel: 'LOW' }, maxOutputTokens: 12000 },
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        body: requestBody,
      });
    } catch (error) {
      if (attempt === 2 || Date.now() >= deadline || ['TimeoutError', 'AbortError'].includes(error.name)) {
        throw httpError(503, ['TimeoutError', 'AbortError'].includes(error.name) ? 'Receipt generation took too long. Your choices are saved; please retry.' : 'Could not reach Gemini. Your choices are saved; please retry.');
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      continue;
    }
    if (response.ok) break;
    const transient = [429, 500, 502, 503, 504].includes(response.status);
    if (!transient || attempt === 2 || Date.now() + 500 >= deadline) throw upstreamError(response.status);
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  try {
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join('');
    return { analysis: JSON.parse(text), model };
  } catch {
    throw httpError(502, 'Gemini did not return a complete receipt. Please retry.');
  }
}

module.exports = { generateJson, httpError };
