const express = require('express');
const User = require('../models/User');
const { requireAccounts, requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const mailer = require('../services/mailer');
const limits = require('../lib/limits');
const { logUsage } = require('../middleware/usage');

const router = express.Router();
const MAX_PDF_BYTES = 2 * 1024 * 1024;

// the PDF is built in the browser from the reader's two receipts and goes only to the signed-in reader's own address
router.post(
  '/',
  requireAccounts,
  requireAuth,
  rateLimit({ max: limits.combined.max, windowMs: limits.combined.windowMs, message: 'The receipt was already sent a few times. Please try again later.' }),
  express.json({ limit: '3mb' }),
  async (req, res, next) => {
    try {
      if (!mailer.configured()) return res.status(503).json({ message: 'Email is not set up on the server yet.' });
      const encoded = req.body?.pdf;
      if (typeof encoded !== 'string' || !encoded) return res.status(400).json({ message: 'No receipt to send.' });
      const pdf = Buffer.from(encoded, 'base64');
      if (!pdf.length || pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
        return res.status(400).json({ message: 'That is not a valid receipt PDF.' });
      }
      const user = await User.findById(req.userId).select('name email');
      if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
      const start = Date.now();
      try {
        await mailer.sendCombinedReceipt({ to: user.email, name: user.name, pdf });
      } catch (error) {
        logUsage({ endpoint: 'email', ok: false, ms: Date.now() - start, message: error.message });
        throw error;
      }
      logUsage({ endpoint: 'email', ok: true, ms: Date.now() - start });
      res.json({ ok: true, email: user.email });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
