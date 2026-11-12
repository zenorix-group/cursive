const express = require('express');
const User = require('../models/User');
const { requireAccounts, requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const mailer = require('../services/mailer');

const router = express.Router();
const MAX_PDF_BYTES = 2 * 1024 * 1024;

// the PDF is built in the browser from the reader's two receipts and goes only to the signed-in reader's own address
router.post(
  '/',
  requireAccounts,
  requireAuth,
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000, message: 'The receipt was already sent a few times. Please try again later.' }),
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
      await mailer.sendCombinedReceipt({ to: user.email, name: user.name, pdf });
      res.json({ ok: true, email: user.email });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
