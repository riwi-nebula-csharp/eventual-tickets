// ─────────────────────────────────────────────
//  toast.js — Eventual Tickets · Punto de Venta
//  Sistema de notificaciones toast
// ─────────────────────────────────────────────

function showToast(message, type = 'info', duration = 4000) {
  // Remove existing toast if any
  document.getElementById('app-toast')?.remove();

  const colors = {
    success: 'border-green-500/40  bg-green-500/10  text-green-300',
    error:   'border-red-500/40    bg-red-500/10    text-red-300',
    warning: 'border-tertiary/40   bg-tertiary/10   text-tertiary',
    info:    'border-primary/40    bg-primary/10    text-primary',
  };

  const icons = {
    success: 'check_circle',
    error:   'error',
    warning: 'warning',
    info:    'info',
  };

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = `toast rounded-xl border px-5 py-4 flex items-start gap-3 shadow-2xl font-body-md text-sm ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-xl shrink-0 mt-0.5">${icons[type] || icons.info}</span>
    <span class="flex-1">${message}</span>
    <button onclick="this.closest('#app-toast').remove()" class="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
      <span class="material-symbols-outlined text-base">close</span>
    </button>`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}
