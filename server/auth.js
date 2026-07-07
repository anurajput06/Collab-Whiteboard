const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendOtpEmail } = require('./emailService');
const { upsertUser, getUserByEmail } = require('./users');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-CHANGE-THIS-IN-PRODUCTION';
const JWT_EXPIRY = '30d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// In-memory OTP store: email -> {otp, expiresAt, attempts}
// Fine for a single instance; move to Redis if you scale to multiple instances.
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function signSession(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, picture: user.picture },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifySession(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifySession(token) : null;
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });
  req.user = payload;
  next();
}

const router = express.Router();

// ---- Google Sign-In ----
// Frontend uses Google Identity Services to get an ID token, sends it here.
// We verify it server-side against Google's public keys — never trust a
// client-asserted identity.
router.post('/auth/google', async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({ error: 'Google sign-in not configured (missing GOOGLE_CLIENT_ID env var)' });
  }
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const user = upsertUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: 'google',
    });
    const token = signSession(user);
    res.json({ token, user: { name: user.name, email: user.email, picture: user.picture } });
  } catch (err) {
    console.error('[auth/google] verification failed:', err.message);
    // The single most common cause: the GOOGLE_CLIENT_ID on THIS server
    // doesn't match the GOOGLE_CLIENT_ID in the deployed client/config.js —
    // Google rejects the token because the "audience" doesn't match.
    let reason = 'Invalid Google credential.';
    if (/wrong recipient|audience/i.test(err.message || '')) {
      reason = 'Invalid Google credential — the GOOGLE_CLIENT_ID on this server does not match the one in client/config.js. Double-check both are the exact same value.';
    }
    res.status(401).json({ error: reason });
  }
});

// ---- Email OTP: request code ----
router.post('/auth/otp/request', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  try {
    const result = await sendOtpEmail(email, otp);
    res.json({ sent: true, devMode: !!result.devMode }); // devMode=true means check server logs, no real email was sent
  } catch (err) {
    console.error('[auth/otp/request] send failed:', err.status || '', err.message);
    let reason = 'Failed to send the email. Check the server terminal for details.';
    if (err.status === 401) {
      reason = 'Email login was rejected — check that BREVO_API_KEY is correct.';
    } else if (err.status === 400 && /sender/i.test(err.message || '')) {
      reason = 'That sender email isn\'t verified yet — verify it under Brevo → Senders before it can send mail.';
    }
    res.status(500).json({ error: reason });
  }
});

// ---- Email OTP: verify code ----
router.post('/auth/otp/verify', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const otp = (req.body.otp || '').trim();
  const record = otpStore.get(email);

  if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });
  if (Date.now() > record.expiresAt) { otpStore.delete(email); return res.status(400).json({ error: 'OTP expired, request a new one' }); }
  record.attempts++;
  if (record.attempts > OTP_MAX_ATTEMPTS) { otpStore.delete(email); return res.status(429).json({ error: 'Too many attempts, request a new OTP' }); }
  if (record.otp !== otp) return res.status(400).json({ error: 'Incorrect code' });

  otpStore.delete(email);
  const user = upsertUser({ email, provider: 'otp' });
  const token = signSession(user);
  res.json({ token, user: { name: user.name, email: user.email, picture: user.picture } });
});

// ---- Current user ----
router.get('/auth/me', authMiddleware, (req, res) => {
  const user = getUserByEmail(req.user.email);
  res.json({ user });
});

module.exports = { router, verifySession, authMiddleware };
