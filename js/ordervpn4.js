/* Katalog OrderVPN — polished UI/UX (search, sort, skeleton, persist payment, redirect to order-status)
   Update: checkout modal revamped — username final preview (fixed suffix), real-time price (promo aware), trust badges.
*/

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const LS_LAST_PAYMENT = 'fdz_last_payment';
const LS_LAST_ORDER   = 'fdz_last_order';

let CFG = null;
let paymentWindow = null;

let curVariant = 'HP';
let curRegion  = 'SG';
let qSearch = '';
let qSort = 'price-asc';

// ====== persist helpers
const saveLastPayment = (o) => {
  try { localStorage.setItem(LS_LAST_PAYMENT, JSON.stringify({ ...o, ts: Date.now() })); } catch {}
};
const clearLastPayment = () => { try { localStorage.removeItem(LS_LAST_PAYMENT); } catch {} };

// ====== refs (grid/filter)
const grid      = document.getElementById('catalogGrid');
const skeleton  = document.getElementById('skeletonGrid');
const promoInfo = document.getElementById('promoInfo');
const searchBox = document.getElementById('searchBox');
const sortSel   = document.getElementById('sortSel');

// restore banner elements
const waitingBox = document.getElementById('waitingBox');
const orderIdText = document.getElementById('orderIdText');
const payLink    = document.getElementById('payLink');
const btnMonitor = document.getElementById('btnMonitor');

// modal checkout
let coModal;
const co_variant  = document.getElementById('co_variant');
const co_region   = document.getElementById('co_region');
const co_serverId = document.getElementById('co_serverId');
const co_protocol = document.getElementById('co_protocol');
const co_username = document.getElementById('co_username');
const co_email    = document.getElementById('co_email');
const co_promo    = document.getElementById('co_promo');

const modalPromoMsg    = document.getElementById('modalPromoMsg');
const modalPromoAmount = document.getElementById('modalPromoAmount');
const modalPromoHelp   = document.getElementById('modalPromoHelp');
const btnCheckout      = document.getElementById('btnCheckout');

// modal summary / preview
const co_usernamePreview = document.getElementById('co_usernamePreview');
const ch_badgeRegion = document.getElementById('ch_badgeRegion');
const ch_varian = document.getElementById('ch_varian');
const ch_server = document.getElementById('ch_server');
const ch_protocol = document.getElementById('ch_protocol');
const ch_priceBase = document.getElementById('ch_priceBase');
const ch_priceFinal = document.getElementById('ch_priceFinal');
const ch_priceNote = document.getElementById('ch_priceNote');

// ====== helpers
const rupiah       = (n) => (Number(n) || 0).toLocaleString('id-ID');
const sanitizeBase = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 20);

// modal state
let MOD_SUFFIX = '';
let MOD_BASE_PRICE = 0;
let MOD_LABEL = '-';

const genSuffix = () => {
  // suffix 4 digit semi-random (deterministic per open). Biarkan fixed sepanjang modal dibuka.
  const d = new Date();
  const suf = String(d.getMinutes()).padStart(2, '0') + String(Math.floor(d.getSeconds()/6)).padStart(2, '0');
  return suf; // contoh: "0512"
};

const usernameFinalWith = (base, suf) => `${sanitizeBase(base || 'user')}-${suf}`.slice(0, 24);

const imgFor = (v, r) => {
  const m = {
    HP:  { SG: 'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali01.jpg',
           ID: 'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali03.png' },
    STB: { SG: 'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali06.jpg',
           ID: 'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali05.jpg' }
  };
  return (m[v] && m[v][r]) || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop';
};

const setActive = (els, val, key) => els.forEach(b => b.classList.toggle('active', (key === 'variant' ? b.dataset.filterVariant : b.dataset.filterRegion) === val));

// ====== data
async function loadConfig() {
  const r = await fetch(`${API_BASE}/config`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`Gagal /config (HTTP ${r.status}).`);
  const j = await r.json(); CFG = j;

  // pill promo status + nominal
  const isPromoOn = j?.promo?.status === 'online';
  promoInfo.textContent = isPromoOn
    ? `Online • -Rp ${rupiah(j.promo.discount || 0)}`
    : 'Tidak aktif';
  const promoPill = document.getElementById('promoPill');
  if (promoPill) promoPill.dataset.status = isPromoOn ? 'on' : 'off';

  // modal hint tentang promo
  if (modalPromoMsg && modalPromoAmount && modalPromoHelp) {
    if (isPromoOn) {
      modalPromoAmount.textContent = rupiah(j.promo.discount || 0);
      modalPromoMsg.style.display = '';
      modalPromoHelp.textContent = 'Promo aktif. Masukkan kode promo yang valid untuk dapat diskon.';
    } else {
      modalPromoMsg.style.display = 'none';
      modalPromoHelp.textContent = 'Masukkan kode promo jika ada.';
    }
  }
}

