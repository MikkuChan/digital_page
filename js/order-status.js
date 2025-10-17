/* order-status.js — restore payment + multi-account cache (30 hari) + daftar akun modal */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

// ===== Cache config (30 hari)
const CACHE_DAYS  = 30;
const CACHE_HOURS = CACHE_DAYS * 24;
const CACHE_MS    = CACHE_HOURS * 60 * 60 * 1000;

// ===== LocalStorage keys
const LS_LAST_PAYMENT = 'fdz_last_payment';   // {orderId, uf, email, paymentUrl, ...}
const LS_LAST_LOOKUP  = 'fdz_last_lookup';    // {orderId, uf, email}
const LS_LAST_ACCOUNT = 'fdz_last_account';   // (legacy, 1 akun) {orderId, uf, email, accountFields, accountConfig, ts}
const LS_ACCOUNTS     = 'fdz_accounts_v1';    // (baru, banyak akun) [ {orderId, uf, email, accountFields, accountConfig, ts} ]

// ===== DOM helpers
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

// inputs
const orderIdInput = $('#orderIdInput');
const ufInput      = $('#ufInput');
const emailInput   = $('#emailInput');
const lookupForm   = $('#lookupForm');
const errorBox     = $('#errorBox');
const hintEl       = $('#hint');

// status/result
const statusBox   = $('#statusBox');
const resultBox   = $('#resultBox');
const errorBoxR   = $('#errorBoxRight');
const orderIdText = $('#orderIdText');
const ufText      = $('#ufText');
const statusBadge = $('#statusBadge');
const btnOpenPay  = $('#btnOpenPayment');
const btnOpenPayInline = $('#btnOpenPaymentInline');

// account fields
const accUsername = $('#accUsername');
const accUUID     = $('#accUUID');
const accDomain   = $('#accDomain');
const accQuota    = $('#accQuota');
const accCreated  = $('#accCreated');
const accExpired  = $('#accExpired');
const blkWsTls    = $('#blk-ws-tls');
const blkWsNtls   = $('#blk-ws-ntls');
const blkGrpc     = $('#blk-grpc');
const accWsTls    = $('#accWsTls');
const accWsNtls   = $('#accWsNtls');
const accGrpc     = $('#accGrpc');
const copyAllBtn  = $('#copyAllBtn');
const downloadBtn = $('#downloadConfigBtn');

// steps UI
const steps = $$('.status-steps .step');

// cache duration text
const cacheHoursEl = $('#cacheHours');
if (cacheHoursEl) cacheHoursEl.textContent = CACHE_HOURS;

// account list modal
const btnAccountList  = $('#btnAccountList');
const accountsListEl  = $('#accountsList');
const accountsEmptyEl = $('#accountsEmpty');
const btnClearExpired = $('#btnClearExpired');
let accountsModal;

// ===== tiny utils
const now   = ()=>Date.now();
const show  = (el)=> el && (el.style.display = '');
const hide  = (el)=> el && (el.style.display = 'none');
const setTxt= (el,t)=> el && (el.textContent = t ?? '');
const showErr  = (el,msg)=>{ if(!el) return; el.innerHTML = `<div class="alert alert-danger">${msg}</div>`; show(el); };
const clearErr = (el)=>{ if(!el) return; el.innerHTML=''; hide(el); };

