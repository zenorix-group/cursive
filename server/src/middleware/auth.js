const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const COOKIE = 'cursive_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

const secret = () => process.env.JWT_SECRET;

function startSession(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, secret(), { expiresIn: Math.floor(MAX_AGE_MS / 1000) });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

function endSession(res) {
  res.clearCookie(COOKIE, cookieOptions());
}

// returns the user id from the session cookie, or null when there is no valid session
function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token || !secret()) return null;
  try {
    return jwt.verify(token, secret()).sub || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const userId = readSession(req);
  if (!userId) return res.status(401).json({ message: 'Please sign in to continue.' });
  req.userId = userId;
  return next();
}

// accounts need both a database and a signing secret
function requireAccounts(req, res, next) {
  if (!secret() || mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Accounts are unavailable right now. Please try again shortly.' });
  }
  return next();
}

// The admin signs in with their own username and password (ADMIN_USERNAME / ADMIN_PASSWORD in .env).
// Their session is a separate cookie, so it never mixes with reader accounts.
const ADMIN_COOKIE = 'cursive_admin';
const ADMIN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function checkAdminCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass || typeof username !== 'string' || typeof password !== 'string') return false;
  const same = (a, b) => {
    const x = crypto.createHash('sha256').update(a).digest();
    const y = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(x, y);
  };
  return same(username.trim(), expectedUser) & same(password, expectedPass) ? true : false;
}

function startAdminSession(res) {
  const token = jwt.sign({ role: 'admin' }, secret(), { expiresIn: Math.floor(ADMIN_MAX_AGE_MS / 1000) });
  res.cookie(ADMIN_COOKIE, token, { ...cookieOptions(), maxAge: ADMIN_MAX_AGE_MS });
}

function endAdminSession(res) {
  res.clearCookie(ADMIN_COOKIE, cookieOptions());
}

function isAdminSession(req) {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token || !secret()) return false;
  try {
    return jwt.verify(token, secret()).role === 'admin';
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!isAdminSession(req)) return res.status(401).json({ message: 'Admin sign-in required.' });
  return next();
}

module.exports = { checkAdminCredentials, endAdminSession, isAdminSession, requireAdmin, startAdminSession, endSession, readSession, requireAccounts, requireAuth, startSession };
