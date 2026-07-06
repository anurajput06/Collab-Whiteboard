/**
 * Handles: Google Sign-In (Identity Services), Email OTP, and session storage.
 * Exposes window.WhiteboardAuth with: getSession(), logout(), init(onReady)
 *
 * Auth is ADDITIVE, not a gate — this whiteboard works fully for anonymous
 * guests too (see app.js). Signing in just attaches a real name/avatar to
 * your strokes and unlocks "My Boards" history.
 */
(function () {
  const CFG = window.WHITEBOARD_CONFIG || {};
  const SESSION_KEY = 'whiteboard_session_v1';

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function setSession(token, user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  async function handleGoogleCredential(response) {
    try {
      const res = await fetch(`${CFG.SERVER_HTTP_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      setSession(data.token, data.user);
      window.location.reload();
    } catch (err) {
      document.getElementById('authError').textContent = err.message;
    }
  }

  async function requestOtp(email) {
    const errEl = document.getElementById('authError');
    errEl.textContent = '';
    try {
      const res = await fetch(`${CFG.SERVER_HTTP_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      document.getElementById('otpStep').style.display = 'block';
      document.getElementById('emailStep').style.display = 'none';
      if (data.devMode) {
        errEl.style.color = '#D97706';
        errEl.textContent = 'Dev mode: no SMTP configured — check the server console/logs for your code.';
      }
    } catch (err) {
      errEl.style.color = '#C0392B';
      errEl.textContent = err.message;
    }
  }

  async function verifyOtp(email, otp) {
    const errEl = document.getElementById('authError');
    try {
      const res = await fetch(`${CFG.SERVER_HTTP_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setSession(data.token, data.user);
      window.location.reload();
    } catch (err) {
      errEl.style.color = '#C0392B';
      errEl.textContent = err.message;
    }
  }

  function continueAsGuest() {
    document.getElementById('authModal').style.display = 'none';
  }

  function wireModal() {
    const modal = document.getElementById('authModal');
    if (getSession()) { modal.style.display = 'none'; return; }

    // Google Identity Services button
    if (window.google && CFG.GOOGLE_CLIENT_ID && !CFG.GOOGLE_CLIENT_ID.startsWith('YOUR_')) {
      google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      google.accounts.id.renderButton(document.getElementById('googleBtnContainer'), { theme: 'filled_black', size: 'large', width: 280 });
    } else {
      document.getElementById('googleBtnContainer').innerHTML =
        '<div style="font-size:11px;color:var(--text-dim);font-family:var(--mono)">Google sign-in not configured yet (set GOOGLE_CLIENT_ID in config.js)</div>';
    }

    document.getElementById('sendOtpBtn').addEventListener('click', () => {
      const email = document.getElementById('emailInput').value.trim();
      if (email) requestOtp(email);
    });
    document.getElementById('verifyOtpBtn').addEventListener('click', () => {
      const email = document.getElementById('emailInput').value.trim();
      const otp = document.getElementById('otpInput').value.trim();
      if (otp) verifyOtp(email, otp);
    });
    document.getElementById('guestBtn').addEventListener('click', continueAsGuest);
  }

  window.WhiteboardAuth = { getSession, logout, wireModal };
})();
