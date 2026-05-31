// ─────────────────────────────────────────────
//  navigation.js — Eventual Tickets · Punto de Venta
//  Control de vistas SPA del dashboard
// ─────────────────────────────────────────────

const VIEWS = {
  catalog:   { title: 'Catálogo y Venta',    icon: 'add_shopping_cart' },
  historial: { title: 'Historial de Ventas', icon: 'receipt_long'      },
  'seat-map':{ title: 'Selección de Asientos', icon: 'chair'           },
};

function switchTab(viewId) {
  document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('fade-in-up');
    setTimeout(() => target.classList.remove('fade-in-up'), 400);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-tertiary-container', 'text-on-tertiary-container', 'font-bold');
    item.classList.add('text-on-surface-variant');
  });
  const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (activeNav) {
    activeNav.classList.add('bg-tertiary-container', 'text-on-tertiary-container', 'font-bold');
    activeNav.classList.remove('text-on-surface-variant');
  }

  const info = VIEWS[viewId];
  const titleEl = document.getElementById('page-title');
  if (titleEl && info) titleEl.textContent = info.title;

  if (viewId === 'catalog') {
    currentPerformance = null;
    selectedSeats      = [];
  }

  if (viewId === 'historial') {
    loadHistorial();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.view));
  });
  switchTab('catalog');
});