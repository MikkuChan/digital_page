// =========================
// orderkuota.js (FE logic)
// Backend base:
const API_BASE = 'https://call.fadzdigital.store';

// Small helpers
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function toast(msg, cls='info') {
  const el = document.createElement('div');
  el.className = `fdz-toast fdz-toast-${cls}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('show'), 10);
  setTimeout(()=> {
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 300);
  }, 2500);
}

function normMsisdn(raw) {
  let s = (raw || '').trim();
  if (!s) return '';
  if (s.startsWith('+62')) s = '0' + s.slice(3);
  else if (s.startsWith('62')) s = '0' + s.slice(2);
  return s;
}

// UI state
const state = {
  msisdn: '',
  loggedIn: false,
  catalog: [],
  payTimer: null,
};

// DOM refs
const inpMsisdn = $('#inpMsisdn');
const btnCheckSession = $('#btnCheckSession');
const btnSendOtp = $('#btnSendOtp');
const inpOtp = $('#inpOtp');
const btnVerifyOtp = $('#btnVerifyOtp');
const loginState = $('#loginState');
const btnRefreshDetail = $('#btnRefreshDetail');
const detailBody = $('#detailBody');
const activePackages = $('#activePackages');

const searchBox = $('#searchBox');
const methodFilter = $('#methodFilter');
const catalogGrid = $('#catalogGrid');

const payPanel = $('#payPanel');
const payMethodBadge = $('#payMethodBadge');
const payInfo = $('#payInfo');
const deeplinkWrap = $('#deeplinkWrap');
const deeplinkBtn = $('#deeplinkBtn');
const qrisWrap = $('#qrisWrap');
const qrisCanvas = $('#qrisCanvas');
const countdown = $('#countdown');
const btnResetPayPanel = $('#btnResetPayPanel');

// ---- Session & OTP ----
async function checkSession() {
  const msisdn = normMsisdn(inpMsisdn.value);
  if (!/^0\d{9,14}$/.test(msisdn)) {
    toast('Nomor tidak valid', 'warn');
    return;
  }
  state.msisdn = msisdn;

  try {
    const r = await fetch(`${API_BASE}/kuota/session?no_hp=${encodeURIComponent(msisdn)}`, { credentials: 'include' });
    const j = await r.json();
    state.loggedIn = !!j.loggedIn;
    updateLoginBadge(j.loggedIn, j.source);
    if (state.loggedIn) {
      await loadDetail();
    } else {
      activePackages.style.display = 'none';
    }
  } catch (e) {
    toast('Gagal cek sesi', 'error');
  }
}

function updateLoginBadge(ok, source) {
  if (ok) {
    loginState.className = 'badge bg-success';
    loginState.textContent = `Login (via ${source || 'cache'})`;
  } else {
    loginState.className = 'badge bg-secondary';
    loginState.textContent = 'Belum login';
  }
}

async function sendOtp() {
  const msisdn = normMsisdn(inpMsisdn.value);
  if (!/^0\d{9,14}$/.test(msisdn)) {
    toast('Nomor tidak valid', 'warn');
    return;
  }
  try {
    const r = await fetch(`${API_BASE}/kuota/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ no_hp: msisdn })
    });
    const j = await r.json();
    if (j.ok && j.alreadyLoggedIn) {
      state.loggedIn = true;
      updateLoginBadge(true, 'kv');
      await loadDetail();
      toast('Nomor sudah login', 'success');
      return;
    }
    if (j.ok) {
      toast('OTP terkirim. Cek SMS ya!', 'success');
    } else {
      toast(j.message || 'Gagal kirim OTP', 'error');
    }
  } catch (e) {
    toast('Gagal kirim OTP', 'error');
  }
}

