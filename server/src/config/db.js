const mongoose = require('mongoose');

let connecting;

// Connects once per process; safe to call on every request (serverless) or at startup.
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  connecting ??= mongoose.connect(process.env.MONGO_URI).then((conn) => {
    console.log(`MongoDB connected: ${conn.connection.host}`);
  }).catch((err) => {
    connecting = undefined;
    throw err;
  });
  await connecting;
};

module.exports = connectDB;
