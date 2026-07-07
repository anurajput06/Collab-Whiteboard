/**
 * Sends OTP emails via Brevo's HTTP REST API (api.brevo.com) — NOT SMTP.
 *
 * Why not SMTP? Render's free tier blocks all outbound traffic to SMTP
 * ports (25, 465, 587) as of September 2025. Since this project's README
 * recommends Render for the free backend deploy, SMTP-based sending
 * (Gmail, or any other SMTP provider) will simply time out there — it's a
 * platform restriction, not a config bug. Brevo's API is a plain HTTPS
 * POST, so it works fine on Render's free tier.
 *
 * Setup (free, no credit card):
 *   1. Sign up at https://www.brevo.com (free forever: 300 emails/day).
 *   2. Verify a "single sender" email (Settings/Senders — no domain or DNS
 *      needed, just click a confirmation link sent to that inbox).
 *   3. Get an API key: Settings -> SMTP & API -> API Keys -> Generate a new key.
 *   4. Set env vars:
 *        BREVO_API_KEY=xkeysib-...
 *        BREVO_SENDER_EMAIL=<the address you verified as a single sender>
 *
 * If BREVO_API_KEY isn't set, OTPs are logged to the server console instead
 * of emailed — useful for local development.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendOtpEmail(toEmail, otp) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.log(`[email:DEV MODE - no BREVO_API_KEY/BREVO_SENDER_EMAIL configured] OTP for ${toEmail} is: ${otp}`);
    return { devMode: true };
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Collab Whiteboard', email: senderEmail },
      to: [{ email: toEmail }],
      subject: `${otp} is your Whiteboard sign-in code`,
      htmlContent: `<div style="font-family:sans-serif;padding:24px">
        <h2 style="margin:0 0 12px">Your sign-in code</h2>
        <p style="font-size:28px;letter-spacing:4px;font-weight:700">${otp}</p>
        <p style="color:#666">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>`,
      textContent: `Your sign-in code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Brevo API request failed (${res.status}): ${body}`);
    err.status = res.status;
    throw err;
  }

  return { devMode: false };
}

module.exports = { sendOtpEmail };
