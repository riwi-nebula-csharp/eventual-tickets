// ─────────────────────────────────────────────
//  plays.js — Eventual Tickets · Punto de Venta
//  Catálogo de obras con funciones agrupadas y filtros de fecha
// ─────────────────────────────────────────────

let allPlays        = [];
let allPerformances = [];
let activeDateFilter = 'all';
let customDateFrom   = null;
let customDateTo     = null;

// ── API ────────────────────────────────────────
async function fetchPlays() {
  const data = await apiGet(`${EVENTS_BASE_URL}/api/play`);
  return data.success ? data.data : [];
}

async function fetchPerformances() {
  const data = await apiGet(`${EVENTS_BASE_URL}/api/performance`);
  return data.success ? data.data : [];
}

// ── Filtros de fecha ───────────────────────────
function matchesDateFilter(perf) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const perfDate = new Date(perf.performanceDate + 'T00:00:00');

  if (activeDateFilter === 'today') {
    return perfDate.toDateString() === today.toDateString();
  }
  if (activeDateFilter === 'week') {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return perfDate >= today && perfDate <= end;
  }
  if (activeDateFilter === 'month') {
    return perfDate.getFullYear() === today.getFullYear()
        && perfDate.getMonth()    === today.getMonth();
  }
  if (activeDateFilter === 'custom' && customDateFrom && customDateTo) {
    const from = new Date(customDateFrom + 'T00:00:00');
    const to   = new Date(customDateTo   + 'T23:59:59');
    return perfDate >= from && perfDate <= to;
  }
  return true; // 'all'
}

// ── Render catálogo de obras ───────────────────
function renderCatalog() {
  const container = document.getElementById('plays-catalog');
  if (!container) return;

  const searchVal = document.getElementById('search-play')?.value.toLowerCase() || '';

  const filteredPerfs = allPerformances.filter(p => matchesDateFilter(p));
  const perfByPlay    = {};
  filteredPerfs.forEach(p => {
    if (!perfByPlay[p.playId]) perfByPlay[p.playId] = [];
    perfByPlay[p.playId].push(p);
  });

  let plays = allPlays.filter(play => {
    const hasPerfs = perfByPlay[play.id] && perfByPlay[play.id].length > 0;
    const matchSearch = !searchVal || play.name.toLowerCase().includes(searchVal);
    return hasPerfs && matchSearch;
  });

  if (plays.length === 0) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span class="material-symbols-outlined text-5xl text-on-surface-variant/40">event_busy</span>
        <p class="text-on-surface-variant text-sm">No hay funciones para el filtro seleccionado.</p>
      </div>`;
    return;
  }

  container.innerHTML = plays.map(play => {
    const perfs = (perfByPlay[play.id] || []).sort((a, b) =>
      new Date(a.performanceDate) - new Date(b.performanceDate));

    const perfsHtml = perfs.map(p => {
      const st = getStatusInfo(p.status);
      const canSell = normalizeStatus(p.status) === 'on_sale';
      return `
        <div class="perf-row flex items-center justify-between gap-3 py-2.5 border-b border-outline-variant/40 last:border-0 group/perf" data-perf-id="${p.id}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-on-surface">${formatDate(p.performanceDate)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full border ${st.cls}">${st.label}</span>
            </div>
            <div class="flex items-center gap-3 mt-0.5">
              <span class="text-[11px] text-on-surface-variant flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">schedule</span>
                ${formatTime(p.startTime)} – ${formatTime(p.endTime)}
              </span>
              <span class="text-[11px] font-bold text-tertiary">${formatCurrency(p.ticketPrice)}</span>
            </div>
          </div>
          ${canSell
            ? `<button
                onclick="selectPerformance(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                class="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-tertiary text-on-tertiary rounded-lg text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow shadow-tertiary/20">
                <span class="material-symbols-outlined text-sm">confirmation_number</span>
                Vender
              </button>`
            : `<span class="shrink-0 text-[10px] text-on-surface-variant/50 italic pr-1">No disponible</span>`
          }
        </div>`;
    }).join('');

    return `
      <div class="play-card bg-surface-container rounded-2xl border border-outline-variant overflow-hidden flex flex-col fade-in-up">
        ${play.posterUrl
          ? `<div class="h-40 overflow-hidden bg-surface-container-high">
               <img src="${play.posterUrl}" alt="${play.name}" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity">
             </div>`
          : `<div class="h-40 bg-surface-container-high flex items-center justify-center">
               <span class="material-symbols-outlined text-5xl text-on-surface-variant/30">theaters</span>
             </div>`
        }
        <div class="p-5 flex flex-col flex-1">
          <h3 class="font-bold text-on-surface text-base mb-1 truncate">${play.name}</h3>
          ${play.description
            ? `<p class="text-xs text-on-surface-variant line-clamp-2 mb-3">${play.description}</p>`
            : ''
          }
          <div class="flex-1 mt-2">
            <p class="text-[11px] uppercase tracking-widest text-on-surface-variant/60 mb-2 font-label-sm">Funciones</p>
            <div>${perfsHtml}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Inicializar catálogo ───────────────────────
async function initPlaysCatalog() {
  const container = document.getElementById('plays-catalog');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full flex items-center justify-center gap-3 py-20">
      <svg class="animate-spin h-7 w-7 text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-sm text-on-surface-variant">Cargando cartelera...</p>
    </div>`;

  try {
    [allPlays, allPerformances] = await Promise.all([fetchPlays(), fetchPerformances()]);
    renderCatalog();
  } catch (err) {
    console.error('[plays] init error:', err);
    container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <span class="material-symbols-outlined text-4xl text-error/60 block mb-2">cloud_off</span>
        <p class="text-sm text-on-surface-variant">Error al cargar la cartelera. Intenta recargar la página.</p>
      </div>`;
  }
}

// ── Bind filtros (llamar tras renderizar HTML de la vista) ──
function bindCatalogFilters() {
  // Chips de filtro rápido
  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeDateFilter = chip.dataset.filter;
      document.querySelectorAll('.filter-chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      // Mostrar/ocultar inputs custom
      const customBox = document.getElementById('custom-date-box');
      if (customBox) customBox.classList.toggle('hidden', activeDateFilter !== 'custom');
      renderCatalog();
    });
  });

  // Inputs fecha custom
  document.getElementById('filter-date-from')?.addEventListener('change', (e) => {
    customDateFrom = e.target.value;
    if (activeDateFilter === 'custom') renderCatalog();
  });
  document.getElementById('filter-date-to')?.addEventListener('change', (e) => {
    customDateTo = e.target.value;
    if (activeDateFilter === 'custom') renderCatalog();
  });

  // Búsqueda por nombre
  document.getElementById('search-play')?.addEventListener('input', () => renderCatalog());
}
