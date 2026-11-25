const express = require('express');
const limits = require('../lib/limits');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const rateLimit = require('../middleware/rateLimit');
const { endSession, readSession, requireAccounts, requireAuth, startSession } = require('../middleware/auth');
const { getSettings } = require('../lib/settings');
const { validateLogin, validateRegistration } = require('../lib/validate');

const router = express.Router();
const limiter = rateLimit({ max: limits.signIn.max, windowMs: limits.signIn.windowMs });
const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email, readingConsent: { agreed: user.readingConsent?.agreed === true, version: user.readingConsent?.version || '' } });

// compared against when an email is unknown, so a wrong email and a wrong password take about as long
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/register', requireAccounts, limiter, async (req, res) => {
  if (!(await getSettings()).registrationOpen) return res.status(403).json({ message: 'New sign-ups are closed for now.' });
  const { error, value } = validateRegistration(req.body);
  if (error) return res.status(400).json(error);
  try {
    const user = await User.create({ name: value.name, email: value.email, passwordHash: await bcrypt.hash(value.password, 12),
      // the box on the sign-up form: her choice is saved with the account, off unless she ticked it
      readingConsent: { agreed: req.body?.consent?.agreed === true, version: typeof req.body?.consent?.version === 'string' ? req.body.consent.version.slice(0, 40) : '', at: new Date() } });
    startSession(res, user._id);
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ field: 'email', message: 'An account with this email already exists. Try signing in.' });
    }
    throw err;
  }
});

router.post('/login', requireAccounts, limiter, async (req, res) => {
  const { error, value } = validateLogin(req.body);
  if (error) return res.status(400).json(error);
  const user = await User.findOne({ email: value.email }).select('+passwordHash');
  const ok = await bcrypt.compare(value.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ message: 'Email or password is incorrect.' });
  startSession(res, user._id);
  return res.json({ user: publicUser(user) });
});

// her choice about the use of her reading data: kept with the account so it follows her across devices
router.put('/consent', requireAccounts, requireAuth, async (req, res) => {
  const { agreed, version } = req.body || {};
  if (typeof agreed !== 'boolean' || typeof version !== 'string' || version.length > 40) return res.status(400).json({ message: 'Send agreed (true or false) and a version.' });
  await User.updateOne({ _id: req.userId }, { $set: { readingConsent: { agreed, version, at: new Date() } } });
  return res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

// the current reader, or { user: null } when signed out (not an error, so the page can ask on every load)
router.get('/me', requireAccounts, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const userId = readSession(req);
  const user = userId ? await User.findById(userId) : null;
  if (userId && !user) endSession(res);
  res.json({ user: user ? publicUser(user) : null });
});

module.exports = router;
