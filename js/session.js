// ─────────────────────────────────────────────
//  session.js — Eventual Tickets · Punto de Venta
//  Helpers de sesión compartidos por todas las vistas
// ─────────────────────────────────────────────

const AUTH_BASE_URL   = 'https://service.auth.nebula.andrescortes.dev';
const EVENTS_BASE_URL = 'https://service.events.nebula.andrescortes.dev';

const STORAGE_KEYS = {
  TOKEN:   'et_token',
  USER:    'et_user',
  STATION: 'et_station',
};

const STATION_LABELS = {
  pos1: 'Taquilla Principal · 01',
  pos2: 'Taquilla Lateral · 02',
  pos3: 'Venta Corporativa · 03',
};

function saveSession(token, user, station) {
  localStorage.setItem(STORAGE_KEYS.TOKEN,   token);
  localStorage.setItem(STORAGE_KEYS.USER,    JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.STATION, station);
}

function clearSession() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}

function getToken()   { return localStorage.getItem(STORAGE_KEYS.TOKEN); }
function getStation() { return localStorage.getItem(STORAGE_KEYS.STATION) || 'pos1'; }

function getUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)); }
  catch { return null; }
}

function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1];
    return JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function isSessionValid() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  return payload ? payload.exp * 1000 > Date.now() : false;
}

function hasTicketsAccess(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'employee' && Array.isArray(user.permissions)
    && user.permissions.includes('tickets');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

async function apiGet(url) {
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(url, body) {
  const res = await fetch(url, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  return res.json();
}

// ── Formatters ─────────────────────────────────
function formatCurrency(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(n);
}

function formatDate(str) {
  const d = new Date(str + (str.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(t) { return t ? t.slice(0, 5) : ''; }

function normalizeStatus(status) {
  // Soporta tanto string como número (enum del backend)
  const map = { 0: 'scheduled', 1: 'on_sale', 2: 'sold_out', 3: 'finished' };
  if (typeof status === 'number') return map[status] || 'scheduled';
  return status; // ya es string, pasa directo
}

function getStatusInfo(status) {
  const s = normalizeStatus(status);
  return {
    on_sale:   { label: 'En venta',   cls: 'bg-green-500/20 text-green-400  border-green-500/30' },
    scheduled: { label: 'Próxima',    cls: 'bg-blue-500/20  text-blue-400   border-blue-500/30'  },
    sold_out:  { label: 'Agotada',    cls: 'bg-red-500/20   text-red-400    border-red-500/30'   },
    finished:  { label: 'Finalizada', cls: 'bg-surface-container text-on-surface-variant border-outline-variant' },
  }[s] || { label: s, cls: 'bg-surface-container text-on-surface-variant' };
}
