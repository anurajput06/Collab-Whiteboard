# Collab Whiteboard

Real-time collaborative whiteboard. Share a link, everyone who opens it
draws on the same board live.

Built on a custom CRDT (not a library like Yjs), which is why undo/redo,
history scrubbing, and merging boards all work off the same data model.


**Demo link**- https://time-travel-whiteboard.netlify.app/
## Features
- Pen / Marker / Highlighter / Eraser / Text, custom colors, adjustable size
- Undo / Redo
- Time Machine: scrub history, fork a moment into a new board, merge boards
- Save board as PNG
- Editable display name (session-only)
- Presence list (click "N people here")
- Collapsible activity log + Time Machine panel
- Google Sign-In, email OTP, or guest — auth is optional

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

## Deploy (free)

- **Backend → Render**: push to GitHub, New → Blueprint (`render.yaml` is
  already set up). Add env vars: `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
  `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`.
- **Frontend → Netlify**: update `client/config.js` with your Render URL,
  drag the `client/` folder onto netlify drop. Add the Netlify URL to
  Google's authorized origins too.

Render free tier sleeps after ~15 min idle and wipes disk on redeploy (room
data doesn't survive a redeploy, only a restart).

## Known limitations
- Single server instance, no Redis — won't scale past one instance as-is
- JSON file storage, not a real database
- No rate limiting on the OTP endpoint
- Renamed display names don't persist past the session

## Structure
```
server/   server.js, auth.js, users.js, emailService.js, test-client.js
client/   index.html, style.css, app.js, auth-client.js, config.js
render.yaml
docker-compose.yml
```
