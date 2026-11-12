// Pure validation helpers, kept free of Express and Mongoose so they are easy to test.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECORD_KINDS = ['questions', 'call', 'receipt', 'lift-receipt', 'stored', 'emailed', 'narrative'];
const ARTICLE_NUMBERS = [1, 2];
const MAX_RECORD_CHARS = 40000;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything past 72 bytes

const isString = (value) => typeof value === 'string';

const normalizeEmail = (value) => (isString(value) ? value.trim().toLowerCase() : '');

// returns { error: { field, message } } or { value }
function validateRegistration(body) {
  const name = isString(body?.name) ? body.name.trim() : '';
  const email = normalizeEmail(body?.email);
  const password = isString(body?.password) ? body.password : '';
  if (!name) return { error: { field: 'name', message: 'Enter your full name.' } };
  if (name.length > 120) return { error: { field: 'name', message: 'Use 120 characters or fewer.' } };
  if (!EMAIL.test(email) || email.length > 254) {
    return { error: { field: 'email', message: 'Enter an email address like reader@cursive-review.org.' } };
  }
  if (password.length < 8) return { error: { field: 'password', message: 'Use at least 8 characters.' } };
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return { error: { field: 'password', message: 'Use 72 bytes or fewer.' } };
  }
  return { value: { name, email, password } };
}

function validateLogin(body) {
  const email = normalizeEmail(body?.email);
  const password = isString(body?.password) ? body.password : '';
  if (!EMAIL.test(email)) {
    return { error: { field: 'email', message: 'Enter an email address like reader@cursive-review.org.' } };
  }
  if (!password) return { error: { field: 'password', message: 'Enter your password.' } };
  return { value: { email, password } };
}

function parseRecordParams(params) {
  const articleNumber = Number(params?.articleNumber);
  if (!Number.isInteger(articleNumber) || !ARTICLE_NUMBERS.includes(articleNumber)) {
    return { error: 'Unknown article.' };
  }
  if (!RECORD_KINDS.includes(params?.kind)) return { error: 'Unknown kind of record.' };
  return { value: { articleNumber, kind: params.kind } };
}

// keys starting with "$" are operators to MongoDB, so they are never stored
function hasUnsafeKey(value, depth = 0) {
  if (depth > 8) return true;
  if (Array.isArray(value)) return value.some((item) => hasUnsafeKey(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.keys(value).some((key) => key.startsWith('$') || hasUnsafeKey(value[key], depth + 1));
  }
  return false;
}

function validateRecordData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'Saved data must be an object.' };
  if (hasUnsafeKey(data)) return { error: 'Saved data contains a field that is not allowed.' };
  if (JSON.stringify(data).length > MAX_RECORD_CHARS) return { error: 'Saved data is too large.' };
  return { value: data };
}

module.exports = {
  ARTICLE_NUMBERS,
  RECORD_KINDS,
  normalizeEmail,
  parseRecordParams,
  validateLogin,
  validateRecordData,
  validateRegistration,
};
