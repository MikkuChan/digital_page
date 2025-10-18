/* ========= Status Server — fadzdigital =========
 * Ubah API_BASE sesuai domain Worker kamu.
 * Contoh: https://call.fadzdigital.store
 */
const API_BASE = 'https://call.fadzdigital.store';

// interval auto-refresh (ms)
const AUTO_MS = 30_000;

const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

const els = {
  region: qs('#regionSel'),
  variant: qs('#variantSel'),
  refresh: qs('#btnRefresh'),
  auto: qs('#autoToggle'),
  up: qs('#statUp'),
  down: qs('#statDown'),
  total: qs('#statTotal'),
  last: qs('#lastUpdated'),
  tbody: qs('#tbodyStatus'),
  empty: qs('#emptyState'),
  notice: qs('#notice'),
  meta: qs('#metaInfo'),
};

let autoTimer = null;

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('id-ID', { hour12: false });
}

function setNotice(msg, type = 'info') {
  if (!msg) {
    els.notice.classList.add('hidden');
    els.notice.textContent = '';
    return;
  }
  els.notice.classList.remove('hidden');
  els.notice.innerHTML = msg;
}

function setCounts({ up = 0, down = 0, total = 0 }) {
  els.up.textContent = `UP: ${up}`;
  els.down.textContent = `DOWN: ${down}`;
  els.total.textContent = `Total: ${total}`;
  els.last.textContent = `Diupdate: ${fmtTime(Date.now())}`;
}

function rowTpl(idx, it) {
  const status = it.ok ? 'UP' : 'DOWN';
  const dotClass = it.ok ? 'up' : 'down';
  const code = it.code || 0;
  const ms = typeof it.ms === 'number' ? it.ms : '—';
  const info = it.err ? it.err : '';

  return `
    <tr>
      <td>${idx}</td>
      <td><code>${it.host}</code></td>
      <td>
        <span class="status-pill">
          <span class="dot ${dotClass}"></span> ${status}
        </span>
      </td>
      <td>${code}</td>
      <td>${ms}</td>
      <td class="muted small">${info}</td>
    </tr>
  `;
}

async function fetchStatus(region, variant) {
  // gunakan endpoint ringkas; backend akan kumpulkan host berdasarkan region/variant
  const url = new URL(`${API_BASE}/servers/status`);
  url.searchParams.set('region', region);
  url.searchParams.set('variant', variant);
  // detail (bukan compact) agar dapat ms/kode/error
  url.searchParams.set('compact', '0');

  const r = await fetch(url.toString(), { method: 'GET', credentials: 'omit' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function renderStatus(payload) {
  const list = Array.isArray(payload?.servers) ? payload.servers : [];
  // sort: UP dulu, kemudian berdasarkan ms yang paling cepat
  list.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    const ma = typeof a.ms === 'number' ? a.ms : 9e9;
    const mb = typeof b.ms === 'number' ? b.ms : 9e9;
    return ma - mb;
  });

  els.tbody.innerHTML = list.map((it, i) => rowTpl(i + 1, it)).join('');
  els.empty.classList.toggle('hidden', list.length > 0);

  const up = list.filter(x => x.ok).length;
  const down = list.length - up;
  setCounts({ up, down, total: list.length });

  const port = payload?.port ?? 5888;
  const path = payload?.path ?? '/health';
  const timeout = payload?.timeoutMs ?? 2000;
  els.meta.innerHTML = `Last Checked</code> (timeout ${timeout} ms), terakhir dicek: ${fmtTime(payload?.checkedAt || Date.now())}`;
}

async function refreshNow() {
  const region = els.region.value;
  const variant = els.variant.value;

  // info bar
  setNotice(`<b>Memuat status...</b> Region <code>${region}</code> • Variant <code>${variant}</code>`);

  try {
    const data = await fetchStatus(region, variant);
    renderStatus(data);
    setNotice('');
  } catch (e) {
    setNotice(`Gagal memuat status: <code>${(e && e.message) || e}</code>`);
    els.tbody.innerHTML = '';
    els.empty.classList.remove('hidden');
    setCounts({ up: 0, down: 0, total: 0 });
  }
}

function startAuto() {
  stopAuto();
  autoTimer = setInterval(refreshNow, AUTO_MS);
}
function stopAuto() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

function initUI() {
  els.refresh.addEventListener('click', () => refreshNow());
  els.region.addEventListener('change', () => refreshNow());
  els.variant.addEventListener('change', () => refreshNow());
  els.auto.addEventListener('change', (e) => (e.target.checked ? startAuto() : stopAuto()));

  // Inisialisasi pertama
  refreshNow();
}

document.addEventListener('DOMContentLoaded', initUI);
