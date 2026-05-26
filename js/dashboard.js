// ─────────────────────────────────────────────
//  dashboard-auth.js  —  Eventual Tickets · Punto de Venta
//  Guard de sesión, info del usuario y logout
// ─────────────────────────────────────────────

const AUTH_BASE_URL = 'https://service.auth.nebula.andrescortes.dev';

const STORAGE_KEYS = {
  TOKEN:   'et_token',
  USER:    'et_user',
  STATION: 'et_station',
};

// ── Helpers de sesión ──────────────────────────

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
  } catch {
    return null;
  }
}

function getStation() {
  return localStorage.getItem(STORAGE_KEYS.STATION) || 'pos1';
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.STATION);
}

function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isSessionValid() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

// ── Auth Guard ─────────────────────────────────

function guardSession() {
  if (!isSessionValid()) {
    clearSession();
    window.location.href = '../index.html';
    return false;
  }
  return true;
}

// ── Poblar UI con datos del usuario ───────────

const STATION_LABELS = {
  pos1: 'Taquilla Principal - 01',
  pos2: 'Taquilla Lateral - 02',
  pos3: 'Venta Corporativa - 03',
};

function loadUserIntoUI() {
  const user    = getUser();
  const station = getStation();

  if (!user) return;

  // Nombre
  const nameEl = document.getElementById('user-name-display');
  if (nameEl) nameEl.textContent = user.name || 'Vendedor';

  // Email
  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = user.email || '';

  // Estación activa
  const stationEl = document.getElementById('station-display');
  if (stationEl) stationEl.textContent = STATION_LABELS[station] || station;

  // Avatar
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    if (user.avatar_url) {
      avatarEl.src = user.avatar_url;
      avatarEl.alt = user.name;
    } else {
      // Iniciales como fallback
      const initials = (user.name || 'V')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('');
      avatarEl.outerHTML = `
        <div class="w-9 h-9 rounded-full bg-tertiary-container flex items-center justify-center font-bold text-on-tertiary text-sm" id="user-avatar">
          ${initials}
        </div>`;
    }
  }
}

// ── Logout ─────────────────────────────────────

async function logout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
  }

  try {
    await fetch(`${AUTH_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    console.warn('[dashboard-auth] logout request failed, clearing session anyway:', err);
  } finally {
    clearSession();
    window.location.href = '../index.html';
  }
}

// ── Init ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!guardSession()) return;

  loadUserIntoUI();

  document.getElementById('logout-btn')
    ?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
});