const products = (v, r) => {
  const defQ = v === 'HP' ? 300 : 600;
  return (CFG?.variants?.[v]?.[r] || []).map(s => ({
    id: s.id, label: s.label, price: Number(s.price) || 0, quota: s.quotaGB ?? defQ, days: s.expDays ?? 30,
    variant: v, region: r, img: imgFor(v, r)
  }));
};

// ====== render
const card = (p) => `
<article class="card-prod">
  ${(p.price <= 10000) ? '<div class="badge-ribbon">Best Value</div>' : ''}
  <img class="thumb" loading="lazy" src="${p.img}" alt="${p.label}">
  <div class="body">
    <h3 class="title">${p.region} ${p.variant} ${p.label}</h3>
    <div class="meta">Kuota ~${p.quota}GB • ${p.days} hari</div>
    <div class="feat">
      <span class="chip">${p.variant}</span>
      <span class="chip"><i class="bi bi-geo-alt"></i> ${p.region}</span>
      <span class="chip"><i class="bi bi-shield-check"></i> Otomatis</span>
    </div>
    <div class="cta">
      <div class="price">Rp ${rupiah(p.price)} <span class="text-muted" style="font-size:.8rem">/30 hari</span></div>
      <button class="btn-buy" data-buy data-variant="${p.variant}" data-region="${p.region}" data-serverid="${p.id}">
        <i class="bi bi-cart3 me-1"></i> Beli
      </button>
    </div>
  </div>
</article>`;

function applySearchSort(items) {
  let out = [...items];
  const q = (qSearch || '').trim().toLowerCase();
  if (q) out = out.filter(p => (`${p.label} ${p.region} ${p.variant}`).toLowerCase().includes(q));
  switch (qSort) {
    case 'price-desc': out.sort((a, b) => b.price - a.price); break;
    case 'quota-desc': out.sort((a, b) => b.quota - a.quota); break;
    case 'quota-asc':  out.sort((a, b) => a.quota - b.quota); break;
    case 'label-asc':  out.sort((a, b) => String(a.label).localeCompare(b.label)); break;
    default:           out.sort((a, b) => a.price - b.price);
  }
  return out;
}
function render() {
  const items = applySearchSort(products(curVariant, curRegion));
  grid.innerHTML = items.length
    ? items.map(card).join('')
    : `<div class="alert alert-warning">Tidak ada item untuk filter ini. Ubah filter atau cek konfigurasi PRICE_${curRegion}_${curVariant}.</div>`;
}

// ====== checkout helpers (modal)
function findServerPriceLabel(v, r, sid){
  const arr = CFG?.variants?.[v]?.[r] || [];
  const s = arr.find(x => String(x.id) === String(sid));
  return { price: Number(s?.price) || 0, label: s?.label || '-' };
}
function promoApply(base, code){
  const p = CFG?.promo;
  if (!p || p.status !== 'online' || !code) return { final: base, applied: false, discount: 0 };
  const codes = Array.isArray(p.codes) ? p.codes.map(c=>String(c).toLowerCase()) : [];
  const ok = codes.includes(String(code).toLowerCase());
  const disc = ok ? Number(p.discount) || 0 : 0;
  return { final: Math.max(0, base - disc), applied: ok, discount: disc };
}
function refreshModalPreview(){
  // username final preview
  const base = co_username.value || 'user';
  const uf = usernameFinalWith(base, MOD_SUFFIX);
  if (co_usernamePreview) co_usernamePreview.textContent = uf;

  // protocol & summary
  if (ch_protocol) ch_protocol.textContent = (co_protocol.value || 'VMess').toUpperCase();

  // price & promo
  const code = (co_promo?.value || '').trim();
  const p = promoApply(MOD_BASE_PRICE, code);
  if (ch_priceBase)  ch_priceBase.textContent  = rupiah(MOD_BASE_PRICE);
  if (ch_priceFinal) ch_priceFinal.textContent = rupiah(p.final);
  if (ch_priceNote)  ch_priceNote.textContent  = p.applied
      ? `Diskon promo -Rp ${rupiah(p.discount)} diterapkan`
      : 'Harga 30 hari';
}

// ====== checkout
function openModal(title, v, r, sid) {
  document.getElementById('checkoutTitle').textContent = title;
  co_variant.value = v;
  co_region.value = r;
  co_serverId.value = sid;
  co_protocol.value = 'vmess';
  co_username.value = '';
  co_email.value = '';
  if (co_promo) co_promo.value = '';

  // modal state
  MOD_SUFFIX = genSuffix();
  const { price, label } = findServerPriceLabel(v, r, sid);
  MOD_BASE_PRICE = price;
  MOD_LABEL = label;

  // fill summary
  if (ch_badgeRegion) ch_badgeRegion.textContent = r;
  if (ch_varian) ch_varian.textContent = v;
  if (ch_server) ch_server.textContent = label;

  // first preview
  refreshModalPreview();

  // wire realtime listeners (once)
  if (!coModal) {
    co_username.addEventListener('input', refreshModalPreview);
    co_protocol.addEventListener('change', () => {
      if (ch_protocol) ch_protocol.textContent = (co_protocol.value || 'VMess').toUpperCase();
    });
    if (co_promo) co_promo.addEventListener('input', refreshModalPreview);
  }

  if (!coModal) coModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
  coModal.show();
}

