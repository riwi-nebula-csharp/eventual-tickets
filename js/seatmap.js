// ─────────────────────────────────────────────
//  seatmap.js — Eventual Tickets · Punto de Venta
//  Mapa de asientos 10x10, selección, resumen,
//  lookup de cliente por email, compra y impresión
// ─────────────────────────────────────────────

let currentPerformance = null;
let currentSeatMap     = null;
let selectedSeats      = [];   // [{ seatOrder, row, seatNum, price }]
let clientInfo         = null; // { email, name } | null

// ── API ────────────────────────────────────────
async function fetchSeatMap(performanceId) {
  const data = await apiGet(`${EVENTS_BASE_URL}/api/performance/${performanceId}/seats`);
  return data.success ? data.data : null;
}

// ── Seleccionar función → abrir pantalla de cliente ──
async function selectPerformance(perf) {
  currentPerformance = perf;
  selectedSeats      = [];
  clientInfo         = null;

  switchTab('seat-map');
  updateSeatSummary();

  // Mostrar step de cliente primero
  showClientStep();
}

// ══════════════════════════════════════════════
//  STEP 1 — Identificación del cliente
// ══════════════════════════════════════════════
function showClientStep() {
  const area = document.getElementById('seat-map-area');
  area.innerHTML = `
    <button id="btn-back-catalog"
      class="flex items-center gap-2 text-on-surface-variant hover:text-tertiary transition-colors text-sm mb-6">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      Volver al catálogo
    </button>

    <div class="max-w-lg mx-auto">
      <!-- Info de la función -->
      <div class="bg-surface-container rounded-xl border border-outline-variant p-4 mb-6 flex items-start gap-3">
        <span class="material-symbols-outlined text-tertiary text-xl mt-0.5">theaters</span>
        <div>
          <p class="font-bold text-on-surface text-base">${currentPerformance.playName}</p>
          <p class="text-sm text-on-surface-variant mt-0.5">
            ${formatDate(currentPerformance.performanceDate)} · 
            ${formatTime(currentPerformance.startTime)} – ${formatTime(currentPerformance.endTime)}
          </p>
          <p class="text-sm font-bold text-tertiary mt-0.5">${formatCurrency(currentPerformance.ticketPrice)} / boleta</p>
        </div>
      </div>

      <!-- Formulario de correo -->
      <div class="bg-surface-container-high rounded-2xl border border-outline-variant p-7">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-tertiary text-sm">person_search</span>
          </div>
          <h3 class="font-bold text-on-surface text-base">Identificar Cliente</h3>
        </div>
        <p class="text-sm text-on-surface-variant mb-6 ml-11">
          Ingresa el correo del cliente para asociar la boleta a su cuenta. Si no tiene cuenta, la venta se registra de todas formas.
        </p>

        <div class="space-y-3">
          <label class="font-label-sm text-[11px] uppercase tracking-widest text-tertiary block">Correo electrónico</label>
          <div class="flex gap-2">
            <input
              id="client-email-input"
              type="email"
              placeholder="cliente@correo.com"
              class="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none placeholder:text-on-surface-variant/40">
            <button id="btn-lookup-client"
              class="px-4 py-3 bg-tertiary text-on-tertiary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0">
              <span class="material-symbols-outlined text-base">search</span>
              Buscar
            </button>
          </div>

          <!-- Resultado del lookup -->
          <div id="client-lookup-result" class="hidden"></div>
        </div>

        <div class="flex gap-3 mt-7">
          <button id="btn-skip-client"
            class="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors font-bold text-sm">
            Continuar sin cuenta
          </button>
          <button id="btn-proceed-with-client"
            class="flex-1 py-3 rounded-xl bg-tertiary text-on-tertiary font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all hidden">
            <span class="material-symbols-outlined text-base">chair</span>
            Seleccionar asientos
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-back-catalog')?.addEventListener('click', () => switchTab('catalog'));
  document.getElementById('btn-lookup-client')?.addEventListener('click', handleClientLookup);
  document.getElementById('client-email-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleClientLookup();
  });
  document.getElementById('btn-skip-client')?.addEventListener('click', () => {
    clientInfo = null;
    showSeatMapStep();
  });
  document.getElementById('btn-proceed-with-client')?.addEventListener('click', showSeatMapStep);
}

async function handleClientLookup() {
  const email  = document.getElementById('client-email-input')?.value.trim();
  const result = document.getElementById('client-lookup-result');
  const btn    = document.getElementById('btn-lookup-client');
  const proceedBtn = document.getElementById('btn-proceed-with-client');

  if (!email || !result) return;

  // Loading
  btn.disabled  = true;
  btn.innerHTML = `<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
  result.classList.remove('hidden');
  result.innerHTML = `<p class="text-xs text-on-surface-variant italic py-1">Buscando...</p>`;

  try {
    // Intentar buscar por email vía auth service
    const data = await apiGet(`${AUTH_BASE_URL}/api/internal/users/by-email?email=${encodeURIComponent(email)}`);

    if (data.success && data.data) {
      const user = data.data;
      clientInfo = { email: user.email, name: user.name, id: user.id };

      result.innerHTML = `
        <div class="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 fade-in-up">
          <span class="material-symbols-outlined text-green-400 text-xl">check_circle</span>
          <div>
            <p class="text-sm font-bold text-on-surface">${user.name}</p>
            <p class="text-xs text-on-surface-variant">${user.email} · Cuenta registrada</p>
          </div>
        </div>`;
      proceedBtn?.classList.remove('hidden');
      document.getElementById('btn-skip-client').textContent = 'Cambiar correo';
    } else {
      // No encontrado — igual guardar el correo para la boleta
      clientInfo = { email, name: null, id: null };

      result.innerHTML = `
        <div class="flex items-center gap-3 bg-tertiary/8 border border-tertiary/20 rounded-xl px-4 py-3 fade-in-up">
          <span class="material-symbols-outlined text-tertiary text-xl">info</span>
          <div>
            <p class="text-sm text-on-surface">No se encontró cuenta para <span class="font-bold">${email}</span></p>
            <p class="text-xs text-on-surface-variant">La venta se registrará y el QR se puede imprimir igual.</p>
          </div>
        </div>`;
      proceedBtn?.classList.remove('hidden');
      document.getElementById('btn-skip-client').textContent = 'Cambiar correo';
    }
  } catch {
    // El endpoint interno puede no estar disponible desde frontend — guardar email igual
    clientInfo = { email, name: null, id: null };

    result.innerHTML = `
      <div class="flex items-center gap-3 bg-tertiary/8 border border-tertiary/20 rounded-xl px-4 py-3 fade-in-up">
        <span class="material-symbols-outlined text-tertiary text-xl">mail</span>
        <div>
          <p class="text-sm text-on-surface">Correo registrado: <span class="font-bold">${email}</span></p>
          <p class="text-xs text-on-surface-variant">Se incluirá en la boleta impresa.</p>
        </div>
      </div>`;
    proceedBtn?.classList.remove('hidden');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<span class="material-symbols-outlined text-base">search</span> Buscar`;
  }
}

// ══════════════════════════════════════════════
//  STEP 2 — Mapa de asientos
// ══════════════════════════════════════════════
async function showSeatMapStep() {
  const area = document.getElementById('seat-map-area');
  area.innerHTML = `
    <button id="btn-back-client"
      class="flex items-center gap-2 text-on-surface-variant hover:text-tertiary transition-colors text-sm mb-5">
      <span class="material-symbols-outlined text-base">arrow_back</span>
      Volver / Cambiar cliente
    </button>

    <!-- Info función + cliente -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div>
        <h3 class="font-bold text-on-surface text-xl" id="seatmap-play-name">${currentPerformance.playName}</h3>
        <div class="flex flex-wrap items-center gap-3 mt-1">
          <span class="text-sm text-on-surface-variant flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            ${formatDate(currentPerformance.performanceDate)} · ${formatTime(currentPerformance.startTime)} – ${formatTime(currentPerformance.endTime)}
          </span>
          <span class="text-sm font-bold text-tertiary flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">confirmation_number</span>
            ${formatCurrency(currentPerformance.ticketPrice)} / boleta
          </span>
          <span class="text-xs bg-surface-container border border-outline-variant px-3 py-1 rounded-full" id="seatmap-availability">—</span>
        </div>
      </div>
      ${clientInfo?.email
        ? `<div class="ml-auto flex items-center gap-2 bg-surface-container border border-outline-variant px-3 py-1.5 rounded-full text-xs">
            <span class="material-symbols-outlined text-tertiary text-sm">person</span>
            <span class="text-on-surface-variant">${clientInfo.name || clientInfo.email}</span>
           </div>`
        : `<div class="ml-auto flex items-center gap-2 bg-surface-container border border-outline-variant px-3 py-1.5 rounded-full text-xs">
            <span class="material-symbols-outlined text-on-surface-variant text-sm">person_off</span>
            <span class="text-on-surface-variant">Sin cuenta</span>
           </div>`
      }
    </div>

    <!-- Mapa -->
    <div class="bg-surface-container-high rounded-2xl border border-outline-variant p-6 max-w-2xl mx-auto">
      <div class="stage-curve mb-5">
        <span class="font-label-sm text-[9px] uppercase tracking-[0.3em] text-tertiary/50 mt-2">ESCENARIO</span>
      </div>
      <div class="space-y-2" id="seat-map-container">
        <div class="flex flex-col items-center justify-center py-16 gap-3">
          <svg class="animate-spin h-7 w-7 text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-on-surface-variant">Cargando asientos...</p>
        </div>
      </div>
      <div class="flex justify-center gap-8 mt-5 pt-5 border-t border-outline-variant">
        <div class="flex items-center gap-2"><div class="seat available w-5 h-5 rounded"></div><span class="text-[11px] text-on-surface-variant uppercase tracking-wide">Disponible</span></div>
        <div class="flex items-center gap-2"><div class="seat selected w-5 h-5 rounded"></div><span class="text-[11px] text-on-surface-variant uppercase tracking-wide">Seleccionado</span></div>
        <div class="flex items-center gap-2"><div class="seat unavailable w-5 h-5 rounded"></div><span class="text-[11px] text-on-surface-variant uppercase tracking-wide">Ocupado</span></div>
      </div>
    </div>`;

  document.getElementById('btn-back-client')?.addEventListener('click', showClientStep);

  try {
    currentSeatMap = await fetchSeatMap(currentPerformance.id);
    if (currentSeatMap) {
      renderSeatMap(currentSeatMap, currentPerformance.ticketPrice);
    } else {
      document.getElementById('seat-map-container').innerHTML =
        `<p class="text-center text-on-surface-variant py-16">No se pudo cargar el mapa.</p>`;
    }
  } catch (err) {
    console.error('[seatmap]', err);
    document.getElementById('seat-map-container').innerHTML =
      `<p class="text-center text-error py-16">Error al cargar los asientos.</p>`;
  }
}

// ── Render mapa ────────────────────────────────
function renderSeatMap(seatMap, ticketPrice) {
  const container = document.getElementById('seat-map-container');
  const availEl   = document.getElementById('seatmap-availability');
  if (availEl) availEl.textContent = `${seatMap.availableSeats} de ${seatMap.totalSeats} disponibles`;

  if (!seatMap.rows?.length) {
    container.innerHTML = `<p class="text-center text-on-surface-variant py-16">Sin asientos configurados.</p>`;
    return;
  }

  const rows = [...seatMap.rows].sort((a, b) => a.rowName.localeCompare(b.rowName));

  container.innerHTML = rows.map(row => {
    const seats = [...row.seats].sort((a, b) => a.seatNumber - b.seatNumber);
    return `
      <div class="flex items-center gap-3" data-row="${row.rowName}">
        <span class="font-label-sm text-tertiary text-xs w-5 text-right shrink-0">${row.rowName}</span>
        <div class="flex gap-1.5 justify-center flex-1">
          ${seats.map(seat => {
            const occupied = seat.status === 'occupied';
            return `
              <div class="flex flex-col items-center gap-0.5">
                <div class="seat ${occupied ? 'unavailable' : 'available'}"
                  data-seat-order="${seat.seatOrder}"
                  data-seat-num="${seat.seatNumber}"
                  data-row="${row.rowName}"
                  data-price="${ticketPrice}"
                  title="${occupied ? 'Ocupado' : `Fila ${row.rowName} · Asiento ${seat.seatNumber}`}"
                ></div>
                <span class="text-[8px] text-on-surface-variant/50 leading-none">${seat.seatNumber}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.seat.available').forEach(el => {
    el.addEventListener('click', () => toggleSeat(el));
  });
}

// ── Selección de asiento ───────────────────────
function toggleSeat(el) {
  const seatOrder = parseInt(el.dataset.seatOrder);
  const seatNum   = parseInt(el.dataset.seatNum);
  const row       = el.dataset.row;
  const price     = parseFloat(el.dataset.price);

  if (el.classList.contains('selected')) {
    el.classList.replace('selected', 'available');
    selectedSeats = selectedSeats.filter(s => s.seatOrder !== seatOrder);
  } else {
    if (selectedSeats.length >= 10) {
      showToast('Máximo 10 asientos por transacción.', 'warning');
      return;
    }
    el.classList.replace('available', 'selected');
    selectedSeats.push({ seatOrder, row, seatNum, price });
  }
  updateSeatSummary();
}

// ── Resumen lateral ────────────────────────────
function updateSeatSummary() {
  const listEl      = document.getElementById('summary-seats-list');
  const totalEl     = document.getElementById('summary-total');
  const countEl     = document.getElementById('summary-count');
  const checkoutBtn = document.getElementById('btn-checkout');

  if (!listEl) return;

  const total = selectedSeats.reduce((s, x) => s + x.price, 0);
  if (countEl) countEl.textContent = selectedSeats.length;
  if (totalEl) totalEl.textContent = formatCurrency(total);

  if (selectedSeats.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-on-surface-variant italic text-center py-6">Selecciona asientos en el mapa</p>`;
    if (checkoutBtn) {
      checkoutBtn.disabled  = true;
      checkoutBtn.className = 'w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm bg-outline-variant text-on-surface-variant cursor-not-allowed';
    }
    return;
  }

  listEl.innerHTML = selectedSeats
    .sort((a, b) => a.seatOrder - b.seatOrder)
    .map(s => `
      <div class="flex items-center justify-between gap-2 py-2 border-b border-outline-variant/30 last:border-0 fade-in-up">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-tertiary text-sm">chair</span>
          <span class="text-xs font-bold text-on-surface">Fila ${s.row} · ${s.seatNum}</span>
        </div>
        <span class="text-xs font-bold text-on-surface">${formatCurrency(s.price)}</span>
      </div>`)
    .join('');

  if (checkoutBtn) {
    checkoutBtn.disabled  = false;
    checkoutBtn.className = 'w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm bg-tertiary text-on-tertiary hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-tertiary/20';
  }
}

// ── Modal de confirmación ──────────────────────
function openCheckoutModal() {
  if (!currentPerformance || selectedSeats.length === 0) return;

  const total     = selectedSeats.reduce((s, x) => s + x.price, 0);
  const seatsText = selectedSeats.sort((a, b) => a.seatOrder - b.seatOrder)
    .map(s => `Fila ${s.row}·${s.seatNum}`).join(', ');

  document.getElementById('confirm-play-name').textContent = currentPerformance.playName;
  document.getElementById('confirm-perf-date').textContent =
    `${formatDate(currentPerformance.performanceDate)} · ${formatTime(currentPerformance.startTime)}`;
  document.getElementById('confirm-seats').textContent     = seatsText;
  document.getElementById('confirm-total').textContent     = formatCurrency(total);
  document.getElementById('confirm-count').textContent     =
    `${selectedSeats.length} boleta${selectedSeats.length > 1 ? 's' : ''}`;

  const clientRow = document.getElementById('confirm-client-row');
  if (clientRow) {
    clientRow.innerHTML = clientInfo?.email
      ? `<span class="text-on-surface-variant">Cliente</span>
         <span class="text-on-surface font-bold truncate max-w-[55%]">${clientInfo.name ? `${clientInfo.name} (${clientInfo.email})` : clientInfo.email}</span>`
      : `<span class="text-on-surface-variant">Cliente</span>
         <span class="text-on-surface-variant italic">Sin cuenta registrada</span>`;
  }

  document.getElementById('modal-confirm').classList.add('open');
}

function closeCheckoutModal() {
  document.getElementById('modal-confirm')?.classList.remove('open');
}

// ── Confirmar compra → API ─────────────────────
async function confirmPurchase() {
  if (!currentPerformance || selectedSeats.length === 0) return;

  const confirmBtn = document.getElementById('btn-confirm-purchase');
  if (confirmBtn) {
    confirmBtn.disabled  = true;
    confirmBtn.innerHTML = `
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      PROCESANDO...`;
  }

  try {
    const payload = {
      performanceId:   currentPerformance.id,
      seatNumbers:     selectedSeats.map(s => s.seatOrder),
      paymentMethod:   'box_office',
      stripePaymentId: null,
    };

    const data = await apiPost(`${EVENTS_BASE_URL}/api/purchase`, payload);
    closeCheckoutModal();

    if (data.success) {
      showToast(`✅ Venta registrada · ${selectedSeats.length} boleta${selectedSeats.length > 1 ? 's' : ''} generadas`, 'success', 6000);

      // Obtener tickets generados para imprimir
      const ticketsData = await apiGet(`${EVENTS_BASE_URL}/api/purchase/${data.data.id}`);
      const myTickets   = await apiGet(`${EVENTS_BASE_URL}/api/ticket/my`);

      // Filtrar los tickets de esta compra
      const purchaseTickets = myTickets.success
        ? myTickets.data.filter(t => t.purchaseId === data.data.id)
        : [];

      showSuccessScreen(data.data, purchaseTickets);
    } else {
      showToast(data.message || 'Error al registrar la compra.', 'error', 7000);
      if (confirmBtn) {
        confirmBtn.disabled  = false;
        confirmBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> CONFIRMAR VENTA`;
      }
    }
  } catch (err) {
    console.error('[seatmap] confirmPurchase error:', err);
    closeCheckoutModal();
    showToast('No se pudo conectar con el servidor. Intenta de nuevo.', 'error');
    if (confirmBtn) {
      confirmBtn.disabled  = false;
      confirmBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> CONFIRMAR VENTA`;
    }
  }
}

// ── Pantalla de éxito + tickets ────────────────
function showSuccessScreen(purchase, tickets) {
  const area = document.getElementById('seat-map-area');
  if (!area) return;

  const ticketsHtml = tickets.length > 0
    ? tickets.map(t => `
        <div class="ticket-card bg-surface-container rounded-xl border border-outline-variant p-4 flex items-start gap-4">
          <img src="${t.qrUrl}" alt="QR Ticket" class="w-20 h-20 rounded-lg border border-outline-variant bg-white shrink-0">
          <div class="flex-1 min-w-0">
            <p class="font-bold text-on-surface text-sm">${t.playName}</p>
            <p class="text-xs text-on-surface-variant mt-0.5">${formatDate(t.performanceDate)} · ${formatTime(t.startTime)}</p>
            <p class="text-xs text-tertiary font-bold mt-1 flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">chair</span>
              Fila ${t.rowName} · Asiento ${t.seatNumber}
            </p>
            <p class="text-[10px] text-on-surface-variant/50 mt-1 font-label-sm truncate">${t.qrUuid}</p>
          </div>
        </div>`).join('')
    : `<p class="text-xs text-on-surface-variant italic text-center py-4">Tickets generados — recarga para ver los QR</p>`;

  area.innerHTML = `
    <div class="max-w-2xl mx-auto fade-in-up">
      <!-- Éxito header -->
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-3xl text-green-400">check_circle</span>
        </div>
        <div>
          <h3 class="font-bold text-on-surface text-xl">¡Venta Completada!</h3>
          <p class="text-sm text-on-surface-variant">Compra #${purchase.id} · ${purchase.ticketCount} boleta${purchase.ticketCount > 1 ? 's' : ''} para <span class="text-tertiary font-bold">${purchase.playName}</span></p>
        </div>
      </div>

      <!-- Tickets con QR -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs uppercase tracking-widest text-on-surface-variant font-label-sm">Boletas generadas</p>
          <button onclick="printTickets()" 
            class="flex items-center gap-2 px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-sm">print</span>
            Imprimir boletas
          </button>
        </div>
        <div class="space-y-3" id="tickets-list">
          ${ticketsHtml}
        </div>
      </div>

      <!-- Resumen de la compra -->
      <div class="bg-surface-container rounded-xl border border-outline-variant p-5 mb-6">
        <p class="text-xs uppercase tracking-widest text-on-surface-variant font-label-sm mb-3">Resumen de pago</p>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-on-surface-variant">Método</span><span class="text-on-surface font-bold">Efectivo · Taquilla</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Boletas</span><span class="text-on-surface">${purchase.ticketCount}</span></div>
          ${clientInfo?.email ? `<div class="flex justify-between"><span class="text-on-surface-variant">Cliente</span><span class="text-on-surface truncate max-w-[60%]">${clientInfo.name || clientInfo.email}</span></div>` : ''}
          <div class="flex justify-between border-t border-dashed border-outline-variant pt-2 mt-2">
            <span class="font-bold text-on-surface">Total cobrado</span>
            <span class="text-tertiary font-bold text-base">${formatCurrency(purchase.totalPrice)}</span>
          </div>
        </div>
      </div>

      <button onclick="switchTab('catalog')"
        class="flex items-center gap-2 px-6 py-3 bg-tertiary text-on-tertiary rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all">
        <span class="material-symbols-outlined">add_shopping_cart</span>
        Nueva Venta
      </button>
    </div>`;

  // Guardar datos para impresión
  window._lastPurchase = purchase;
  window._lastTickets  = tickets;
  window._lastClient   = clientInfo;
}

// ══════════════════════════════════════════════
//  IMPRESIÓN DE BOLETAS
// ══════════════════════════════════════════════
function printTickets() {
  const purchase = window._lastPurchase;
  const tickets  = window._lastTickets;
  const client   = window._lastClient;

  if (!purchase || !tickets?.length) {
    showToast('No hay boletas disponibles para imprimir.', 'warning');
    return;
  }

  showToast('Enviando a impresora...', 'info', 3000);

  fetch('http://localhost:6789', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tickets:  tickets,
      purchase: purchase,
      client:   client || {},
    }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      showToast('✅ ' + data.message, 'success');
    } else {
      showToast('Error al imprimir: ' + data.message, 'error', 7000);
    }
  })
  .catch(() => {
    showToast('No se pudo conectar con el servidor de impresión. ¿Está corriendo printer-server.js?', 'error', 8000);
  });
}

// ── Init listeners ─────────────────────────────
function initSeatMapListeners() {
  document.getElementById('btn-checkout')
    ?.addEventListener('click', openCheckoutModal);
  document.getElementById('btn-confirm-purchase')
    ?.addEventListener('click', confirmPurchase);
  document.getElementById('btn-cancel-purchase')
    ?.addEventListener('click', closeCheckoutModal);
  document.getElementById('modal-confirm')
    ?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeCheckoutModal();
    });
}
