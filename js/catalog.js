/* catalog.js — katalog grid + modal checkout (improved init + empty state) */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const LS_LAST_PAYMENT = 'fdz_last_payment';
const LS_LAST_ORDER   = 'fdz_last_order';
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

let CFG = null, paymentWindow = null, pollTimer = null;

// ===== Persist helpers =====
function saveLastPayment(obj){ try{ localStorage.setItem(LS_LAST_PAYMENT, JSON.stringify({ ...obj, ts: Date.now() })); }catch{} }
function getLastPayment(){ try{ return JSON.parse(localStorage.getItem(LS_LAST_PAYMENT) || 'null'); }catch{ return null; } }
function clearLastPayment(){ try{ localStorage.removeItem(LS_LAST_PAYMENT); }catch{} }

// ===== UI refs =====
const grid = document.getElementById('catalogGrid');
const waitingBox = document.getElementById('waitingBox');
const orderIdText = document.getElementById('orderIdText');
const statusText = document.getElementById('statusText');
const payLink = document.getElementById('payLink');
const promoInfo = document.getElementById('promoInfo');

// Modal
let coModal; // Bootstrap.Modal
const co_variant = document.getElementById('co_variant');
const co_region = document.getElementById('co_region');
const co_serverId = document.getElementById('co_serverId');
const co_protocol = document.getElementById('co_protocol');
const co_username = document.getElementById('co_username');
const co_email = document.getElementById('co_email');
const btnCheckout = document.getElementById('btnCheckout');

// ===== Helpers =====
const rupiah = (n)=> (Number(n)||0).toLocaleString('id-ID');
const sanitizeBase = (s)=> String(s||'').toLowerCase().replace(/[^a-z0-9\-]/g,'').slice(0,20);
const withSuffix = (base)=> {
  const d=new Date();
  const suf=String(d.getSeconds()).padStart(2,'0')+String(Math.floor(d.getMilliseconds()/10)).padStart(2,'0');
  return `${sanitizeBase(base)}-${suf}`.slice(0,24);
};
const imgFor=(variant,region)=>{
  // ganti ke asetmu sendiri nanti
  const map={
    HP:{ SG:'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
         ID:'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&auto=format&fit=crop' },
    STB:{ SG:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop',
         ID:'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=1600&auto=format&fit=crop' }
  };
  return (map[variant] && map[variant][region]) || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop';
};

function setActive(btns, val, key){
  btns.forEach(b=>{
    const is = key==='variant' ? b.dataset.filterVariant===val : b.dataset.filterRegion===val;
    b.classList.toggle('active', is);
  });
}

// ===== Fetch config & render =====
async function loadConfig(){
  const r = await fetch(`${API_BASE}/config`, { headers: { 'accept':'application/json' } });
  if(!r.ok){
    const txt = await r.text().catch(()=> '');
    console.error('Gagal /config:', r.status, txt);
    throw new Error(`Gagal memuat /config (HTTP ${r.status}). Cek CORS (ALLOWED_ORIGINS) & API_BASE.`);
  }
  const j = await r.json();
  CFG = j;
  promoInfo.textContent = j?.promo?.status==='online' ? `Online • -Rp ${rupiah(j.promo.discount||0)}` : 'Tidak aktif';
}

function buildProducts(variant, region){
  const fallQuota = variant==='HP' ? 300 : 600;
  const items = (CFG?.variants?.[variant]?.[region] || []).map(s=>({
    id: s.id,
    title: `${region} ${variant} ${s.label}`,
    price: Number(s.price)||0,
    quota: s.quotaGB ?? fallQuota,
    days : s.expDays ?? 30,
    img: imgFor(variant, region),
    variant, region
  }));
  return items;
}