async function createInvoice(payload) {
  const r = await fetch(`${API_BASE}/pay/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.message || `Gagal membuat invoice (HTTP ${r.status})`);
  return j;
}

async function doCheckout() {
  const variant  = co_variant.value.trim();
  const region   = co_region.value.trim();
  const serverId = co_serverId.value.trim();
  const protocol = co_protocol.value;
  const username = sanitizeBase(co_username.value || 'user');
  const email    = (co_email.value || '').trim();
  const promoCode = (co_promo?.value || '').trim();

  if (!username) return alert('Username wajib diisi.');
  if (!email) return alert('Email wajib diisi.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Format email tidak valid.');

  const usernameFinal = usernameFinalWith(username, MOD_SUFFIX);

  try {
    btnCheckout.disabled = true;
    btnCheckout.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

    const res = await createInvoice({ variant, region, serverId, protocol, username, usernameFinal, email, promoCode });
    const { orderId, paymentUrl, reference } = res;
    if (!orderId || !paymentUrl) throw new Error('Respon API tidak valid.');

    // simpan untuk referensi (restore/riwayat)
    try { localStorage.setItem(LS_LAST_ORDER, orderId); } catch {}
    saveLastPayment({ orderId, paymentUrl, reference, uf: usernameFinal, email });

    // buka tab pembayaran
    if (!paymentWindow || paymentWindow.closed) {
      paymentWindow = window.open(paymentUrl, '_blank', 'noopener');
    } else {
      paymentWindow.location.href = paymentUrl;
      paymentWindow.focus();
    }

    // redirect ke halaman status (membawa auth minimal: orderId + uf + email)
    const q = new URLSearchParams({ orderId, uf: usernameFinal, email });
    location.href = `order-status.html?${q.toString()}`;
  } catch (e) {
    alert(e.message || 'Gagal membuat invoice');
  } finally {
    btnCheckout.disabled = false;
    btnCheckout.innerHTML = '<i class="bi bi-shield-check me-1"></i> Lanjutkan Pembayaran';
  }
}

// ====== restore pay session banner
function restorePaymentBanner() {
  try {
    const last = JSON.parse(localStorage.getItem(LS_LAST_PAYMENT) || 'null');
    if (!last || !last.orderId || !last.paymentUrl) {
      if (waitingBox) waitingBox.style.display = 'none';
      return;
    }
    if (orderIdText) orderIdText.textContent = last.orderId;
    if (payLink) {
      payLink.href = last.paymentUrl;
      payLink.target = '_blank'; payLink.rel = 'noopener';
    }
    if (btnMonitor) {
      const params = new URLSearchParams({ orderId: last.orderId, uf: last.uf || '', email: last.email || '' }).toString();
      btnMonitor.href = `order-status.html?${params}`;
    }
    if (waitingBox) waitingBox.style.display = '';
  } catch {
    if (waitingBox) waitingBox.style.display = 'none';
  }
}

// ====== init
document.addEventListener('DOMContentLoaded', async () => {
  // load config + pilih varian/region pertama yang tersedia
  try { await loadConfig(); }
  catch (e) {
    skeleton.style.display = 'none';
    grid.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    return;
  }

  for (const v of ['HP', 'STB']) {
    for (const r of ['SG', 'ID']) {
      if ((CFG?.variants?.[v]?.[r] || []).length) { curVariant = v; curRegion = r; break; }
    }
    if ((CFG?.variants?.[curVariant]?.[curRegion] || []).length) break;
  }

  skeleton.style.display = 'none';
  render();

  // restore sesi pembayaran (jika ada)
  restorePaymentBanner();

  // filter handlers
  const bv = [...document.querySelectorAll('[data-filter-variant]')];
  const br = [...document.querySelectorAll('[data-filter-region]')];
  const setActiveGroup = () => {
    bv.forEach(b => b.classList.toggle('active', b.dataset.filterVariant === curVariant));
    br.forEach(b => b.classList.toggle('active', b.dataset.filterRegion === curRegion));
  };
  setActiveGroup();
  bv.forEach(b => b.addEventListener('click', () => { curVariant = b.dataset.filterVariant; setActiveGroup(); render(); }));
  br.forEach(b => b.addEventListener('click', () => { curRegion  = b.dataset.filterRegion; setActiveGroup(); render(); }));

  // search + sort
  searchBox.addEventListener('input', () => { qSearch = searchBox.value; render(); });
  sortSel.addEventListener('change', () => { qSort = sortSel.value; render(); });

  // delegate buy
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]'); if (!btn) return;
    const v = btn.dataset.variant, r = btn.dataset.region, sid = btn.dataset.serverid;
    const title = btn.closest('.card-prod')?.querySelector('.title')?.textContent?.trim() || 'Beli Paket';
    openModal(title, v, r, sid);
  });

  // aksi checkout
  btnCheckout.addEventListener('click', doCheckout);
});
