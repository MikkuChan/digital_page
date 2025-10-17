/* order-status.js */
const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

const orderIdInput = document.getElementById('orderIdInput');
const btnLookup    = document.getElementById('btnLookup');
const btnOpenPay   = document.getElementById('btnOpenPayment');
const statusBox    = document.getElementById('statusBox');
const resultBox    = document.getElementById('resultBox');
const errorBox     = document.getElementById('errorBox');
const orderIdText  = document.getElementById('orderIdText');
const statusBadge  = document.getElementById('statusBadge');
const hintEl       = document.getElementById('hint');

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

const show = el => el && (el.style.display = '');
const hide = el => el && (el.style.display = 'none');
const setText = (el, t) => el && (el.textContent = t ?? '');

function showError(msg) {
  errorBox.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
  show(errorBox);
}

function clearError() {
  errorBox.innerHTML = '';
  hide(errorBox);
}

function setPaymentUrl(url){
  if (url) {
    btnOpenPay.href = url;
    btnOpenPay.classList.remove('disabled');
  } else {
    btnOpenPay.removeAttribute('href');
    btnOpenPay.classList.add('disabled');
  }
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
      p.ws_tls ? `[WS TLS]\n${p.ws_tls}\n` : '',
      p.ws_ntls ? `[WS Non-TLS]\n${p.ws_ntls}\n` : '',
      p.grpc ? `[gRPC]\n${p.grpc}\n` : '',
      'Simpan file ini untuk impor konfigurasi.'
    ];
    return lines.filter(Boolean).join('\n');
  }
  return data.accountConfig || '';
}

function showAccount(data) {
  hide(statusBox);
  show(resultBox);
  const p = data.accountFields;
  setText(accUsername, p.username);
  setText(accUUID, p.uuid);
  setText(accDomain, p.domain);
  setText(accQuota, `${p.quota_gb ?? '?'} GB`);
  setText(accCreated, p.created);
  setText(accExpired, p.expired);

  if (p.ws_tls) { setText(accWsTls, p.ws_tls); show(blkWsTls); } else hide(blkWsTls);
  if (p.ws_ntls) { setText(accWsNtls, p.ws_ntls); show(blkWsNtls); } else hide(blkWsNtls);
  if (p.grpc) { setText(accGrpc, p.grpc); show(blkGrpc); } else hide(blkGrpc);

  setupActions(data);
}

async function fetchStatus(orderId){
  const r = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || 'Order tidak ditemukan.');
  return data;
}

async function startPolling(orderId){
  clearError();
  hide(resultBox);
  show(statusBox);
  setText(orderIdText, orderId);
  statusBadge.textContent = 'Memeriksa…';
  statusBadge.className = 'badge bg-info';

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
      setPaymentUrl(data?.paymentUrl || localStorage.getItem('fdz_last_payurl') || '');
      const st = String(data.status || '').toUpperCase();
      if (st === 'PAID') {
        statusBadge.textContent = 'Dibayar ✔';
        statusBadge.className = 'badge bg-success';
        if (data.accountFields && data.accountFields.username) {
          showAccount(data);
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
        statusBadge.className = 'badge bg-warning text-dark';
      }
    } catch (e) {
      showError(e.message);
    }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPolling(){
  if (pollTimer) clearInterval(pollTimer), (pollTimer = null);
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.cfg-copy');
  if (btn) {
    const id = btn.dataset.target;
    const el = document.getElementById(id);
    if (el) {
      await navigator.clipboard.writeText(el.textContent);
      const h = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(()=>btn.innerHTML=h, 1500);
    }
  }
});

document.getElementById('lookupForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const oid = (orderIdInput.value || '').trim();
  if (!oid) return;
  localStorage.setItem('fdz_last_order', oid);
  startPolling(oid);
});

// Auto-init dari query/localStorage
(function init(){
  const u = new URL(location.href);
  const qid = u.searchParams.get('orderId');
  const last = localStorage.getItem('fdz_last_order');
  const oid = qid || last;
  const payurl = localStorage.getItem('fdz_last_payurl');
  if (payurl) setPaymentUrl(payurl);
  if (oid) {
    orderIdInput.value = oid;
    hintEl.style.display = '';
    hintEl.textContent = 'Order ID terdeteksi otomatis dari sesi sebelumnya / URL.';
    startPolling(oid);
  }
})();