function cardHTML(p){
  return `
  <div class="card-prod">
    <img class="thumb" src="${p.img}" alt="${p.title}">
    <div class="body">
      <div class="title">${p.title}</div>
      <div class="meta">Kuota ~${p.quota}GB • ${p.days} hari</div>
      <div class="d-flex align-items-center justify-content-between">
        <div class="price">Rp ${rupiah(p.price)}</div>
        <button class="btn btn-primary btn-sm" data-buy
          data-variant="${p.variant}" data-region="${p.region}" data-serverid="${p.id}">
          <i class="bi bi-cart3 me-1"></i> Beli
        </button>
      </div>
      <div class="tags">
        <span class="badge badge-soft">${p.variant}</span>
        <span class="badge badge-soft">${p.region}</span>
      </div>
    </div>
  </div>`;
}

function renderGrid(variant, region){
  const items = buildProducts(variant, region);
  if (!items.length) {
    grid.innerHTML = `
      <div class="alert alert-warning">
        Belum ada server untuk kombinasi <b>${variant}</b> • <b>${region}</b>.
        Coba ubah filter atau isi ENV PRICE_${region}_${variant} di Worker.
      </div>`;
    return;
  }
  grid.innerHTML = items.map(cardHTML).join('');
}

// Cari kombinasi pertama yang tersedia di /config
function findFirstAvailable(){
  const variants = ['HP','STB'];
  const regions  = ['SG','ID'];
  for (const v of variants){
    for (const r of regions){
      if (Array.isArray(CFG?.variants?.[v]?.[r]) && CFG.variants[v][r].length) {
        return { v, r };
      }
    }
  }
  // fallback default
  return { v: 'HP', r: 'SG' };
}

// ===== Checkout flow =====
async function createInvoice(payload){
  const r = await fetch(`${API_BASE}/pay/create`, {
    method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload)
  });
  const j = await r.json().catch(()=>null);
  if(!r.ok || !j) throw new Error(j?.message || `Gagal membuat invoice (HTTP ${r.status})`);
  return j; // { orderId, paymentUrl, reference }
}

