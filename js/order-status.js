/* order-status.js (multi-account cache + modal switcher + 30-day TTL) */
const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

// ===== LocalStorage keys =====
const LS_LAST_ORDER     = 'fdz_last_order';
const LS_LAST_PAYMENT   = 'fdz_last_payment';   // {orderId, paymentUrl, reference, uf, email, ts}
const LS_ACCOUNTS       = 'fdz_accounts_v1';    // Array<{orderId, uf, email, savedAt, data:{accountFields?, accountConfig?}}>
const CACHE_TTL_MS      = 30 * 24 * 60 * 60 * 1000; // 30 hari

// ===== Refs =====
const orderIdInput = document.getElementById('orderIdInput');
const ufInput      = document.getElementById('ufInput');
const emailInput   = document.getElementById('emailInput');

const btnLookup    = document.getElementById('btnLookup');
const btnOpenPay   = document.getElementById('btnOpenPayment');
const btnOpenPayInline = document.getElementById('btnOpenPaymentInline');
const btnAccountList = document.getElementById('btnAccountList');

const statusBox    = document.getElementById('statusBox');
const resultBox    = document.getElementById('resultBox');
const errorBox     = document.getElementById('errorBox');
const errorBoxRight= document.getElementById('errorBoxRight');
const orderIdText  = document.getElementById('orderIdText');
const ufText       = document.getElementById('ufText');
const statusBadge  = document.getElementById('statusBadge');
const hintEl       = document.getElementById('hint');
const cacheHoursEl = document.getElementById('cacheHours');

// account fields
const accUsername  = document.getElementById('accUsername');
const accUUID      = document.getElementById('accUUID');
const accDomain    = document.getElementById('accDomain');
const accQuota     = document.getElementById('accQuota');
const accCreated   = document.getElementById('accCreated');
const accExpired   = document.getElementById('accExpired');
const blkWsTls     = document.getElementById('blk-ws-tls');
const blkWsNtls    = document.getElementById('blk-ws-ntls');
const blkGrpc      = document.getElementById('blk-grpc');
const accWsTls     = document.getElementById('accWsTls');
const accWsNtls    = document.getElementById('accWsNtls');
const accGrpc      = document.getElementById('accGrpc');
const copyAllBtn   = document.getElementById('copyAllBtn');
const downloadBtn  = document.getElementById('downloadConfigBtn');

let pollTimer = null;

// ===== Modal refs =====
let accountsModal = null;
const accountsListEl  = document.getElementById('accountsList');
const accountsEmptyEl = document.getElementById('accountsEmpty');
const btnClearExpired = document.getElementById('btnClearExpired');

// ===== UI helpers =====
const show = el => el && (el.style.display = '');
const hide = el => el && (el.style.display = 'none');
const setText = (el, t) => el && (el.textContent = t ?? '');
const esc = (s) => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function showError(msg, right=false){
  const box = right ? errorBoxRight : errorBox;
  if (!box) return;
  box.innerHTML = `<div class="alert alert-danger">${esc(msg)}</div>`;
  show(box);
}
function clearError(){
  if (errorBox){ errorBox.innerHTML=''; hide(errorBox); }
  if (errorBoxRight){ errorBoxRight.innerHTML=''; hide(errorBoxRight); }
}

// ===== payment url control =====
function setPaymentUrl(url){
  const setAnchor = (aEl) => {
    if (!aEl) return;
    if (url) {
      aEl.href = url;
      aEl.classList.remove('disabled');
    } else {
      aEl.removeAttribute('href');
      aEl.classList.add('disabled');
    }
  };
  setAnchor(btnOpenPay);
  setAnchor(btnOpenPayInline);
}

// ===== Cache helpers (30 days) =====
function _now(){ return Date.now(); }
function _loadCacheRaw(){
  try { return JSON.parse(localStorage.getItem(LS_ACCOUNTS) || '[]'); } catch { return []; }
}
function _saveCacheRaw(arr){
  try { localStorage.setItem(LS_ACCOUNTS, JSON.stringify(arr)); } catch {}
}
function _pruneExpired(arr){
  const cutoff = _now() - CACHE_TTL_MS;
  return arr.filter(it => (it && it.savedAt && it.savedAt >= cutoff));
}
function listAccounts(){
  let arr = _loadCacheRaw();
  arr = _pruneExpired(arr);
  // Simpan balik setelah prune
  _saveCacheRaw(arr);
  // sort terbaru dulu
  arr.sort((a,b)=> (b.savedAt||0)-(a.savedAt||0));
  return arr;
}
function saveAccountToCache(orderId, uf, email, data){
  if (!orderId || !uf || !data) return;
  const entry = { orderId, uf, email: (email||''), savedAt: _now(), data: {
    accountFields: data.accountFields || null,
    accountConfig : data.accountConfig  || ''
  }};
  let arr = listAccounts();
  // upsert by orderId+uf
  const idx = arr.findIndex(x => x.orderId===orderId && x.uf===uf);
  if (idx >= 0) arr[idx] = entry; else arr.unshift(entry);
  _saveCacheRaw(arr);
}
function getAccountByPair(orderId, uf){
  const arr = listAccounts();
  return arr.find(x => x.orderId===orderId && x.uf===uf) || null;
}
function humanAgo(ts){
  const diff = Math.max(0, _now()-ts);
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d>0) return `${d} hari lalu`;
  if (h>0) return `${h} jam lalu`;
  if (m>0) return `${m} menit lalu`;
  return `baru saja`;
}

