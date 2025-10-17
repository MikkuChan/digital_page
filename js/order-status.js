/* order-status.js — FIX: pakai LS_LAST_PAYMENT dari ordervpn, link payment always clickable,
   auto-restore orderId+uf+email+paymentUrl, bersihkan saat PAID/FAILED. */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

const LS_LAST_PAYMENT = 'fdz_last_payment';   // <— SAMA dengan ordervpn.js
const LS_LAST_LOOKUP  = 'fdz_last_lookup';    // buat manual lookup fallback

// ===== short DOM helpers
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

// steps
const steps = $$('.status-steps .step');

let pollTimer = null;
let pollStart = 0;

// ===== utils
const show   = (el)=> el && (el.style.display = '');
const hide   = (el)=> el && (el.style.display = 'none');
const setTxt = (el,t)=> el && (el.textContent = t ?? '');
const showErr   = (el,msg)=>{ if(!el) return; el.innerHTML = `<div class="alert alert-danger">${msg}</div>`; show(el); };
const clearErr  = (el)=>{ if(!el) return; el.innerHTML=''; hide(el); };

function readLastPayment(){
  try { return JSON.parse(localStorage.getItem(LS_LAST_PAYMENT) || 'null'); }
  catch { return null; }
}
function writeLastPayment(obj){
  try { localStorage.setItem(LS_LAST_PAYMENT, JSON.stringify({ ...obj, ts: Date.now() })); } catch {}
}
function clearLastPayment(){
  try { localStorage.removeItem(LS_LAST_PAYMENT); } catch {}
}

// ===== payment link
function setPaymentLink(url){
  const apply = (a) => {
    if (!a) return;
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.classList.remove('disabled');
      a.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i> Buka Halaman Pembayaran`;
      a.style.pointerEvents = 'auto';
    } else {
      a.removeAttribute('href');
      a.classList.add('disabled');
      a.innerHTML = `<i class="bi bi-slash-circle me-1"></i> Tidak ada sesi pembayaran`;
      a.style.pointerEvents = 'none';
    }
  };
  apply(btnOpenPay);
  apply(btnOpenPayInline);
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
      p.ws_tls  ? `[WS TLS]\n${p.ws_tls}\n`   : '',
      p.ws_ntls ? `[WS Non-TLS]\n${p.ws_ntls}\n` : '',
      p.grpc    ? `[gRPC]\n${p.grpc}\n`      : '',
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
  setTxt(accUUID, p.uuid || '-');
  setTxt(accDomain, p.domain || '-');
  setTxt(accQuota, (p.quota_gb ?? '?') + ' GB');
  setTxt(accCreated, p.created || '-');
  setTxt(accExpired, p.expired || '-');

  if (p.ws_tls)  { setTxt(accWsTls, p.ws_tls);  show(blkWsTls); } else hide(blkWsTls);
  if (p.ws_ntls) { setTxt(accWsNtls, p.ws_ntls);show(blkWsNtls);} else hide(blkWsNtls);
  if (p.grpc)    { setTxt(accGrpc,  p.grpc);    show(blkGrpc);  } else hide(blkGrpc);

  setupActions(data);
  setSteps('PAID', true);
  // akun sudah jadi → bersihkan sesi pembayaran
  setPaymentLink('');
  clearLastPayment();
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
async function startPolling({ orderId, uf, email }){
  clearErr(errorBox); clearErr(errorBoxR);
  hide(resultBox); show(statusBox);

  setTxt(orderIdText, orderId);
  setTxt(ufText, uf);
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className = 'badge bg-info badge-pulse';
  setSteps('PENDING', false);

  // restore link dari last_payment kalau ada
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

      // atur link pembayaran
      const st = String(data.status || '').toUpperCase();
      if (data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
        // update store supaya tetap ada saat pindah halaman
        writeLastPayment({ orderId, uf, email, paymentUrl: data.paymentUrl, reference: data.reference || '' });
      } else if (st === 'PENDING') {
        const lp = readLastPayment();
        setPaymentLink(lp?.paymentUrl || '');
      } else {
        // PAID/FAILED → matikan link & hapus sesi
        setPaymentLink('');
        clearLastPayment();
      }

      const hasAccount = !!(data.accountFields && data.accountFields.username);

      if (st === 'PAID') {
        if (hasAccount) {
          statusBadge.textContent = 'Dibayar ✔';
          statusBadge.className   = 'badge bg-success';
          renderAccount(data);
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
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}
function stopPolling(){ if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

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

  try { localStorage.setItem(LS_LAST_LOOKUP, JSON.stringify({orderId, uf, email})); } catch {}
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

// ===== init (restore dari URL atau localStorage yg diisi ordervpn.js)
(function init(){
  const u = new URL(location.href);
  const qs = {
    orderId: u.searchParams.get('orderId') || '',
    uf     : u.searchParams.get('uf')      || '',
    email  : u.searchParams.get('email')   || ''
  };

  let restore = { ...qs };

  // kalau URL kurang lengkap, coba dari last_payment yg dibuat di ordervpn.js
  const last = readLastPayment();
  if ((!restore.orderId || !restore.uf || !restore.email) && last?.orderId && last?.uf && last?.email) {
    restore = { orderId: last.orderId, uf: last.uf, email: last.email };
  }

  // terakhir, coba dari lookup manual
  if (!restore.orderId || !restore.uf || !restore.email) {
    try {
      const lk = JSON.parse(localStorage.getItem(LS_LAST_LOOKUP) || 'null');
      if (lk?.orderId && lk?.uf && lk?.email) restore = lk;
    } catch {}
  }

  if (restore.orderId) orderIdInput.value = restore.orderId;
  if (restore.uf)      ufInput.value      = restore.uf;
  if (restore.email)   emailInput.value   = restore.email;

  // set link dari storage biar tombol langsung aktif meski API belum kebaca
  setPaymentLink(last?.paymentUrl || '');

  if (restore.orderId && restore.uf && restore.email) {
    hintEl.style.display = '';
    hintEl.textContent = 'Data lookup dipulihkan otomatis dari URL / sesi sebelumnya.';
    startPolling(restore);
  }
})();
