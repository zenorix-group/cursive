const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const rateLimit = require('../middleware/rateLimit');
const { endSession, readSession, requireAccounts, startSession } = require('../middleware/auth');
const { validateLogin, validateRegistration } = require('../lib/validate');

const router = express.Router();
const limiter = rateLimit({ max: 20 });
const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email });

// compared against when an email is unknown, so a wrong email and a wrong password take about as long
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/register', requireAccounts, limiter, async (req, res) => {
  const { error, value } = validateRegistration(req.body);
  if (error) return res.status(400).json(error);
  try {
    const user = await User.create({ name: value.name, email: value.email, passwordHash: await bcrypt.hash(value.password, 12) });
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
