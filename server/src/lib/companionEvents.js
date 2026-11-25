// Checks the records the companion sends (switch, swell, sign, lens, bleed, next, signin). Only known kinds, short values, no free text.
const TYPES = ['switch', 'swell', 'sign', 'lens', 'bleed', 'next', 'signin'];
const MAX_ROWS = 200;
const PLAIN = /^[\w .:@/#-]{1,80}$/;

function cleanRow(row) {
  if (!row || typeof row !== 'object') return null;
  const { sessionId, seq, type, articleId, ms, readerId, ...rest } = row;
  if (typeof sessionId !== 'string' || !PLAIN.test(sessionId)) return null;
  if (!Number.isInteger(seq) || seq < 0 || seq > 1e9) return null;
  if (!TYPES.includes(type)) return null;
  const data = {};
  for (const [key, value] of Object.entries(rest).slice(0, 12)) {
    if (!/^\w{1,30}$/.test(key)) continue;
    if (typeof value === 'boolean') data[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) data[key] = value;
    else if (typeof value === 'string' && value.length <= 80) data[key] = value;
  }
  return {
    sessionId,
    seq,
    type,
    articleId: typeof articleId === 'string' && articleId.length <= 40 ? articleId : '',
    data,
    ms: Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : undefined,
  };
}

// returns the rows that passed; the rest are dropped
function cleanRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_ROWS).map(cleanRow).filter(Boolean);
}

module.exports = { cleanRows, TYPES, MAX_ROWS };
