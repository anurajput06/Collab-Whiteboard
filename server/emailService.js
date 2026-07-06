/**
 * Sends OTP emails via SMTP. Configure with env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *
 * Works with:
 *  - Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=you@gmail.com,
 *           SMTP_PASS=<16-char Gmail App Password> (NOT your normal password —
 *           see README "Auth setup" for how to generate one, it's free).
 *  - Any free transactional provider (Resend, Brevo, Mailtrap, etc.) — just
 *    point SMTP_HOST/PORT/USER/PASS at whatever they give you.
 *
 * If no SMTP_* env vars are set, OTPs are logged to the server console instead
 * of emailed — this lets you develop/test locally without configuring email.
 */
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendOtpEmail(toEmail, otp) {
  if (!transporter) {
    console.log(`[email:DEV MODE - no SMTP configured] OTP for ${toEmail} is: ${otp}`);
    return { devMode: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `${otp} is your Whiteboard sign-in code`,
    text: `Your sign-in code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<div style="font-family:sans-serif;padding:24px">
      <h2 style="margin:0 0 12px">Your sign-in code</h2>
      <p style="font-size:28px;letter-spacing:4px;font-weight:700">${otp}</p>
      <p style="color:#666">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>`,
  });
  return { devMode: false };
}

module.exports = { sendOtpEmail };
