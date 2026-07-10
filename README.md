# Collab Whiteboard

**Live demo:** [time-travel-whiteboard.netlify.app](https://time-travel-whiteboard.netlify.app/)

Real-time collaborative whiteboard. Share a link, everyone who opens it
draws on the same board live — with voice chat too.

Built on a custom CRDT (not a library like Yjs), which is why undo/redo,
history scrubbing, and merging boards all work off the same data model.

## Features
- Pen / Marker / Highlighter / Eraser / Text, custom colors, adjustable size
- Undo / Redo
- Time Machine: scrub history, fork a moment into a new board, merge boards
- Save board as PNG
- Editable display name
- Presence list — see who's in the room, and who currently has their mic on
- **Voice chat** — turn your mic on, everyone else in the room hears you,
  peer-to-peer (WebRTC), no separate call app
- Collapsible activity log + Time Machine panel (auto-collapsed on small
  screens to leave more room for the board)
- Google Sign-In, email OTP, or guest — auth is optional, never required

**Note:** same room link = live sync. Different room codes are separate
boards — Fork/Merge combines them manually, they don't auto-sync.

## Run locally

```bash
cd server
npm install
npm start          # :8080

cd ../client
npx serve -l 5173
```
`client/config.js` defaults to localhost.

## Auth setup

**Google Sign-In**
1. Google Cloud Console → new project → OAuth consent screen (External)
2. Credentials → OAuth client ID → Web application
3. Add your frontend URL(s) to Authorized JavaScript origins
4. Put the Client ID in `client/config.js` **and** as `GOOGLE_CLIENT_ID` on
   the server — must match exactly or you'll get "Invalid Google credential"

**Email OTP** — uses Brevo's HTTP API (Render blocks outbound SMTP on free
tier, so Gmail SMTP won't work there):
1. Free account at brevo.com
2. Verify a single sender email
3. Generate an API key
4. Set `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`

No key set → OTP just logs to the server console (fine for local dev).

`JWT_SECRET` — any random string, signs sessions.

## Voice chat notes
- Needs mic permission — browser will prompt on first use
- If you can't hear someone: click anywhere on the page once. Browsers
  block audio autoplay until there's been a click, which can silently
  block incoming voice
- Check the 🎤 icon in the presence dropdown to confirm someone's mic is
  actually on
- Uses a public STUN server only (no TURN) — may fail on strict
  corporate/school networks

## Deploy (free)

- **Backend → Render**: push to GitHub, New → Blueprint (`render.yaml` is
  already set up). Add env vars: `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
  `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.
- **Frontend → Netlify**: update `client/config.js` with your Render URL,
  drag the `client/` folder onto netlify drop. Add the Netlify URL to
  Google's authorized origins too.

Render free tier sleeps after ~15 min idle and wipes disk on redeploy (room
data doesn't survive a redeploy, only a restart).

If you update `app.js`/`style.css` and don't see changes on mobile, bump the
`?v=` number on their `<script>`/`<link>` tags in `index.html` — browsers
cache these aggressively otherwise.

## Known limitations
- Single server instance, no Redis — won't scale past one instance as-is
- JSON file storage, not a real database
- No rate limiting on the OTP endpoint
- Renamed display names don't persist past the session

## Structure
```
server/   server.js, auth.js, users.js, emailService.js, test-client.js
client/   index.html, style.css, app.js, auth-client.js, config.js, _headers
render.yaml
docker-compose.yml
```
