/* ========= Status Server — fadzdigital =========
 * Ubah API_BASE ke domain Worker kamu.
 */
const API_BASE = 'https://call.fadzdigital.store';

// ====== Konstanta & state ======
const AUTO_MS = 30_000;

const state = {
  region: 'SG',
  variant: 'HP',
  filter: 'all', // all | up | down
  auto: false,
  countdown: 0,
  timer: null,
  history: new Map(), // host -> [{ms, ok, t}]
};

const el = {
  segRegion: document.getElementById('segRegion'),
  segVariant: document.getElementById('segVariant'),
  segFilter: document.getElementById('segFilter'),
  autoToggle: document.getElementById('autoToggle'),
  autoHint: document.getElementById('autoHint'),
  btnRefresh: document.getElementById('btnRefresh'),
  statUp: document.getElementById('statUp'),
  statDown: document.getElementById('statDown'),
  statTotal: document.getElementById('statTotal'),
  lastUpdated: document.getElementById('lastUpdated'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('emptyState'),
  notice: document.getElementById('notice'),
  metaInfo: document.getElementById('metaInfo'),
  toast: document.getElementById('toast'),
};

// ====== Utils ======
const fmtTime = ts => new Date(ts).toLocaleString('id-ID', { hour12: false });

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 1500);
}

function setNotice(msg) {
  if (!msg) { el.notice.classList.add('hidden'); el.notice.textContent = ''; return; }
  el.notice.classList.remove('hidden');
  el.notice.innerHTML = msg;
}

function setCounts(list) {
  const up = list.filter(x => x.ok).length;
  const total = list.length;
  const down = total - up;
  el.statUp.textContent = `UP: ${up}`;
  el.statDown.textContent = `DOWN: ${down}`;
  el.statTotal.textContent = `Total: ${total}`;
  el.lastUpdated.textContent = `Diupdate: ${fmtTime(Date.now())}`;
}

function drawSpark(canvas, points) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  ctx.clearRect(0, 0, w, h);
  if (!points || points.length === 0) return;
  const ms = points.map(p => (typeof p.ms === 'number' ? p.ms : null)).filter(v => v !== null);
  const max = Math.max(100, ...ms, 1);
  const step = (canvas.clientWidth - 10) / Math.max(points.length - 1, 1);

  // baseline
  ctx.strokeStyle = 'rgba(168,186,208,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 14);
  ctx.lineTo(w, h - 14);
  ctx.stroke();

  // line
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = 5 + i * step;
    const y = 4 + (1 - Math.min(p.ms || max, max) / max) * (canvas.clientHeight - 20);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // dots
  points.forEach((p, i) => {
    const x = 5 + i * step;
    const y = 4 + (1 - Math.min(p.ms || max, max) / max) * (canvas.clientHeight - 20);
    ctx.fillStyle = p.ok ? '#22c55e' : '#f43f5e';
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  });
}

function historyPush(host, datum) {
  const arr = state.history.get(host) || [];
  arr.push({ ms: datum.ms ?? null, ok: !!datum.ok, t: Date.now() });
  if (arr.length > 30) arr.shift();
  state.history.set(host, arr);
  return arr;
}