// ===== LS helpers
const readJSON = (k)=>{ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJSON= (k,v)=>{ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const removeLS = (k)=>{ try { localStorage.removeItem(k); } catch {} };

function readLastPayment(){ return readJSON(LS_LAST_PAYMENT); }
function writeLastPayment(obj){ writeJSON(LS_LAST_PAYMENT, { ...obj, ts: now() }); }
function clearLastPayment(){ removeLS(LS_LAST_PAYMENT); }

function readLastLookup(){ return readJSON(LS_LAST_LOOKUP); }
function writeLastLookup(o){ writeJSON(LS_LAST_LOOKUP, o); }

function readLastAccount(){ return readJSON(LS_LAST_ACCOUNT); }
function writeLastAccount(o){ writeJSON(LS_LAST_ACCOUNT, { ...o, ts: now() }); }
function clearLastAccount(){ removeLS(LS_LAST_ACCOUNT); }

function readAccounts(){ return readJSON(LS_ACCOUNTS) || []; }
function writeAccounts(arr){ writeJSON(LS_ACCOUNTS, arr); }
function keyOf(x){ return `${x.uf}||${(x.email||'').toLowerCase()}||${x.orderId||''}`; }
function isSameIdentity(a,b){ return !!a && !!b && a.orderId===b.orderId && a.uf===b.uf && a.email===b.email; }

// prune legacy single cache if too old (>36h legacy) — kept for backward compat
(function pruneLegacy(){
  const a = readLastAccount();
  if (a && (now() - (a.ts||0) > 36*60*60*1000)) clearLastAccount();
})();

// prune multi-accounts > 30 hari
function pruneAccounts(){
  const arr = readAccounts();
  const keep = arr.filter(x => (now() - (x.ts||0)) <= CACHE_MS);
  writeAccounts(keep);
  return { before: arr.length, after: keep.length };
}

// upsert account to library (30 hari)
function upsertAccountToLibrary(obj){
  const arr = readAccounts();
  const k = keyOf(obj);
  const idx = arr.findIndex(x => keyOf(x) === k);
  const rec = { ...obj, ts: now() };
  if (idx >= 0) arr[idx] = rec; else arr.unshift(rec); // newest first
  writeAccounts(arr);
}

// ===== payment link
function setPaymentLink(url){
  const apply = (a) => {
    if (!a) return;
    if (url) {
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.classList.remove('disabled'); a.style.pointerEvents = 'auto';
      a.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i> Buka Halaman Pembayaran`;
    } else {
      a.removeAttribute('href'); a.classList.add('disabled'); a.style.pointerEvents = 'none';
      a.innerHTML = `<i class="bi bi-slash-circle me-1"></i> Tidak ada sesi pembayaran`;
    }
  };
  apply(btnOpenPay); apply(btnOpenPayInline);
}

// ===== steps UI
function setSteps(status, hasAccount){
  steps.forEach(s=>s.classList.remove('active','done'));
  steps[0].classList.add('active');
  const s = String(status||'').toUpperCase();

  if (s === 'FAILED') { steps[1].classList.add('active'); return; }
  if (!s || s === 'PENDING') { steps[1].classList.add('active'); return; }

  if (s === 'PAID' && !hasAccount) {
    steps[0].classList.add('done'); steps[1].classList.add('done'); steps[2].classList.add('active'); return;
  }
  if (s === 'PAID' && hasAccount) {
    steps[0].classList.add('done'); steps[1].classList.add('done'); steps[2].classList.add('done'); steps[3].classList.add('active');
  }
}

// ===== account render & actions
function buildTextDump(data){
  if (data.accountFields?.username) {
    const p = data.accountFields;
    const lines = [
      '=== FADZDIGITAL VPN ACCOUNT ===',
      `Username : ${p.username || ''}`,
      `UUID     : ${p.uuid || ''}`,
      `Domain   : ${p.domain || ''}`,
      `Quota    : ${p.quota_gb ?? '?'} GB`,
      `Created  : ${p.created || ''}`,
      `Expired  : ${p.expired || ''}`,
      '',
      p.ws_tls  ? `[WS TLS]\n${p.ws_tls}\n`     : '',
      p.ws_ntls ? `[WS Non-TLS]\n${p.ws_ntls}\n` : '',
      p.grpc    ? `[gRPC]\n${p.grpc}\n`        : '',
      'Simpan file ini untuk impor konfigurasi.'
    ];
    return lines.filter(Boolean).join('\n');
  }
  return data.accountConfig || '';
}

function setupActions(data){
  const text = buildTextDump(data);
  copyAllBtn.onclick = async ()=>{
    await navigator.clipboard.writeText(text);
    const h = copyAllBtn.innerHTML;
    copyAllBtn.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
    setTimeout(()=>copyAllBtn.innerHTML=h, 1500);
  };
  downloadBtn.onclick = ()=>{
    const blob = new Blob([text], { type:'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.orderId || 'vpn-account'}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
}

function renderAccount(data){
  hide(statusBox); show(resultBox);
  const p = data.accountFields || {};
  setTxt(accUsername, p.username || '-');
  setTxt(accUUID,     p.uuid || '-');
  setTxt(accDomain,   p.domain || '-');
  setTxt(accQuota,   (p.quota_gb ?? '?') + ' GB');
  setTxt(accCreated,  p.created || '-');
  setTxt(accExpired,  p.expired || '-');

  if (p.ws_tls)  { setTxt(accWsTls,  p.ws_tls);  show(blkWsTls); } else hide(blkWsTls);
  if (p.ws_ntls) { setTxt(accWsNtls, p.ws_ntls); show(blkWsNtls);} else hide(blkWsNtls);
  if (p.grpc)    { setTxt(accGrpc,   p.grpc);    show(blkGrpc);  } else hide(blkGrpc);

  setupActions(data);
  setSteps('PAID', true);

  // akun sudah jadi → tutup sesi payment, tapi simpan akun
  setPaymentLink('');
  clearLastPayment();

  // cache (legacy last) + library (multi)
  const record = {
    orderId: data.orderId,
    uf: data.usernameFinal || (p.username || ''),
    email: data.email || '',
    accountFields: data.accountFields || null,
    accountConfig: data.accountConfig || ''
  };
  writeLastAccount(record); // untuk restore cepat
  upsertAccountToLibrary(record); // untuk daftar akun
  refreshAccountsListUI(); // update list bila modal sedang terbuka
}

// ===== API
async function fetchStatus(orderId, uf, email){
  const url = `${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}&uf=${encodeURIComponent(uf)}&email=${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: { accept:'application/json' } });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || 'Order tidak ditemukan.');
  return d;
}

// ===== polling
let pollTimerRef = null;
let pollStart     = 0;

async function startPolling({ orderId, uf, email }){
  clearErr(errorBox); clearErr(errorBoxR);
  show(statusBox); hide(resultBox);

  setTxt(orderIdText, orderId);
  setTxt(ufText, uf);
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className = 'badge bg-info badge-pulse';
  setSteps('PENDING', false);

  // link dari sesi pembayaran terakhir
  const last = readLastPayment();
  if (last?.paymentUrl) setPaymentLink(last.paymentUrl);

  pollStart = Date.now();
  const tick = async ()=>{
    if (Date.now() - pollStart > POLL_TIMEOUT_MS) {
      statusBadge.textContent = 'Timeout'; statusBadge.className = 'badge bg-secondary';
      return stopPolling();
    }
    try{
      const data = await fetchStatus(orderId, uf, email);

      // payment link update
      const st = String(data.status || '').toUpperCase();
      if (data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
        writeLastPayment({ orderId, uf, email, paymentUrl: data.paymentUrl, reference: data.reference || '' });
      } else if (st === 'PENDING') {
        const lp = readLastPayment(); setPaymentLink(lp?.paymentUrl || '');
      } else {
        setPaymentLink(''); clearLastPayment();
      }

      const hasAccount = !!(data.accountFields && data.accountFields.username);

      if (st === 'PAID') {
        if (hasAccount) {
          statusBadge.textContent = 'Dibayar ✔';
          statusBadge.className   = 'badge bg-success';
          renderAccount({ ...data, usernameFinal: uf, email });
          stopPolling();
        } else {
          statusBadge.textContent = 'Dibayar (menyiapkan akun)…';
          statusBadge.className   = 'badge bg-warning text-dark';
          setSteps('PAID', false);
        }
      } else if (st === 'FAILED') {
        statusBadge.textContent = 'Gagal ✖';
        statusBadge.className   = 'badge bg-danger';
        setSteps('FAILED', false);
        stopPolling();
      } else {
        statusBadge.textContent = 'Menunggu pembayaran…';
        statusBadge.className   = 'badge bg-warning text-dark badge-pulse';
        setSteps('PENDING', false);
      }
    }catch(e){
      showErr(errorBoxR, e.message || 'Terjadi kesalahan.');
    }
  };

  await tick();
  pollTimerRef = setInterval(tick, POLL_INTERVAL_MS);
}
function stopPolling(){ if (pollTimerRef) { clearInterval(pollTimerRef); pollTimerRef = null; } }

// ===== Account List (Modal)
function fmtDate(s){
  if (!s) return '';
  // expecting "YYYY-MM-DD ..." from backend, else show raw
  return s;
}

function refreshAccountsListUI(){
  if (!accountsListEl || !accountsEmptyEl) return;
  pruneAccounts();
  const arr = readAccounts();
  accountsListEl.innerHTML = '';
  if (!arr.length) {
    show(accountsEmptyEl);
    return;
  }
  hide(accountsEmptyEl);

  arr.forEach((x, idx)=>{
    const title = x.uf || '(tanpa UF)';
    const sub   = x.orderId ? `#${x.orderId}` : '(orderId tidak tersimpan)';
    const when  = x.accountFields?.created ? fmtDate(x.accountFields.created) : '';
    const item  = document.createElement('button');
    item.type   = 'button';
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
    item.dataset.idx = String(idx);
    item.innerHTML = `
      <div class="me-auto">
        <div class="fw-semibold">${title}</div>
        <div class="small text-muted">${sub}${when?` • ${when}`:''}</div>
      </div>
      <i class="bi bi-chevron-right"></i>
    `;
    accountsListEl.appendChild(item);
  });
}

function openAccountsModal(){
  if (!accountsModal) accountsModal = new bootstrap.Modal(document.getElementById('accountsModal'));
  refreshAccountsListUI();
  accountsModal.show();
}

function useAccountFromLibrary(index){
  const arr = readAccounts();
  const x = arr[index];
  if (!x) return;

  // set form & header identity
  if (orderIdInput) orderIdInput.value = x.orderId || '';
  if (ufInput)      ufInput.value      = x.uf || '';
  if (emailInput)   emailInput.value   = x.email || '';
  setTxt(orderIdText, x.orderId || '-');
  setTxt(ufText,      x.uf || '-');

  // render langsung (tanpa polling)
  renderAccount({
    orderId: x.orderId,
    accountFields: x.accountFields,
    accountConfig: x.accountConfig || '',
    usernameFinal: x.uf,
    email: x.email
  });

  // boleh lanjut polling untuk verifikasi status bila mau:
  if (x.orderId && x.uf && x.email) startPolling({ orderId: x.orderId, uf: x.uf, email: x.email });

  if (accountsModal) accountsModal.hide();
}

// ===== events
lookupForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  clearErr(errorBox); clearErr(errorBoxR);

  const orderId = (orderIdInput.value || '').trim();
  const uf      = (ufInput.value || '').trim();
  const email   = (emailInput.value || '').trim();

  if (!orderId) return showErr(errorBox, 'Order ID wajib diisi.');
  if (!uf)      return showErr(errorBox, 'Username Final (uf) wajib diisi.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showErr(errorBox, 'Email wajib & harus valid.');

  writeLastLookup({ orderId, uf, email });
  startPolling({ orderId, uf, email });
});

// copy single row
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.cfg-copy'); if(!btn) return;
  const id  = btn.dataset.target; const el = document.getElementById(id);
  if (el) {
    await navigator.clipboard.writeText(el.textContent);
    const h = btn.innerHTML; btn.innerHTML = '<i class="bi bi-check-lg"></i>';
    setTimeout(()=>btn.innerHTML=h, 1500);
  }
});

