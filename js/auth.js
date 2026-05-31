// ─────────────────────────────────────────────
//  auth.js — Eventual Tickets · Punto de Venta
//  Maneja login, forgot-password y guard de sesión
// ─────────────────────────────────────────────

// Redirect if already logged in
if (isSessionValid()) {
  window.location.href = 'public/dashboard.html';
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.html = btn.innerHTML;
    btn.innerHTML = `
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      VALIDANDO...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html || btn.innerHTML;
  }
}

function showError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 6000);
}

function openForgotModal() {
  const m = document.getElementById('modal-forgot');
  if (m) {
    m.classList.remove('hidden');
    document.getElementById('forgot-success')?.classList.add('hidden');
    document.getElementById('forgot-email').value = '';
  }
}
function closeForgotModal() {
  document.getElementById('modal-forgot')?.classList.add('hidden');
}

async function apiLogin(email, password) {
  const res = await fetch(`${AUTH_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function apiForgotPassword(email) {
  const res = await fetch(`${AUTH_BASE_URL}/api/auth/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const station  = document.getElementById('station').value;
  const btn      = document.getElementById('loginBtn');

  setButtonLoading(btn, true);

  try {
    const data = await apiLogin(email, password);

    if (data.success) {
      const user = data.data.user;
      const payload = decodeJwtPayload(data.data.token);
      user.permissions = payload?.permissions || [];

      if (!hasTicketsAccess(user)) {
        setButtonLoading(btn, false);
        showError('Tu cuenta no tiene acceso al portal de Punto de Venta.');
        return;
      }

      saveSession(data.data.token, user, station);

      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> ACCESO CONCEDIDO`;
      btn.classList.replace('bg-tertiary', 'bg-green-500');
      btn.classList.add('!text-white');

      setTimeout(() => window.location.href = 'public/dashboard.html', 750);
    } else {
      setButtonLoading(btn, false);
      showError(data.message || 'Credenciales inválidas.');
    }
  } catch {
    setButtonLoading(btn, false);
    showError('No se pudo conectar con el servidor. Intenta de nuevo.');
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const btn   = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const data = await apiForgotPassword(email);
    const el = document.getElementById('forgot-success');
    if (el) { el.textContent = data.message || 'Si el correo existe recibirás un enlace de recuperación.'; el.classList.remove('hidden'); }
  } catch {
    const el = document.getElementById('forgot-success');
    if (el) { el.textContent = 'Si el correo existe recibirás un enlace de recuperación.'; el.classList.remove('hidden'); }
  } finally {
    setButtonLoading(btn, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('password');
    const icon  = document.querySelector('#toggle-password .material-symbols-outlined');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.textContent = input.type === 'password' ? 'visibility' : 'visibility_off';
  });
  document.getElementById('forgot-link')?.addEventListener('click', (e) => { e.preventDefault(); openForgotModal(); });
  document.getElementById('forgot-password-form')?.addEventListener('submit', handleForgotPassword);
  document.getElementById('forgot-modal-close')?.addEventListener('click', closeForgotModal);
  document.getElementById('modal-forgot')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeForgotModal(); });
});