// ===== Build/Show Account =====
function buildTextDump(data) {
  const f = data?.accountFields;
  if (f && f.username) {
    const lines = [
      '=== FADZDIGITAL VPN ACCOUNT ===',
      `Username : ${f.username || ''}`,
      `UUID     : ${f.uuid || ''}`,
      `Domain   : ${f.domain || ''}`,
      `Quota    : ${f.quota_gb ?? '?'} GB`,
      `Created  : ${f.created || ''}`,
      `Expired  : ${f.expired || ''}`,
      '',
      f.ws_tls  ? `[WS TLS]\n${f.ws_tls}\n`     : '',
      f.ws_ntls ? `[WS Non-TLS]\n${f.ws_ntls}\n` : '',
      f.grpc    ? `[gRPC]\n${f.grpc}\n`          : '',
      'Simpan file ini untuk impor konfigurasi.'
    ];
    return lines.filter(Boolean).join('\n');
  }
  return data?.accountConfig || '';
}

function setupActions(data){
  const textContent = buildTextDump(data);
  copyAllBtn.onclick = async () => {
    await navigator.clipboard.writeText(textContent);
    const html = copyAllBtn.innerHTML;
    copyAllBtn.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
    setTimeout(()=>copyAllBtn.innerHTML = html, 1500);
  };
  downloadBtn.onclick = () => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.orderId || 'vpn-account')}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
}

function showAccountData(data, orderId=null, uf=null){
  hide(statusBox);
  show(resultBox);
  const p = data?.accountFields || {};
  setText(accUsername, p.username || '');
  setText(accUUID,     p.uuid     || '');
  setText(accDomain,   p.domain   || '');
  setText(accQuota,    `${p.quota_gb ?? '?'} GB`);
  setText(accCreated,  p.created  || '');
  setText(accExpired,  p.expired  || '');

  p.ws_tls  ? (setText(accWsTls,  p.ws_tls),  show(blkWsTls))  : hide(blkWsTls);
  p.ws_ntls ? (setText(accWsNtls, p.ws_ntls), show(blkWsNtls)) : hide(blkWsNtls);
  p.grpc    ? (setText(accGrpc,   p.grpc),    show(blkGrpc))   : hide(blkGrpc);

  if (orderId) setText(orderIdText, orderId);
  if (uf)      setText(ufText, uf);

  setupActions({ ...data, orderId: orderId || (localStorage.getItem(LS_LAST_ORDER) || '') });
}

// ===== Fetch/Poll =====
async function fetchStatus(orderId){
  const r = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || 'Order tidak ditemukan.');
  return data;
}

async function startPolling(orderId, ufFromUser, emailFromUser){
  clearError();
  hide(resultBox);
  show(statusBox);
  setText(orderIdText, orderId);
  setText(ufText, ufFromUser || '-');
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className = 'badge bg-info badge-pulse';

  const lastPay = safeGet(LS_LAST_PAYMENT);
  setPaymentUrl(lastPay?.paymentUrl || '');

  const start = Date.now();
  const tick = async () => {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      statusBadge.textContent = 'Timeout';
      statusBadge.className = 'badge bg-secondary';
      stopPolling();
      return;
    }
    try {
      const data = await fetchStatus(orderId);

      // update payment url jika server mengembalikan
      if (data?.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        persistLastPayment({ ...lastPay, orderId, paymentUrl: data.paymentUrl });
      }

      const st = String(data.status || '').toUpperCase();
      if (st === 'PAID') {
        // tampilkan & cache
        statusBadge.textContent = data?.accountFields?.username ? 'Dibayar ✔' : 'Dibayar (menyiapkan akun)…';
        statusBadge.className = data?.accountFields?.username ? 'badge bg-success' : 'badge bg-warning text-dark';

        if (data.accountFields && data.accountFields.username) {
          const uf = (ufFromUser || data.accountFields.username || '').trim();
          showAccountData(data, orderId, uf);
          // simpan ke cache (30 hari)
          saveAccountToCache(orderId, uf, emailFromUser || (lastPay?.email||''), data);
          stopPolling();
        }
      } else if (st === 'FAILED') {
        statusBadge.textContent = 'Gagal ✖';
        statusBadge.className = 'badge bg-danger';
        stopPolling();
      } else {
        statusBadge.textContent = 'Menunggu pembayaran…';
        statusBadge.className = 'badge bg-warning text-dark';
      }
    } catch (e) {
      showError(e.message, true);
    }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}
