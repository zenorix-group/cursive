const mongoose = require('mongoose');
const { RECORD_KINDS } = require('../lib/validate');

// One document per reader, article and kind of saved data:
//   questions     the question gaps a reader opened and answered (article 1)
//   call          the call lines picked and placed (article 2)
//   receipt       the generated receipt for article 1
//   lift-receipt  the generated receipt for article 2
const articleRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    articleNumber: { type: Number, required: true, min: 1 },
    kind: { type: String, required: true, enum: RECORD_KINDS },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

articleRecordSchema.index({ user: 1, articleNumber: 1, kind: 1 }, { unique: true });

module.exports = mongoose.models.ArticleRecord || mongoose.model('ArticleRecord', articleRecordSchema);
