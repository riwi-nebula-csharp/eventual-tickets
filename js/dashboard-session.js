// ─────────────────────────────────────────────
//  dashboard-session.js — Punto de Venta
//  Guard de sesión + info usuario en dashboard
// ─────────────────────────────────────────────

function guardSession() {
  if (!isSessionValid()) {
    clearSession();
    window.location.href = '../index.html';
    return false;
  }
  return true;
}

function loadUserIntoUI() {
  const user    = getUser();
  const station = getStation();
  if (!user) return;

  const nameEl    = document.getElementById('user-name-display');
  const emailEl   = document.getElementById('user-email-display');
  const stationEl = document.getElementById('station-display');
  const avatarWrap = document.getElementById('user-avatar-wrap');

  if (nameEl)    nameEl.textContent    = user.name  || 'Vendedor';
  if (emailEl)   emailEl.textContent   = user.email || '';
  if (stationEl) stationEl.textContent = STATION_LABELS[station] || station;

  if (avatarWrap) {
    if (user.avatar_url) {
      avatarWrap.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}" class="w-full h-full object-cover">`;
    } else {
      const initials = (user.name || 'V').split(' ').map(n => n[0]).slice(0, 2).join('');
      avatarWrap.innerHTML = `<span class="font-bold text-sm text-on-tertiary-container">${initials}</span>`;
    }
  }
}

async function logout() {
  const btn = document.getElementById('logout-btn');
  if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; }

  try {
    await fetch(`${AUTH_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Accept': 'application/json' },
    });
  } catch (e) { console.warn('[session] logout error ignored', e); }

  clearSession();
  window.location.href = '../index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!guardSession()) return;
  loadUserIntoUI();
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault(); logout();
  });
});
