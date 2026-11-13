// Vercel serverless entry: serves the Express API under /api.
const app = require('../server/src/app');
const connectDB = require('../server/src/config/db');

module.exports = async (req, res) => {
  // Vercel passes each invocation an OIDC token; the AI Gateway accepts it in place of an API key.
  const oidc = req.headers['x-vercel-oidc-token'];
  if (oidc) process.env.VERCEL_OIDC_TOKEN = oidc;
  if (process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
    }
  }
  return app(req, res);
};
