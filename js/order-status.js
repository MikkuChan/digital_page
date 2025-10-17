/* order-status.js */
const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

const LS_LOOKUP = 'fdz_last_lookup'; // simpan {orderId, uf, email}
const q = (sel) => document.querySelector(sel);

// elemen kiri (form)
const orderIdInput = q('#orderIdInput');
const ufInput      = q('#ufInput');
const emailInput   = q('#emailInput');
const btnLookup    = q('#btnLookup');
const errorBox     = q('#errorBox');
const hintEl       = q('#hint');

// elemen kanan (status/result)
const statusBox   = q('#statusBox');
const resultBox   = q('#resultBox');
const errorBoxR   = q('#errorBoxRight');
const orderIdText = q('#orderIdText');
const ufText      = q('#ufText');
const statusBadge = q('#statusBadge');
const btnOpenPay  = q('#btnOpenPayment');

// account fields
const accUsername = q('#accUsername');
const accUUID     = q('#accUUID');
const accDomain   = q('#accDomain');
const accQuota    = q('#accQuota');
const accCreated  = q('#accCreated');
const accExpired  = q('#accExpired');
const blkWsTls    = q('#blk-ws-tls');
const blkWsNtls   = q('#blk-ws-ntls');
const blkGrpc     = q('#blk-grpc');
const accWsTls    = q('#accWsTls');
const accWsNtls   = q('#accWsNtls');
const accGrpc     = q('#accGrpc');
const copyAllBtn  = q('#copyAllBtn');
const downloadBtn = q('#downloadConfigBtn');

let pollTimer = null;

const show = (el) => el && (el.style.display = '');
const hide = (el) => el && (el.style.display = 'none');
const setText = (el, t) => el && (el.textContent = t ?? '');

function showErr(target, msg) {
  if (!target) return;
  target.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
  show(target);
}
function clearErr(target){ if (target) { target.innerHTML=''; hide(target); } }

function setPaymentUrl(url) {
  if (url) {
    btnOpenPay.href = url;
    btnOpenPay.classList.remove('disabled');
  } else {
    btnOpenPay.removeAttribute('href');
    btnOpenPay.classList.add('disabled');
  }
}

function buildTextDump(data) {
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

function setupActions(data) {
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
    a.download = `${data.orderId || 'vpn-account'}.txt`;
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

  if (p.ws_tls)   { setText(accWsTls, p.ws_tls);   show(blkWsTls);   } else hide(blkWsTls);
  if (p.ws_ntls)  { setText(accWsNtls, p.ws_ntls); show(blkWsNtls);  } else hide(blkWsNtls);
  if (p.grpc)     { setText(accGrpc, p.grpc);      show(blkGrpc);    } else hide(blkGrpc);

  setupActions(data);
}

async function fetchStatus(orderId, uf, email){
  const url = `${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}&uf=${encodeURIComponent(uf)}&email=${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || 'Order tidak ditemukan.');
  return data;
}

async function startPolling({orderId, uf, email}){
  clearErr(errorBox);
  clearErr(errorBoxR);
  hide(resultBox);
  show(statusBox);

  setText(orderIdText, orderId);
  setText(ufText, uf);
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className = 'badge bg-info badge-pulse';

  const start = Date.now();
  const tick = async () => {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      statusBadge.textContent = 'Timeout';
      statusBadge.className = 'badge bg-secondary';
      stopPolling();
      return;
    }
    try {
      const data = await fetchStatus(orderId, uf, email);
      setPaymentUrl(data?.paymentUrl || '');
      const st = String(data.status || '').toUpperCase();

      if (st === 'PAID') {
        if (data.accountFields && data.accountFields.username) {
          statusBadge.textContent = 'Dibayar ✔';
          statusBadge.className = 'badge bg-success';
          renderAccount(data);
          stopPolling();
        } else {
          statusBadge.textContent = 'Dibayar (menyiapkan akun)…';
          statusBadge.className = 'badge bg-warning text-dark';
        }
      } else if (st === 'FAILED') {
        statusBadge.textContent = 'Gagal ✖';
        statusBadge.className = 'badge bg-danger';
        stopPolling();
      } else {
        statusBadge.textContent = 'Menunggu pembayaran…';
        statusBadge.className = 'badge bg-warning text-dark badge-pulse';
      }
    } catch (e) {
      showErr(errorBoxR, e.message || 'Terjadi kesalahan.');
    }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPolling(){ if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

// form submit
q('#lookupForm').addEventListener('submit', (e)=>{
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

// copy line buttons (cfg)
document.addEventListener('click', async (e) => {
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

// auto init: ambil dari URL / localStorage
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
