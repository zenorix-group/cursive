const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const combinedReceiptRoutes = require('./routes/combinedReceipt');
const { generateReceipt } = require('./services/receipt');
const { generateLiftReceipt } = require('./services/liftReceipt');
const { generateNarrativeReceipt } = require('./services/narrativeReceipt');
const rateLimit = require('./middleware/rateLimit');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use((req, res, next) => (req.path.startsWith('/api/me/combined-receipt') ? next() : express.json()(req, res, next)));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/me/records', recordRoutes);
app.use('/api/me/combined-receipt', combinedReceiptRoutes);

app.post('/api/receipts', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await (req.body?.articleNumber === 2 ? generateLiftReceipt(req.body) : generateReceipt(req.body)));
  } catch (error) {
    next(error);
  }
});

// the narrative receipt reads both games together; it is what the combined receipt email carries
app.post('/api/receipts/narrative', rateLimit({ max: 12, message: 'Too many receipts requested. Please wait a few minutes and try again.' }), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await generateNarrativeReceipt(req.body));
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error('Request failed:', err.status || 500);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
