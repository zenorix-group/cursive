const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ArticleRecord = require('../models/ArticleRecord');
const rateLimit = require('../middleware/rateLimit');
const { checkAdminCredentials, endAdminSession, isAdminSession, requireAccounts, requireAdmin, startAdminSession } = require('../middleware/auth');
const { ARTICLE_NUMBERS } = require('../lib/validate');
const UsageEvent = require('../models/UsageEvent');
const AuditLog = require('../models/AuditLog');
const limits = require('../lib/limits');
const mailer = require('../services/mailer');
const { isConfigured: aiConfigured } = require('../services/gemini');
const { getSettings, saveSettings } = require('../lib/settings');
const BleedItem = require('../models/BleedItem');
const { validateBleedItem } = require('../lib/bleed');

const audit = (action, detail) => AuditLog.create({ action, detail }).catch(() => {});

const router = express.Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// the admin's own sign-in (not a reader account)
router.post('/login', rateLimit({ max: 10, message: 'Too many attempts. Please wait a few minutes.' }), (req, res) => {
  if (!process.env.JWT_SECRET || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ message: 'Admin sign-in is not set up on the server.' });
  }
  if (!checkAdminCredentials(req.body?.username, req.body?.password)) {
    return res.status(401).json({ message: 'Username or password is incorrect.' });
  }
  startAdminSession(res);
  audit('Admin signed in', req.ip);
  return res.json({ ok: true });
});
router.post('/logout', (req, res) => {
  endAdminSession(res);
  res.json({ ok: true });
});
router.get('/me', (req, res) => res.json({ admin: isAdminSession(req) }));

router.use(requireAccounts, requireAdmin);

// a record of one of these kinds is a finished receipt; any other record means the article was started
const RECEIPT_KINDS = ['receipt', 'lift-receipt', 'narrative'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.isValidObjectId(id);

function articleSummary(records) {
  return ARTICLE_NUMBERS.map((number) => {
    const mine = records.filter((r) => r.articleNumber === number);
    const done = mine.some((r) => RECEIPT_KINDS.includes(r.kind));
    return { number, status: done ? 'done' : mine.length ? 'ip' : 'ns', updatedAt: mine.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), null) };
  });
}

router.get('/stats', async (req, res) => {
  const day = 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - 14 * day);
  const [users, activeWeek, perArticle, signups, receiptsByDay] = await Promise.all([
    User.countDocuments(),
    ArticleRecord.distinct('user', { updatedAt: { $gte: new Date(Date.now() - 7 * day) } }),
    ArticleRecord.aggregate([
      { $group: { _id: { articleNumber: '$articleNumber', user: '$user' }, done: { $max: { $cond: [{ $in: ['$kind', RECEIPT_KINDS] }, 1, 0] } } } },
      { $group: { _id: '$_id.articleNumber', started: { $sum: 1 }, completed: { $sum: '$done' } } },
    ]),
    User.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }]),
    ArticleRecord.aggregate([
      { $match: { kind: { $in: RECEIPT_KINDS }, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
  ]);
  const byArticle = new Map(perArticle.map((a) => [a._id, a]));
  const series = (rows) => {
    const map = new Map(rows.map((r) => [r._id, r.count]));
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.now() - (13 - i) * day).toISOString().slice(0, 10);
      return { date, count: map.get(date) || 0 };
    });
  };
  res.json({
    users,
    activeWeek: activeWeek.length,
    receipts: await ArticleRecord.countDocuments({ kind: { $in: RECEIPT_KINDS } }),
    articles: ARTICLE_NUMBERS.map((number) => ({ number, started: byArticle.get(number)?.started || 0, completed: byArticle.get(number)?.completed || 0 })),
    signups: series(signups),
    receiptsByDay: series(receiptsByDay),
  });
});

router.get('/users', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const records = await ArticleRecord.find({ user: { $in: users.map((u) => u._id) } }).select('user articleNumber kind updatedAt').lean();
  const byUser = new Map();
  for (const r of records) byUser.set(String(r.user), [...(byUser.get(String(r.user)) || []), r]);
  res.json({
    users: users.map((u) => {
      const articles = articleSummary(byUser.get(String(u._id)) || []);
      return {
        id: String(u._id), name: u.name, email: u.email, createdAt: u.createdAt,
        completed: articles.filter((a) => a.status === 'done').length,
        lastActive: articles.reduce((m, a) => (a.updatedAt && (!m || a.updatedAt > m) ? a.updatedAt : m), null),
      };
    }),
  });
});

router.get('/users/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Reader not found.' });
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ message: 'Reader not found.' });
  const records = await ArticleRecord.find({ user: user._id }).sort({ articleNumber: 1, kind: 1 }).lean();
  res.json({
    user: { id: String(user._id), name: user.name, email: user.email, createdAt: user.createdAt },
    articles: articleSummary(records),
    records: records.map((r) => ({ id: String(r._id), articleNumber: r.articleNumber, kind: r.kind, data: r.data, updatedAt: r.updatedAt, isReceipt: RECEIPT_KINDS.includes(r.kind) })),
  });
});

