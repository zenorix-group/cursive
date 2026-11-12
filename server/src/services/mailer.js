const nodemailer = require('nodemailer');

// SMTP settings come from the environment (see .env.example). Without them the app still works; only emailing is off.
function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

async function sendCombinedReceipt({ to, name, pdf }) {
  await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your combined Cursive receipt',
    text: `Hello ${name || 'reader'},\n\nYou finished both articles. Your combined receipt is attached as a PDF.\n\nCursive`,
    attachments: [{ filename: 'cursive-combined-receipt.pdf', content: pdf, contentType: 'application/pdf' }],
  });
}

module.exports = { configured, sendCombinedReceipt };
