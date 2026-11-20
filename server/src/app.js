const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const combinedReceiptRoutes = require('./routes/combinedReceipt');
const { generateReceipt } = require('./services/receipt');
const { generateLiftReceipt } = require('./services/liftReceipt');
const { generateNarrativeReceipt } = require('./services/narrativeReceipt');
const { generateRearrangeReceipt } = require('./services/rearrangeReceipt');
const { generateCupsReceipt } = require('./services/cupsReceipt');
const { generateFilesReceipt } = require('./services/filesReceipt');
const { generateHighlightsReceipt } = require('./services/highlightsReceipt');
const rateLimit = require('./middleware/rateLimit');
const limits = require('./lib/limits');
const { receiptsOn, track } = require('./middleware/usage');
const { getSettings } = require('./lib/settings');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use((req, res, next) => (req.path.startsWith('/api/me/combined-receipt') ? next() : express.json()(req, res, next)));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// the few switches the site itself needs to know about
app.get('/api/settings', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { hiddenArticles } = await getSettings();
    res.json({ hiddenArticles });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/me/records', recordRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/me/combined-receipt', combinedReceiptRoutes);

app.post('/api/receipts', receiptsOn, track('receipt'), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await (req.body?.articleNumber === 2 ? generateLiftReceipt(req.body) : generateReceipt(req.body)));
  } catch (error) {
    next(error);
  }
});

// the narrative receipt reads both games together; it is what the combined receipt email carries
app.post('/api/receipts/narrative', receiptsOn, track('narrative'), rateLimit({ max: limits.narrative.max, windowMs: limits.narrative.windowMs, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await generateNarrativeReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

// the Re-Arrange receipt (article 5): the key lives on the server, so the page only learns it once she has filed
app.post('/api/receipts/rearrange', receiptsOn, track('rearrange'), rateLimit({ max: limits.rearrange.max, windowMs: limits.rearrange.windowMs, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(generateRearrangeReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

// the Four Cups receipt (article 6): the key lives on the server too
app.post('/api/receipts/cups', receiptsOn, track('cups'), rateLimit({ max: limits.cups.max, windowMs: limits.cups.windowMs, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(generateCupsReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

// the Two Files receipt (article 7): it reads the words she typed, and the key lives on the server too
app.post('/api/receipts/files', receiptsOn, track('files'), rateLimit({ max: limits.files.max, windowMs: limits.files.windowMs, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(generateFilesReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

// the Hindsight Highlights receipt (article 4): the key lives on the server, and one model call judges her line
app.post('/api/receipts/highlights', receiptsOn, track('highlights'), rateLimit({ max: limits.highlights.max, windowMs: limits.highlights.windowMs, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await generateHighlightsReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error('Request failed:', err.status || 500);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