// let a reader start an article over
router.delete('/users/:id/articles/:articleNumber', async (req, res) => {
  const number = Number(req.params.articleNumber);
  if (!validId(req.params.id) || !ARTICLE_NUMBERS.includes(number)) return res.status(400).json({ message: 'Unknown reader or article.' });
  const result = await ArticleRecord.deleteMany({ user: req.params.id, articleNumber: number });
  audit('Reset article', `Article ${number} for reader ${req.params.id}`);
  res.json({ ok: true, deleted: result.deletedCount });
});

// start a reader's whole progress over: every article's answers and receipts (the account itself stays)
router.delete('/users/:id/articles', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Reader not found.' });
  const user = await User.findById(req.params.id).select('email');
  if (!user) return res.status(404).json({ message: 'Reader not found.' });
  const result = await ArticleRecord.deleteMany({ user: user._id });
  audit('Reset all progress', `${user.email}: ${result.deletedCount} records`);
  res.json({ ok: true, deleted: result.deletedCount });
});

router.delete('/records/:recordId', async (req, res) => {
  if (!validId(req.params.recordId)) return res.status(400).json({ message: 'Unknown record.' });
  await ArticleRecord.deleteOne({ _id: req.params.recordId });
  audit('Deleted record', req.params.recordId);
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Reader not found.' });
  const user = await User.findById(req.params.id).select('email');
  if (!user) return res.status(404).json({ message: 'Reader not found.' });
  await ArticleRecord.deleteMany({ user: user._id });
  await user.deleteOne();
  audit('Deleted reader', `${user.email}`);
  res.json({ ok: true });
});

// AI and email health over the last 24 hours and 7 days
router.get('/usage', async (req, res) => {
  const day = 24 * 60 * 60 * 1000;
  const stats = (since) => UsageEvent.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - since) } } },
    { $group: { _id: '$endpoint', total: { $sum: 1 }, failed: { $sum: { $cond: ['$ok', 0, 1] } }, avgMs: { $avg: '$ms' }, maxMs: { $max: '$ms' } } },
    { $sort: { _id: 1 } },
  ]);
  const [last24h, last7d, failures] = await Promise.all([
    stats(day), stats(7 * day),
    UsageEvent.find({ ok: false }).sort({ createdAt: -1 }).limit(15).lean(),
  ]);
  const clean = (rows) => rows.map((r) => ({ endpoint: r._id, total: r.total, failed: r.failed, avgMs: Math.round(r.avgMs || 0), maxMs: r.maxMs || 0 }));
  res.json({
    last24h: clean(last24h), last7d: clean(last7d),
    failures: failures.map((f) => ({ endpoint: f.endpoint, status: f.status, message: f.message, ms: f.ms, createdAt: f.createdAt })),
  });
});

// whether each outside service is set up (never the secrets themselves)
router.get('/system', (req, res) => {
  const gateway = Boolean(process.env.AI_GATEWAY_API_KEY || (process.env.AI_PROVIDER === 'gateway' && process.env.VERCEL_OIDC_TOKEN));
  res.json({
    database: mongoose.connection.readyState === 1,
    ai: { configured: aiConfigured(), provider: gateway ? 'Vercel AI Gateway' : process.env.GEMINI_API_KEY ? 'Google Gemini' : 'None', model: gateway ? process.env.AI_GATEWAY_MODEL || null : process.env.GEMINI_MODEL || 'gemini-3.5-flash' },
    email: { configured: mailer.configured(), host: process.env.SMTP_HOST || null },
    limits: Object.values(limits).map((l) => ({ label: l.label, max: l.max, minutes: Math.round(l.windowMs / 60000) })),
  });
});

router.get('/settings', async (req, res) => res.json({ settings: await getSettings(), articles: ARTICLE_NUMBERS }));

router.put('/settings', async (req, res) => {
  const b = req.body || {};
  const patch = {};
  if (typeof b.registrationOpen === 'boolean') patch.registrationOpen = b.registrationOpen;
  if (typeof b.receiptsEnabled === 'boolean') patch.receiptsEnabled = b.receiptsEnabled;
  if (Array.isArray(b.hiddenArticles)) patch.hiddenArticles = [...new Set(b.hiddenArticles.filter((n) => ARTICLE_NUMBERS.includes(n)))];
  if (!Object.keys(patch).length) return res.status(400).json({ message: 'Nothing to change.' });
  const settings = await saveSettings(patch);
  audit('Changed settings', JSON.stringify(patch));
  res.json({ settings });
});

// the Bleed: editorial adds and removes the items every reader sees
router.get('/bleed', async (req, res) => res.json({ items: await BleedItem.find().sort({ createdAt: -1 }).limit(100) }));
router.post('/bleed', async (req, res) => {
  const { error, value } = validateBleedItem(req.body);
  if (error) return res.status(400).json(error);
  const item = await BleedItem.create(value);
  audit('Bleed item added', item.title);
  return res.status(201).json({ item });
});
router.delete('/bleed/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Not found.' });
  const item = await BleedItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found.' });
  audit('Bleed item removed', item.title);
  return res.json({ ok: true });
});

router.get('/audit', async (req, res) => {
  res.json({ entries: await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean() });
});

module.exports = router;