async function pollStatus(orderId){
  const start=Date.now();
  clearInterval(pollTimer);
  const tick = async ()=>{
    if(Date.now()-start > POLL_TIMEOUT_MS){
      statusText.textContent='Timeout. Silakan buka halaman pembayaran lagi.';
      statusText.className='badge bg-secondary';
      return clearInterval(pollTimer);
    }
    try{
      const r = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`, { headers:{'accept':'application/json'} });
      const d = await r.json();
      if(!r.ok){ statusText.textContent='Order tidak ditemukan / error.'; statusText.className='badge bg-danger'; return clearInterval(pollTimer); }

      if (d.paymentUrl) {
        payLink.href = d.paymentUrl;
        const cur = getLastPayment();
        if (cur && cur.orderId === (d.orderId || orderId)) saveLastPayment({ ...cur, paymentUrl: d.paymentUrl });
      }

      const s = String(d.status||'').toUpperCase();
      if (s==='PAID'){ statusText.textContent='Pembayaran diterima ✔'; statusText.className='badge bg-success'; clearLastPayment(); return clearInterval(pollTimer); }
      if (s==='FAILED'){ statusText.textContent='Pembayaran gagal ✖'; statusText.className='badge bg-danger'; clearLastPayment(); return clearInterval(pollTimer); }
      statusText.textContent='Menunggu pembayaran...'; statusText.className='badge bg-warning text-dark';
    }catch(e){ console.warn('poll error', e); }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function openCheckoutModal(title, variant, region, serverId){
  document.getElementById('checkoutTitle').textContent = title;
  co_variant.value = variant;
  co_region.value = region;
  co_serverId.value = serverId;
  co_protocol.value = 'vmess';
  co_username.value = '';
  co_email.value = '';
  if (!coModal) coModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
  coModal.show();
}

async function doCheckout(){
  const variant = co_variant.value.trim();
  const region  = co_region.value.trim();
  const serverId= co_serverId.value.trim();
  const protocol= co_protocol.value;
  const username= sanitizeBase(co_username.value||'user');
  const email   = (co_email.value||'').trim();

  if (!username) return alert('Username wajib diisi.');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email tidak valid.');

  const usernameFinal = withSuffix(username);

  try{
    btnCheckout.disabled = true;
    btnCheckout.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

    const res = await createInvoice({ variant, region, serverId, protocol, username, usernameFinal, email, promoCode: '' });
    const { orderId, paymentUrl, reference } = res;
    if (!orderId || !paymentUrl) throw new Error('Respon API tidak valid.');

    try{ localStorage.setItem(LS_LAST_ORDER, orderId); }catch{}
    saveLastPayment({ orderId, paymentUrl, reference });

    orderIdText.textContent = orderId;
    statusText.textContent  = 'Menunggu pembayaran...';
    statusText.className    = 'badge bg-warning text-dark';
    payLink.href = paymentUrl;
    waitingBox.style.display = '';
    coModal.hide();

    if (!paymentWindow || paymentWindow.closed) paymentWindow = window.open(paymentUrl, '_blank', 'noopener'); else paymentWindow.focus();

    pollStatus(orderId);
  }catch(e){
    console.error('checkout error', e);
    alert(e.message || 'Gagal membuat invoice');
  }finally{
    btnCheckout.disabled = false;
    btnCheckout.innerHTML = '<i class="bi bi-shield-check me-1"></i> Lanjutkan Pembayaran';
  }
}

// ===== Bootstrap =====
async function init(){
  // Restore payment jika ada
  const last = getLastPayment();
  if (last && last.orderId){
    orderIdText.textContent = last.orderId;
    statusText.textContent = 'Menunggu pembayaran...';
    statusText.className = 'badge bg-warning text-dark';
    if (last.paymentUrl) payLink.href = last.paymentUrl;
    waitingBox.style.display = '';
    pollStatus(last.orderId);
  }

  // Load config
  try{
    await loadConfig();
  }catch(err){
    grid.innerHTML = `<div class="alert alert-danger">
      ${err.message}<br><small>Cek: window.API_BASE = ${API_BASE}</small>
    </div>`;
    return;
  }

  // Tentukan filter awal berdasarkan data yang ADA
  const { v: initVariant, r: initRegion } = findFirstAvailable();
  renderGrid(initVariant, initRegion);

  // set active pada tombol filter
  setActive([...document.querySelectorAll('[data-filter-variant]')], initVariant, 'variant');
  setActive([...document.querySelectorAll('[data-filter-region]')], initRegion, 'region');

  // Filter events
  const vBtns=[...document.querySelectorAll('[data-filter-variant]')];
  const rBtns=[...document.querySelectorAll('[data-filter-region]')];
  let curVariant=initVariant, curRegion=initRegion;

  vBtns.forEach(b=> b.addEventListener('click', ()=>{
    curVariant = b.dataset.filterVariant;
    setActive(vBtns, curVariant, 'variant');
    renderGrid(curVariant, curRegion);
  }));
  rBtns.forEach(b=> b.addEventListener('click', ()=>{
    curRegion = b.dataset.filterRegion;
    setActive(rBtns, curRegion, 'region');
    renderGrid(curVariant, curRegion);
  }));

  // Delegate buy buttons
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    const variant = btn.dataset.variant;
    const region  = btn.dataset.region;
    const serverId= btn.dataset.serverid;
    const titleEl = btn.closest('.card-prod')?.querySelector('.title');
    const title = titleEl ? titleEl.textContent.trim() : 'Beli Paket';
    openCheckoutModal(title, variant, region, serverId);
  });

  btnCheckout.addEventListener('click', doCheckout);
}

init().catch(err=>{
  console.error(err);
  grid.innerHTML = `<div class="alert alert-danger">Gagal memuat katalog. Coba muat ulang.</div>`;
});
