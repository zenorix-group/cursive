const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const { generateReceipt } = require('./services/receipt');
const { generateLiftReceipt } = require('./services/liftReceipt');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/me/records', recordRoutes);

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
