// ─────────────────────────────────────────────
//  historial.js — Eventual Tickets · Punto de Venta
//  Historial de ventas con filtros de fecha
// ─────────────────────────────────────────────

let historialData    = [];
let activeHistFilter = 'today';
let histCustomDate   = null;

// ── Rango de fechas según filtro ───────────────
function getHistDateRange() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (activeHistFilter === 'today') {
    const end = new Date(today); end.setHours(23, 59, 59);
    return { from: today, to: end };
  }
  if (activeHistFilter === 'week') {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    const to   = new Date(today); to.setHours(23, 59, 59);
    return { from, to };
  }
  if (activeHistFilter === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to   = new Date(today); to.setHours(23, 59, 59);
    return { from, to };
  }
  if (activeHistFilter === 'date' && histCustomDate) {
    const from = new Date(histCustomDate + 'T00:00:00');
    const to   = new Date(histCustomDate + 'T23:59:59');
    return { from, to };
  }
  return null;
}

// ── API ────────────────────────────────────────
async function fetchHistorial() {
  const data = await apiGet(`${EVENTS_BASE_URL}/api/purchase/my`);
  return data.success ? data.data : [];
}

// ── Filtrar localmente por fecha ───────────────
function filterByRange(purchases) {
  const range = getHistDateRange();
  if (!range) return purchases;
  return purchases.filter(p => {
    const d = new Date(p.createdAt);
    return d >= range.from && d <= range.to;
  });
}

// ── Render tarjetas de resumen ─────────────────
function renderSummaryCards(purchases) {
  const container = document.getElementById('hist-summary-cards');
  if (!container) return;

  const total   = purchases.length;
  const revenue = purchases.reduce((s, p) => s + (p.totalPrice || 0), 0);
  const tickets = purchases.reduce((s, p) => s + (p.ticketCount || 0), 0);

  container.innerHTML = `
    <div class="bg-surface-container rounded-xl border border-outline-variant p-4 flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-tertiary">receipt</span>
      </div>
      <div>
        <p class="text-2xl font-bold text-on-surface">${total}</p>
        <p class="text-xs text-on-surface-variant uppercase tracking-widest">Ventas</p>
      </div>
    </div>
    <div class="bg-surface-container rounded-xl border border-outline-variant p-4 flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-tertiary">confirmation_number</span>
      </div>
      <div>
        <p class="text-2xl font-bold text-on-surface">${tickets}</p>
        <p class="text-xs text-on-surface-variant uppercase tracking-widest">Boletas</p>
      </div>
    </div>
    <div class="bg-surface-container rounded-xl border border-outline-variant p-4 flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-tertiary">payments</span>
      </div>
      <div>
        <p class="text-xl font-bold text-tertiary">${formatCurrency(revenue)}</p>
        <p class="text-xs text-on-surface-variant uppercase tracking-widest">Recaudado</p>
      </div>
    </div>`;
}

// ── Render tabla ───────────────────────────────
function renderHistTable(purchases) {
  const container = document.getElementById('hist-table-container');
  const countEl   = document.getElementById('hist-count-label');
  if (!container) return;

  if (countEl) countEl.textContent = `${purchases.length} registro${purchases.length !== 1 ? 's' : ''}`;

  if (purchases.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant/30">receipt_long</span>
        <p class="text-sm text-on-surface-variant">No hay ventas en este período.</p>
      </div>`;
    return;
  }

  const sorted = [...purchases].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusCls = {
    completed: 'bg-green-500/15 text-green-400 border-green-500/30',
    pending:   'bg-blue-500/15  text-blue-400  border-blue-500/30',
    failed:    'bg-red-500/15   text-red-400   border-red-500/30',
    refunded:  'bg-outline-variant text-on-surface-variant border-outline-variant',
  };
  const statusLabel = {
    completed: 'Completada',
    pending:   'Pendiente',
    failed:    'Fallida',
    refunded:  'Reembolsada',
  };

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-outline-variant text-left">
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">#</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Obra</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Función</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Boletas</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Total</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Estado</th>
            <th class="px-5 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant font-label-sm">Hora</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((p, i) => {
            const st    = (p.status || 'completed').toLowerCase();
            const cls   = statusCls[st]   || statusCls.completed;
            const label = statusLabel[st] || p.status;
            const hora  = new Date(p.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            return `
              <tr class="border-b border-outline-variant/40 hover:bg-surface-container transition-colors ${i % 2 === 0 ? '' : 'bg-surface-container/30'}">
                <td class="px-5 py-3.5 font-label-sm text-on-surface-variant text-xs">#${p.id}</td>
                <td class="px-5 py-3.5 font-bold text-on-surface">${p.playName || '—'}</td>
                <td class="px-5 py-3.5 text-on-surface-variant text-xs">
                  ${p.performanceDate ? formatDate(p.performanceDate) : '—'}<br>
                  <span class="text-tertiary/70">${p.startTime ? formatTime(p.startTime) : ''}</span>
                </td>
                <td class="px-5 py-3.5 text-center">
                  <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-tertiary/15 text-tertiary font-bold text-xs">${p.ticketCount}</span>
                </td>
                <td class="px-5 py-3.5 font-bold text-tertiary">${formatCurrency(p.totalPrice)}</td>
                <td class="px-5 py-3.5">
                  <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cls}">${label}</span>
                </td>
                <td class="px-5 py-3.5 text-xs text-on-surface-variant">${hora}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Cargar y renderizar ────────────────────────
async function loadHistorial() {
  const tableContainer   = document.getElementById('hist-table-container');
  const summaryContainer = document.getElementById('hist-summary-cards');
  if (!tableContainer) return;

  if (summaryContainer) summaryContainer.innerHTML = `
    <div class="col-span-3 flex items-center gap-2 py-4">
      <svg class="animate-spin h-4 w-4 text-tertiary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs text-on-surface-variant">Cargando...</p>
    </div>`;

  tableContainer.innerHTML = '';

  try {
    const all     = await fetchHistorial();
    historialData = filterByRange(all);
    renderSummaryCards(historialData);
    renderHistTable(historialData);
  } catch (err) {
    console.error('[historial]', err);
    tableContainer.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-3xl text-error/50 block mb-2">cloud_off</span>
        <p class="text-sm text-on-surface-variant">Error al cargar el historial.</p>
      </div>`;
  }
}

// ── Init listeners ─────────────────────────────
function initHistorial() {
  document.querySelectorAll('.filter-chip[data-hist-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeHistFilter = chip.dataset.histFilter;
      document.querySelectorAll('.filter-chip[data-hist-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const dateBox = document.getElementById('hist-date-box');
      if (dateBox) dateBox.classList.toggle('hidden', activeHistFilter !== 'date');
      if (activeHistFilter !== 'date') loadHistorial();
    });
  });

  document.getElementById('hist-date-input')?.addEventListener('change', (e) => {
    histCustomDate = e.target.value;
    if (histCustomDate) loadHistorial();
  });

  document.getElementById('btn-refresh-historial')?.addEventListener('click', loadHistorial);
}