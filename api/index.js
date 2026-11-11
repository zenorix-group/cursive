// Vercel serverless entry: serves the Express API under /api.
const app = require('../server/src/app');
const connectDB = require('../server/src/config/db');

module.exports = async (req, res) => {
  if (process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
    }
  }
  return app(req, res);
};