async function verifyOtp() {
  const msisdn = normMsisdn(inpMsisdn.value);
  const kode_otp = (inpOtp.value || '').trim();
  if (!/^0\d{9,14}$/.test(msisdn)) return toast('Nomor tidak valid', 'warn');
  if (!kode_otp) return toast('Kode OTP wajib diisi', 'warn');

  try {
    const r = await fetch(`${API_BASE}/kuota/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ no_hp: msisdn, kode_otp })
    });
    const j = await r.json();
    if (j.ok && j.data?.loggedIn) {
      state.loggedIn = true;
      updateLoginBadge(true, 'otp');
      inpOtp.value = '';
      await loadDetail();
      toast('Login berhasil', 'success');
    } else {
      toast(j.message || 'Verifikasi gagal', 'error');
    }
  } catch (e) {
    toast('Verifikasi OTP gagal', 'error');
  }
}

async function loadDetail() {
  if (!state.msisdn) return;
  try {
    const r = await fetch(`${API_BASE}/kuota/detail?no_hp=${encodeURIComponent(state.msisdn)}`);
    const j = await r.json();
    if (!j.ok) {
      activePackages.style.display = 'none';
      return;
    }
    const d = j.data || {};
    renderActivePackages(d);
  } catch {
    activePackages.style.display = 'none';
  }
}

function renderActivePackages(data) {
  const quotas = Array.isArray(data.quotas) ? data.quotas : [];
  if (!quotas.length) {
    detailBody.innerHTML = `<div class="text-muted">Tidak ada paket aktif yang terdeteksi.</div>`;
  } else {
    const html = quotas.map(q => {
      const b = Array.isArray(q.benefits) ? q.benefits : [];
      const ben = b.map(it => `
        <div class="d-flex align-items-center justify-content-between border rounded px-2 py-1 mb-1">
          <div class="small">${it.name}${it.information ? ` <span class="text-muted">(${it.information})</span>` : ''}</div>
          <div class="small fw-semibold">${it.remaining_quota || it.quota || '-'}</div>
        </div>
      `).join('');
      return `
        <div class="fdz-cta bg-white border rounded p-3 mb-2">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <div class="fw-semibold">${q.name || '-'}</div>
              <div class="small text-muted">Expired: ${q.expired_at || '-'}</div>
            </div>
          </div>
          <div class="mt-2">${ben}</div>
        </div>
      `;
    }).join('');
    detailBody.innerHTML = html;
  }
  activePackages.style.display = 'block';
}

// ---- Catalog ----
async function loadCatalog() {
  try {
    const r = await fetch(`${API_BASE}/data/kuota/list`, { credentials: 'include' });
    const j = await r.json();
    if (j.ok) {
      state.catalog = j.data || [];
      renderCatalog();
    } else {
      catalogGrid.innerHTML = `<div class="col-12 text-danger">Gagal memuat katalog.</div>`;
    }
  } catch {
    catalogGrid.innerHTML = `<div class="col-12 text-danger">Gagal memuat katalog.</div>`;
  }
}

function renderCatalog() {
  const q = (searchBox.value || '').toLowerCase();
  const mf = (methodFilter.value || '').toUpperCase();

  const items = state.catalog.filter(it => {
    const okText = !q || (it.package_named_show || '').toLowerCase().includes(q);
    const okMethod = !mf || it.payment_method === mf;
    return okText && okMethod;
  });

  if (!items.length) {
    catalogGrid.innerHTML = `<div class="col-12 text-muted">Paket tidak ditemukan.</div>`;
    return;
  }

  catalogGrid.innerHTML = items.map(it => `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100 fdz-card hoverable">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <h6 class="mb-1">${it.package_named_show}</h6>
            <span class="badge bg-secondary">${it.payment_method}</span>
          </div>
          <div class="text-gradient fs-5 fw-bold mb-2">Rp ${Number(it.price_paket_show || 0).toLocaleString('id-ID')}</div>
          <div class="desc small flex-grow-1">${(it.desc_package_show || '').replaceAll('\n','<br>')}</div>
          <button class="btn btn-primary w-100 mt-3" data-pid="${it.paket_id}">
            <i class="bi bi-cart-plus me-1"></i>Order Paket Ini
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Bind buttons
  $$('#catalogGrid button[data-pid]').forEach(btn => {
    btn.addEventListener('click', () => startOrder(btn.getAttribute('data-pid')));
  });
}

// ---- Order & Payment Panel ----
function resetPayPanel() {
  if (state.payTimer) {
    clearInterval(state.payTimer);
    state.payTimer = null;
  }
  payInfo.innerHTML = '';
  payMethodBadge.textContent = '';
  deeplinkWrap.style.display = 'none';
  qrisWrap.style.display = 'none';
  countdown.textContent = '';
  payPanel.style.display = 'none';
}

async function startOrder(paket_id) {
  const msisdn = normMsisdn(inpMsisdn.value);
  if (!/^0\d{9,14}$/.test(msisdn)) return toast('Isi nomor yang valid dulu', 'warn');

  // Require login
  const sess = await fetch(`${API_BASE}/kuota/session?no_hp=${encodeURIComponent(msisdn)}`).then(r=>r.json()).catch(()=>({}));
  if (!sess.ok || !sess.loggedIn) {
    toast('Nomor belum login. Kirim & verifikasi OTP dulu.', 'warn');
    return;
  }

  // Place order to upstream via backend
  try {
    const r = await fetch(`${API_BASE}/kuota/order`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ paket_id, no_hp: msisdn })
    });
    const j = await r.json();
    if (!j.ok) {
      if (j.need_login) {
        toast('Nomor belum login. Verifikasi OTP dulu ya.', 'warn');
      } else {
        toast(j.message || 'Gagal order', 'error');
      }
      return;
    }

    // Show payment panel
    const d = j.data || {};
    payPanel.style.display = 'block';
    payMethodBadge.textContent = d.payment_method || '';
    payInfo.innerHTML = `
      <div><b>Nama Paket:</b> ${d.nama_paket || '-'}</div>
      <div><b>Nomor:</b> ${d.msisdn || '-'}</div>
      <div><b>Trx ID:</b> ${d.trx_id || '-'}</div>
      <div class="small text-muted mt-1">Selesaikan pembayaran di bawah ini.</div>
    `;

    // Deep Link (DANA)
    if (d.deeplink) {
      deeplinkWrap.style.display = 'block';
      deeplinkBtn.href = d.deeplink;
    } else {
      deeplinkWrap.style.display = 'none';
    }

    // QRIS
    if (d.is_qris && d.qris?.qr_code) {
      qrisWrap.style.display = 'block';
      // Render QR to canvas
      const canvas = qrisCanvas;
      canvas.width = 256; canvas.height = 256;
      await QRCode.toCanvas(canvas, d.qris.qr_code, { margin: 0, width: 256 });
    } else {
      qrisWrap.style.display = 'none';
    }

    // Countdown
    if (d.qris?.remaining_time) {
      let remain = Number(d.qris.remaining_time) || 0;
      countdown.textContent = `Sisa waktu: ${remain}s`;
      if (state.payTimer) clearInterval(state.payTimer);
      state.payTimer = setInterval(() => {
        remain--;
        if (remain <= 0) {
          clearInterval(state.payTimer);
          state.payTimer = null;
          countdown.textContent = 'Waktu habis. Silakan buat order baru.';
        } else {
          countdown.textContent = `Sisa waktu: ${remain}s`;
        }
      }, 1000);
    } else {
      countdown.textContent = '';
    }

    toast('Silakan selesaikan pembayaran.', 'success');
  } catch (e) {
    toast('Gagal membuat order', 'error');
  }
}

// ---- Events ----
btnCheckSession?.addEventListener('click', checkSession);
btnSendOtp?.addEventListener('click', sendOtp);
btnVerifyOtp?.addEventListener('click', verifyOtp);
btnRefreshDetail?.addEventListener('click', loadDetail);
btnResetPayPanel?.addEventListener('click', resetPayPanel);

searchBox?.addEventListener('input', renderCatalog);
methodFilter?.addEventListener('change', renderCatalog);

// Init
(async function init() {
  await loadCatalog();
})();