// ====== Data fetch ======
async function fetchStatus(region, variant) {
  const url = new URL(`${API_BASE}/servers/status`);
  url.searchParams.set('region', region);
  url.searchParams.set('variant', variant);
  url.searchParams.set('compact', '0');
  const r = await fetch(url.toString(), { method: 'GET', credentials: 'omit' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ====== Render ======
function cardTpl(it, idx) {
  const statusText = it.ok ? 'UP' : 'DOWN';
  const statusClass = it.ok ? 'up' : 'down';
  const ms = typeof it.ms === 'number' ? `${it.ms} ms` : '—';
  const code = it.code || '—';
  const info = it.err || '';
  const id = `spark-${idx}`;

  return `
    <article class="card ${statusClass}" data-host="${it.host}" data-status="${statusClass}">
      <div class="top">
        <span class="dot ${statusClass}"></span>
        <div class="host" title="${it.host}">${it.host}</div>
        <div class="pill small ${statusClass === 'up' ? 'green' : 'red'}">${statusText}</div>
      </div>

      <canvas class="spark" id="${id}"></canvas>

      <div class="row">
        <div class="badges">
          <span class="pill small blue">HTTP ${code}</span>
          <span class="pill small ${statusClass === 'up' ? 'green' : 'red'}">${ms}</span>
        </div>
        <div class="actions">
          <button class="btn slim" data-copy="${it.host}">Copy host</button>
        </div>
      </div>

      <div class="hr"></div>
      <div class="kv">
        <span>Info:</span>
        <span>${info ? `<code>${info}</code>` : '<span class="muted">-</span>'}</span>
      </div>
    </article>
  `;
}

function render(list, meta) {
  // filter
  let shown = list;
  if (state.filter === 'up') shown = list.filter(x => x.ok);
  if (state.filter === 'down') shown = list.filter(x => !x.ok);

  // sort
  shown.sort((a,b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    const ma = typeof a.ms === 'number' ? a.ms : 9e9;
    const mb = typeof b.ms === 'number' ? b.ms : 9e9;
    return ma - mb;
  });

  // cards
  el.grid.innerHTML = shown.map((it, i) => cardTpl(it, i)).join('');
  el.empty.classList.toggle('hidden', shown.length > 0);

  // sparkline + history
  shown.forEach((it, i) => {
    const history = historyPush(it.host, it);
    const canvas = document.getElementById(`spark-${i}`);
    drawSpark(canvas, history);
  });

  // copy host
  el.grid.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-copy]');
    if (!b) return;
    const host = b.getAttribute('data-copy');
    navigator.clipboard.writeText(host).then(() => toast('Disalin: ' + host));
  }, { once: true });

  // counts
  setCounts(list);

  // meta
  const port = meta?.port ?? 5888;
  const path = meta?.path ?? '/health';
  const timeout = meta?.timeoutMs ?? 2000;
  el.metaInfo.innerHTML = `Cek via <code>http://host:${port}${path}</code> • timeout ${timeout} ms • terakhir dicek: ${fmtTime(meta?.checkedAt || Date.now())}`;
}

// ====== Actions ======
async function refreshNow() {
  setNotice(`<b>Memuat status…</b> Region <code>${state.region}</code> • Varian <code>${state.variant}</code>`);
  try {
    const data = await fetchStatus(state.region, state.variant);
    const list = Array.isArray(data?.servers) ? data.servers : [];
    render(list.map(x => ({ ...x })), data);
    setNotice('');
    state.countdown = Math.floor(AUTO_MS / 1000);
    updateAutoHint();
  } catch (e) {
    el.grid.innerHTML = '';
    el.empty.classList.remove('hidden');
    setCounts([]);
    setNotice(`Gagal memuat status: <code>${(e && e.message) || e}</code>`);
  }
}

function updateAutoHint() {
  if (!state.auto) { el.autoHint.textContent = 'off'; return; }
  el.autoHint.textContent = `${state.countdown}s`;
}

function startAuto() {
  stopAuto();
  state.auto = true;
  state.countdown = Math.floor(AUTO_MS / 1000);
  updateAutoHint();
  state.timer = setInterval(() => {
    state.countdown -= 1;
    if (state.countdown <= 0) refreshNow();
    updateAutoHint();
  }, 1000);
}

function stopAuto() {
  state.auto = false;
  updateAutoHint();
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
}

// ====== UI wiring ======
function mountSegmented(seg, attr, key) {
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    [...seg.querySelectorAll('button')].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state[key] = btn.getAttribute(attr);
    refreshNow();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  mountSegmented(el.segRegion, 'data-region', 'region');
  mountSegmented(el.segVariant, 'data-variant', 'variant');
  mountSegmented(el.segFilter, 'data-filter',  'filter');

  el.autoToggle.addEventListener('change', (e) => e.target.checked ? startAuto() : stopAuto());
  el.btnRefresh.addEventListener('click', refreshNow);

  refreshNow();
});
