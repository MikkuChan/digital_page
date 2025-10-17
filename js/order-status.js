/* order-status.js (improved UI + progress tracker) */
const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;
const LS_LOOKUP = 'fdz_last_lookup';

const q  = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];

// form
const orderIdInput = q('#orderIdInput');
const ufInput      = q('#ufInput');
const emailInput   = q('#emailInput');
const lookupForm   = q('#lookupForm');
const errorBox     = q('#errorBox');
const hintEl       = q('#hint');

// status/result (right)
const statusBox    = q('#statusBox');
const resultBox    = q('#resultBox');
const errorBoxR    = q('#errorBoxRight');
const orderIdText  = q('#orderIdText');
const ufText       = q('#ufText');
const statusBadge  = q('#statusBadge');
const btnOpenPay   = q('#btnOpenPayment');
const btnOpenPayInline = q('#btnOpenPaymentInline');

// account fields
const accUsername  = q('#accUsername');
const accUUID      = q('#accUUID');
const accDomain    = q('#accDomain');
const accQuota     = q('#accQuota');
const accCreated   = q('#accCreated');
const accExpired   = q('#accExpired');
const blkWsTls     = q('#blk-ws-tls');
const blkWsNtls    = q('#blk-ws-ntls');
const blkGrpc      = q('#blk-grpc');
const accWsTls     = q('#accWsTls');
const accWsNtls    = q('#accWsNtls');
const accGrpc      = q('#accGrpc');
const copyAllBtn   = q('#copyAllBtn');
const downloadBtn  = q('#downloadConfigBtn');

// steps
const steps = qa('.status-steps .step');

let pollTimer = null;

const show = (el)=> el && (el.style.display = '');
const hide = (el)=> el && (el.style.display = 'none');
const setText = (el,t)=> el && (el.textContent = t ?? '');
const showErr = (target,msg)=>{ if(!target)return; target.innerHTML = `<div class="alert alert-danger">${msg}</div>`; show(target); };
const clearErr = (target)=>{ if(!target)return; target.innerHTML=''; hide(target); };

function setPaymentUrl(url){
  const toggle = (a, has)=>{ if(has){ a.href=url; a.classList.remove('disabled'); } else { a.removeAttribute('href'); a.classList.add('disabled'); } };
  toggle(btnOpenPay, !!url);
  toggle(btnOpenPayInline, !!url);
}

function setStepsByStatus(status, hasAccount){
  // reset
  steps.forEach(s => s.classList.remove('active','done'));
  // order dibuat minimal step 1 aktif
  steps[0].classList.add('active');

  const s = String(status||'').toUpperCase();
  if (s === 'FAILED') { steps[1].classList.add('active'); return; }

  if (s === 'PENDING' || s === '') {
    steps[1].classList.add('active');
    return;
  }

  if (s === 'PAID' && !hasAccount) {
    steps[0].classList.add('done');
    steps[1].classList.add('done');
    steps[2].classList.add('active');
    return;
  }

  if (s === 'PAID' && hasAccount) {
    steps[0].classList.add('done');
    steps[1].classList.add('done');
    steps[2].classList.add('done');
    steps[3].classList.add('active');
  }
}

