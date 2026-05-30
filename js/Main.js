// ─────────────────────────────────────────────
//  main.js  —  Eventual Tickets · Punto de Venta
//  Consume API de eventos y asientos
// ─────────────────────────────────────────────

const EVENTS_BASE_URL = 'https://service.events.nebula.andrescortes.dev';

// ── Estado global ──────────────────────────────
let performances = [];
let selectedPerformance = null;
let selectedSeats = [];

// ── Helpers ────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  return timeStr ? timeStr.slice(0, 5) : '';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function getStatusLabel(status) {
  const map = {
    on_sale:   { label: 'En venta',   cls: 'bg-green-500/20 text-green-400' },
    scheduled: { label: 'Programada', cls: 'bg-blue-500/20 text-blue-400' },
    sold_out:  { label: 'Agotada',    cls: 'bg-red-500/20 text-red-400' },
    finished:  { label: 'Finalizada', cls: 'bg-outline-variant text-on-surface-variant' },
  };
  return map[status] || { label: status, cls: 'bg-outline-variant text-on-surface-variant' };
}

// ── API ────────────────────────────────────────

async function fetchPerformances() {
  const res = await fetch(`${EVENTS_BASE_URL}/api/performance`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });
  const data = await res.json();
  return data.success ? data.data : [];
}

async function fetchSeatMap(performanceId) {
  const res = await fetch(`${EVENTS_BASE_URL}/api/performance/${performanceId}/seats`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });
  const data = await res.json();
  return data.success ? data.data : null;
}

// ── Render funciones ───────────────────────────

function renderPerformanceList(list, filter = '') {
  const container = document.getElementById('performance-list');
  if (!container) return;

  const filtered = filter
    ? list.filter(p => p.playName.toLowerCase().includes(filter.toLowerCase()))
    : list;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-sm text-on-surface-variant italic text-center py-8">No hay funciones disponibles.</p>`;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isSelected = selectedPerformance?.id === p.id;
    const status = getStatusLabel(p.status);
    return `
      <div class="p-4 rounded-xl border-2 ${isSelected ? 'border-tertiary bg-tertiary/5' : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'} 
           cursor-pointer transition-all group performance-card" data-id="${p.id}">
        <div class="flex justify-between items-start mb-1">
          <h4 class="font-bold ${isSelected ? 'text-tertiary' : 'text-on-surface group-hover:text-tertiary'} transition-colors text-sm leading-tight">${p.playName}</h4>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${status.cls} ml-2 shrink-0">${status.label}</span>
        </div>
        <p class="text-xs text-on-surface-variant mt-1">${formatDate(p.performanceDate)} • ${formatTime(p.startTime)}</p>
        <p class="text-xs font-bold text-tertiary mt-1">${formatCurrency(p.ticketPrice)}</p>
      </div>`;
  }).join('');

  container.querySelectorAll('.performance-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const perf = performances.find(p => p.id === id);
      if (perf) selectPerformance(perf);
    });
  });
}

// ── Seleccionar función y cargar asientos ──────