function stopPolling(){
  if (pollTimer) clearInterval(pollTimer), (pollTimer=null);
}

// ===== Persist helpers for last_payment =====
function safeGet(key){
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function persistLastPayment(obj){
  if (!obj) return;
  try { localStorage.setItem(LS_LAST_PAYMENT, JSON.stringify({ ...obj, ts: Date.now() })); } catch {}
}

// ===== Accounts Modal =====
function openAccountsModal(){
  if (!accountsModal) accountsModal = new bootstrap.Modal(document.getElementById('accountsModal'));
  renderAccountsList();
  accountsModal.show();
}
function renderAccountsList(){
  const arr = listAccounts();
  accountsListEl.innerHTML = '';
  if (!arr.length) {
    show(accountsEmptyEl);
    return;
  }
  hide(accountsEmptyEl);
  for (const it of arr) {
    const btn = document.createElement('button');
    btn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    btn.dataset.uf = it.uf;
    btn.dataset.order = it.orderId;
    btn.innerHTML = `
      <div>
        <div class="fw-semibold">${esc(it.uf)}</div>
        <div class="small text-muted">Order: ${esc(it.orderId)}${it.email?` • ${esc(it.email)}`:''}</div>
      </div>
      <span class="badge bg-light text-dark">${esc(humanAgo(it.savedAt))}</span>
    `;
    btn.addEventListener('click', () => {
      // switch to this account
      showAccountData(it.data, it.orderId, it.uf);
      accountsModal.hide();
    });
    accountsListEl.appendChild(btn);
  }
}
function clearExpiredNow(){
  const fresh = _pruneExpired(_loadCacheRaw());
  _saveCacheRaw(fresh);
  renderAccountsList();
}

// ===== Copy single cfg line buttons =====
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.cfg-copy');
  if (!btn) return;
  const id = btn.dataset.target;
  const el = document.getElementById(id);
  if (el) {
    await navigator.clipboard.writeText(el.textContent);
    const h = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-lg"></i>';
    setTimeout(()=>btn.innerHTML=h, 1500);
  }
});

// ===== Lookup form =====
document.getElementById('lookupForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  clearError();

  const orderId = (orderIdInput.value || '').trim();
  const uf      = (ufInput.value || '').trim();
  const email   = (emailInput.value || '').trim();

  if (!orderId) return showError('Order ID wajib diisi.');
  if (!uf)      return showError('Username final (uf) wajib diisi.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Format email tidak valid.');

  // persist untuk sesi
  try { localStorage.setItem(LS_LAST_ORDER, orderId); } catch {}
  const lp = safeGet(LS_LAST_PAYMENT) || {};
  persistLastPayment({ ...lp, orderId, uf, email });

  // Jika akun ada di cache, tampilkan langsung tanpa nunggu polling
  const cached = getAccountByPair(orderId, uf);
  if (cached && cached.data) {
    showAccountData(cached.data, orderId, uf);
  } else {
    // mulai memantau
    startPolling(orderId, uf, email);
  }
});

// ===== Init from query/localStorage =====
(function init(){
  // FAQ cache hours text
  if (cacheHoursEl) cacheHoursEl.textContent = String(Math.floor(CACHE_TTL_MS / (60*60*1000)));

  // modal
  if (btnAccountList) btnAccountList.addEventListener('click', openAccountsModal);
  if (btnClearExpired) btnClearExpired.addEventListener('click', clearExpiredNow);

  // restore from last payment
  const lp = safeGet(LS_LAST_PAYMENT);
  if (lp?.paymentUrl) setPaymentUrl(lp.paymentUrl);

  const u = new URL(location.href);
  const qOrder = u.searchParams.get('orderId');
  const qUf    = u.searchParams.get('uf');
  const qEmail = u.searchParams.get('email');

  // Prefill inputs
  if (qOrder) orderIdInput.value = qOrder;
  if (qUf)    ufInput.value      = qUf;
  if (qEmail) emailInput.value   = qEmail;

  // If coming from order page or have session data, start right away
  const autoOrder = qOrder || (lp?.orderId) || localStorage.getItem(LS_LAST_ORDER) || '';
  const autoUf    = qUf    || (lp?.uf)      || '';
  const autoEmail = qEmail || (lp?.email)   || '';

  if (autoOrder) {
    orderIdInput.value = autoOrder;
    if (autoUf)    ufInput.value    = autoUf;
    if (autoEmail) emailInput.value = autoEmail;

    hintEl.style.display = '';
    hintEl.textContent = 'Data terdeteksi otomatis dari sesi sebelumnya / URL. Klik “Cek & Mulai Pantau” bila belum tampil.';

    // Jika ada akun di cache yang match, tampilkan segera
    const cached = (autoUf ? getAccountByPair(autoOrder, autoUf) : null);
    if (cached && cached.data) {
      showAccountData(cached.data, autoOrder, autoUf);
    }
  }
})();