function buildTextDump(data){
  if (data.accountFields && data.accountFields.username) {
    const p = data.accountFields;
    const lines = [
      '=== FADZDIGITAL VPN ACCOUNT ===',
      `Username : ${p.username || ''}`,
      `UUID     : ${p.uuid || ''}`,
      `Domain   : ${p.domain || ''}`,
      `Quota    : ${p.quota_gb || '?'} GB`,
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
    setTimeout(()=>copyAllBtn.innerHTML=h,1500);
  };
  downloadBtn.onclick = ()=>{
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.orderId || 'vpn-account'}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
}

function renderAccount(data){
  hide(statusBox);
  show(resultBox);

  const p = data.accountFields || {};
  setText(accUsername, p.username || '-');
  setText(accUUID, p.uuid || '-');
  setText(accDomain, p.domain || '-');
  setText(accQuota, (p.quota_gb != null ? p.quota_gb : '?') + ' GB');
  setText(accCreated, p.created || '-');
  setText(accExpired, p.expired || '-');

  if (p.ws_tls)   { setText(accWsTls, p.ws_tls);   show(blkWsTls); } else hide(blkWsTls);
  if (p.ws_ntls)  { setText(accWsNtls, p.ws_ntls); show(blkWsNtls);} else hide(blkWsNtls);
  if (p.grpc)     { setText(accGrpc, p.grpc);      show(blkGrpc);  } else hide(blkGrpc);

  setupActions(data);
  setStepsByStatus('PAID', true);
}

async function fetchStatus(orderId, uf, email){
  const url = `${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}&uf=${encodeURIComponent(uf)}&email=${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || 'Order tidak ditemukan.');
  return data;
}

let pollTimerStart = 0;
async function startPolling({orderId, uf, email}){
  clearErr(errorBox); clearErr(errorBoxR);
  hide(resultBox); show(statusBox);

  setText(orderIdText, orderId);
  setText(ufText, uf);
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className   = 'badge bg-info badge-pulse';

  setStepsByStatus('PENDING', false);

  pollTimerStart = Date.now();
  const tick = async ()=>{
    if (Date.now() - pollTimerStart > POLL_TIMEOUT_MS) {
      statusBadge.textContent = 'Timeout';
      statusBadge.className   = 'badge bg-secondary';
      stopPolling(); return;
    }
    try{
      const data = await fetchStatus(orderId, uf, email);
      setPaymentUrl(data?.paymentUrl || '');
      const st = String(data.status || '').toUpperCase();
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
          setStepsByStatus('PAID', false);
        }
      } else if (st === 'FAILED') {
        statusBadge.textContent = 'Gagal ✖';
        statusBadge.className   = 'badge bg-danger';
        setStepsByStatus('FAILED', false);
        stopPolling();
      } else {
        statusBadge.textContent = 'Menunggu pembayaran…';
        statusBadge.className   = 'badge bg-warning text-dark badge-pulse';
        setStepsByStatus('PENDING', false);
      }
    }catch(e){
      showErr(errorBoxR, e.message || 'Terjadi kesalahan.');
    }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPolling(){ if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

// submit
lookupForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  clearErr(errorBox); clearErr(errorBoxR);

  const orderId = (orderIdInput.value || '').trim();
  const uf      = (ufInput.value || '').trim();
  const email   = (emailInput.value || '').trim();

  if (!orderId) return showErr(errorBox, 'Order ID wajib diisi.');
  if (!uf)      return showErr(errorBox, 'Username Final (uf) wajib diisi.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showErr(errorBox, 'Email wajib & harus valid.');

  try { localStorage.setItem(LS_LOOKUP, JSON.stringify({orderId, uf, email})); } catch {}
  startPolling({orderId, uf, email});
});

// cfg copy buttons
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.cfg-copy'); if(!btn) return;
  const id = btn.dataset.target; const el = document.getElementById(id);
  if (el) {
    await navigator.clipboard.writeText(el.textContent);
    const h = btn.innerHTML; btn.innerHTML = '<i class="bi bi-check-lg"></i>';
    setTimeout(()=>btn.innerHTML=h,1500);
  }
});

// auto init (URL / localStorage)
(function init(){
  const u = new URL(location.href);
  const orderId = u.searchParams.get('orderId') || '';
  const uf      = u.searchParams.get('uf')      || '';
  const email   = u.searchParams.get('email')   || '';

  let restored = {orderId, uf, email};
  if (!orderId || !uf || !email) {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_LOOKUP) || 'null');
      if (saved && saved.orderId && saved.uf && saved.email) restored = saved;
    } catch {}
  }

  if (restored.orderId) orderIdInput.value = restored.orderId;
  if (restored.uf)      ufInput.value = restored.uf;
  if (restored.email)   emailInput.value = restored.email;

  if (restored.orderId && restored.uf && restored.email) {
    hintEl.style.display = '';
    hintEl.textContent = 'Data lookup dipulihkan otomatis dari URL/sesi sebelumnya.';
    startPolling(restored);
  }
})();
