const express = require('express');
const cors = require('cors');
const { generateReceipt } = require('./services/receipt');
const { generateLiftReceipt } = require('./services/liftReceipt');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/receipts', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await (req.body?.articleNumber === 2 ? generateLiftReceipt(req.body) : generateReceipt(req.body)));
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error('Request failed:', err.status || 500);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
