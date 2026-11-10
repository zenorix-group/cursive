const express = require('express');
const ArticleRecord = require('../models/ArticleRecord');
const { requireAccounts, requireAuth } = require('../middleware/auth');
const { parseRecordParams, validateRecordData } = require('../lib/validate');

const router = express.Router();
router.use(requireAccounts, requireAuth);

// everything this reader has saved, in one call
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const records = await ArticleRecord.find({ user: req.userId }).select('articleNumber kind data updatedAt -_id').lean();
  res.json({ records });
});

router.put('/:articleNumber/:kind', async (req, res) => {
  const params = parseRecordParams(req.params);
  if (params.error) return res.status(400).json({ message: params.error });
  const body = validateRecordData(req.body?.data);
  if (body.error) return res.status(400).json({ message: body.error });
  const record = await ArticleRecord.findOneAndUpdate(
    { user: req.userId, ...params.value },
    { $set: { data: body.value } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  res.json({ ok: true, updatedAt: record.updatedAt });
});

module.exports = router;
