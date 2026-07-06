/**
 * Minimal file-backed user store.
 * In production, swap this for a real DB (Postgres) — see README "Scaling up".
 * Passwordless by design: identity is proven either by Google or by owning
 * the email inbox that received the OTP, so there's no password to store,
 * hash, or leak.
 */
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function loadAll() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveAll(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function upsertUser({ email, name, picture, provider }) {
  const users = loadAll();
  const existing = users[email];
  const user = {
    id: existing?.id || Buffer.from(email).toString('base64url').slice(0, 16),
    email,
    name: name || existing?.name || email.split('@')[0],
    picture: picture || existing?.picture || null,
    provider: provider || existing?.provider || 'otp',
    createdAt: existing?.createdAt || Date.now(),
    lastLoginAt: Date.now(),
    rooms: existing?.rooms || [], // room ids this user has created/joined (for "My Boards")
  };
  users[email] = user;
  saveAll(users);
  return user;
}

function getUserByEmail(email) {
  return loadAll()[email] || null;
}

function addRoomToUser(email, roomId) {
  const users = loadAll();
  const user = users[email];
  if (!user) return;
  if (!user.rooms.includes(roomId)) {
    user.rooms.unshift(roomId);
    user.rooms = user.rooms.slice(0, 50); // cap history
    saveAll(users);
  }
}

module.exports = { upsertUser, getUserByEmail, addRoomToUser };