// open accounts modal
if (btnAccountList) {
  btnAccountList.addEventListener('click', openAccountsModal);
}
if (accountsListEl) {
  accountsListEl.addEventListener('click', (e)=>{
    const item = e.target.closest('.list-group-item'); if (!item) return;
    const idx = Number(item.dataset.idx || -1);
    if (idx >= 0) useAccountFromLibrary(idx);
  });
}
if (btnClearExpired) {
  btnClearExpired.addEventListener('click', ()=>{
    const { before, after } = pruneAccounts();
    refreshAccountsListUI();
    // optional toast: use alert style
    alert(`Bersih-bersih cache: ${before - after} entri kedaluwarsa dihapus.`);
  });
}

// ===== init (URL → last_payment → last_lookup → last_account/lib)
(function init(){
  // show cache hours text
  const ce = $('#cacheHours'); if (ce) ce.textContent = CACHE_HOURS;

  const u = new URL(location.href);
  let restore = {
    orderId: u.searchParams.get('orderId') || '',
    uf     : u.searchParams.get('uf')      || '',
    email  : u.searchParams.get('email')   || ''
  };

  const lp = readLastPayment();
  if ((!restore.orderId || !restore.uf || !restore.email) && lp?.orderId && lp?.uf && lp?.email) {
    restore = { orderId: lp.orderId, uf: lp.uf, email: lp.email };
  }
  if (!restore.orderId || !restore.uf || !restore.email) {
    const lk = readLastLookup(); if (lk?.orderId && lk?.uf && lk?.email) restore = lk;
  }

  // fill form
  if (restore.orderId) orderIdInput.value = restore.orderId;
  if (restore.uf)      ufInput.value      = restore.uf;
  if (restore.email)   emailInput.value   = restore.email;

  // initial payment link (if any)
  setPaymentLink(lp?.paymentUrl || '');

  // 1) try library match first (new system)
  const lib = readAccounts();
  const libMatch = lib.find(x => isSameIdentity(x, restore) && x.accountFields);
  if (libMatch) {
    renderAccount({
      orderId: libMatch.orderId,
      accountFields: libMatch.accountFields,
      accountConfig: libMatch.accountConfig || '',
      usernameFinal: libMatch.uf,
      email: libMatch.email
    });
    show(hintEl); hintEl.textContent = 'Detail akun dipulihkan dari cache (30 hari).';
    // tetap polling untuk sinkron status
    if (restore.orderId && restore.uf && restore.email) startPolling(restore);
    return;
  }

  // 2) fallback: legacy last single
  const la = readLastAccount();
  if (la && isSameIdentity(la, restore) && la.accountFields) {
    renderAccount({
      orderId: la.orderId,
      accountFields: la.accountFields,
      accountConfig: la.accountConfig || '',
      usernameFinal: la.uf,
      email: la.email
    });
    show(hintEl); hintEl.textContent = 'Detail akun dipulihkan dari sesi sebelumnya.';
    if (restore.orderId && restore.uf && restore.email) startPolling(restore);
    return;
  }

  // 3) kalau ada data lengkap → langsung pantau
  if (restore.orderId && restore.uf && restore.email) {
    show(hintEl); hintEl.textContent = 'Data lookup dipulihkan otomatis dari URL/sesi sebelumnya.';
    startPolling(restore);
  }
})();
