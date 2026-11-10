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

module.exports = { endSession, readSession, requireAccounts, requireAuth, startSession };