async function selectPerformance(perf) {
  selectedPerformance = perf;
  selectedSeats = [];
  updateSummary();
  renderPerformanceList(performances);

  document.getElementById('seat-map-title').textContent = perf.playName;
  document.getElementById('seat-map-subtitle').textContent =
    `${formatDate(perf.performanceDate)} • ${formatTime(perf.startTime)}`;

  document.getElementById('summary-play-name').textContent = perf.playName;
  document.getElementById('summary-play-date').textContent =
    `${formatDate(perf.performanceDate)} • ${formatTime(perf.startTime)}`;

  const mapContainer = document.getElementById('seat-map-container');
  mapContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-16 gap-3">
      <svg class="animate-spin h-8 w-8 text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-sm text-on-surface-variant">Cargando mapa de asientos...</p>
    </div>`;

  const seatMap = await fetchSeatMap(perf.id);
  if (seatMap) {
    renderSeatMap(seatMap, perf.ticketPrice);
  } else {
    mapContainer.innerHTML = `<p class="text-center text-on-surface-variant py-8">No se pudo cargar el mapa de asientos.</p>`;
  }
}

// ── Render mapa de asientos ────────────────────

function renderSeatMap(seatMap, ticketPrice) {
  const container = document.getElementById('seat-map-container');

  const infoEl = document.getElementById('seat-availability-info');
  if (infoEl) {
    infoEl.textContent = `${seatMap.availableSeats} / ${seatMap.totalSeats} disponibles`;
  }

  if (!seatMap.rows || seatMap.rows.length === 0) {
    container.innerHTML = `<p class="text-center text-on-surface-variant py-8">No hay asientos configurados.</p>`;
    return;
  }

  container.innerHTML = `<div class="flex flex-col gap-2">${
    seatMap.rows.map(row => `
      <div class="flex items-center gap-3 seat-row" data-row="${row.rowName}" data-price="${ticketPrice}">
        <span class="text-xs font-bold text-tertiary w-4 text-right shrink-0">${row.rowName}</span>
        <div class="flex justify-center gap-2 flex-1">
          ${row.seats.map(seat => {
            const isOccupied = seat.status === 'occupied';
            return `<div class="flex flex-col items-center gap-0.5">
              <div
                class="seat ${isOccupied ? 'unavailable' : 'available'} ${isOccupied ? '' : 'cursor-pointer'}"
                data-id="${row.rowName}-${seat.seatNumber}"
                data-seat-order="${seat.seatOrder}"
                title="${isOccupied ? 'Ocupado' : 'Fila ' + row.rowName + ' Asiento ' + seat.seatNumber}"
              ></div>
              <span class="text-[8px] text-on-surface-variant leading-none">${seat.seatNumber}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('')
  }</div>`;

  container.querySelectorAll('.seat.available').forEach(seatEl => {
    seatEl.addEventListener('click', function () {
      const seatId    = this.dataset.id;
      const seatOrder = parseInt(this.dataset.seatOrder);
      const row       = this.closest('.seat-row').dataset.row;
      const price     = parseFloat(this.closest('.seat-row').dataset.price);

      if (this.classList.contains('selected')) {
        this.classList.remove('selected');
        this.classList.add('available');
        selectedSeats = selectedSeats.filter(s => s.id !== seatId);
      } else {
        this.classList.add('selected');
        selectedSeats.push({ id: seatId, seatOrder, row, price });
      }
      updateSummary();
    });
  });
}

// ── Resumen de compra ──────────────────────────

function updateSummary() {
  const container   = document.getElementById('summary-items');
  const totalEl     = document.getElementById('total-price');
  const checkoutBtn = document.getElementById('btn-checkout');

  if (selectedSeats.length === 0) {
    container.innerHTML = `<p class="text-sm text-on-surface-variant italic py-4 text-center">No hay asientos seleccionados</p>`;
    totalEl.textContent = formatCurrency(0);
    checkoutBtn.disabled = true;
    checkoutBtn.className = 'w-full bg-outline-variant text-on-surface-variant py-4 rounded-xl font-bold uppercase tracking-widest transition-all cursor-not-allowed';
    return;
  }

  let total = 0;
  let html = '<div class="space-y-4">';
  selectedSeats.forEach(seat => {
    total += seat.price;
    html += `
      <div class="flex justify-between items-center animate-in fade-in slide-in-from-right-2">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-tertiary text-sm">chair</span>
          <p class="text-sm font-bold text-on-surface">Fila ${seat.row} • Asiento ${seat.id.split('-')[1]}</p>
        </div>
        <p class="font-bold text-on-surface text-sm">${formatCurrency(seat.price)}</p>
      </div>`;
  });
  html += '</div>';

  container.innerHTML = html;
  totalEl.textContent = formatCurrency(total);
  checkoutBtn.disabled = false;
  checkoutBtn.className = 'w-full bg-tertiary text-on-tertiary py-4 rounded-xl font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-tertiary/20';
}

// ── Init ───────────────────────────────────────

async function initDashboard() {
  const listContainer = document.getElementById('performance-list');
  if (!listContainer) return;

  listContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-8 gap-2">
      <svg class="animate-spin h-6 w-6 text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs text-on-surface-variant">Cargando funciones...</p>
    </div>`;

  try {
    performances = await fetchPerformances();
    renderPerformanceList(performances);

    const firstOnSale = performances.find(p => p.status === 'on_sale') || performances[0];
    if (firstOnSale) selectPerformance(firstOnSale);
  } catch (err) {
    listContainer.innerHTML = `<p class="text-sm text-red-400 italic text-center py-8">Error al cargar funciones.</p>`;
    console.error('[main] fetchPerformances error:', err);
  }

  document.getElementById('search-performance')?.addEventListener('input', (e) => {
    renderPerformanceList(performances, e.target.value);
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);