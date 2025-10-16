/* Katalog OrderVPN — polished UI/UX (search, sort, skeleton, persist payment) */

const API_BASE=(window.API_BASE||'').replace(/\/+$/,'')||`${location.origin}`;
const LS_LAST_PAYMENT='fdz_last_payment', LS_LAST_ORDER='fdz_last_order';
const POLL_INTERVAL_MS=5000, POLL_TIMEOUT_MS=10*60*1000;

let CFG=null, paymentWindow=null, pollTimer=null;
let curVariant='HP', curRegion='SG', qSearch='', qSort='price-asc';

// ====== persist helpers
const saveLastPayment=o=>{try{localStorage.setItem(LS_LAST_PAYMENT,JSON.stringify({...o,ts:Date.now()}))}catch{}};
const getLastPayment=()=>{try{return JSON.parse(localStorage.getItem(LS_LAST_PAYMENT)||'null')}catch{return null}};
const clearLastPayment=()=>{try{localStorage.removeItem(LS_LAST_PAYMENT)}catch{}};

// ====== refs
const grid=document.getElementById('catalogGrid');
const skeleton=document.getElementById('skeletonGrid');
const waitingBox=document.getElementById('waitingBox');
const orderIdText=document.getElementById('orderIdText');
const statusText=document.getElementById('statusText');
const payLink=document.getElementById('payLink');
const promoInfo=document.getElementById('promoInfo');
const searchBox=document.getElementById('searchBox');
const sortSel=document.getElementById('sortSel');

// modal
let coModal;
const co_variant=document.getElementById('co_variant');
const co_region=document.getElementById('co_region');
const co_serverId=document.getElementById('co_serverId');
const co_protocol=document.getElementById('co_protocol');
const co_username=document.getElementById('co_username');
const co_email=document.getElementById('co_email');
const btnCheckout=document.getElementById('btnCheckout');

// ====== helpers
const rupiah=n=>(Number(n)||0).toLocaleString('id-ID');
const sanitizeBase=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\-]/g,'').slice(0,20);
const withSuffix=base=>{const d=new Date();const suf=String(d.getSeconds()).padStart(2,'0')+String(Math.floor(d.getMilliseconds()/10)).padStart(2,'0');return `${sanitizeBase(base)}-${suf}`.slice(0,24)};
const imgFor=(v,r)=>{const m={HP:{SG:'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali01.jpg',ID:'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali02.jpg'},STB:{SG:'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali06.jpg',ID:'https://raw.githubusercontent.com/MikkuChan/digital_page/main/assets/citlali/citlali05.jpg'}};return (m[v]&&m[v][r])||'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop'};
const setActive=(els,val,key)=>els.forEach(b=>b.classList.toggle('active',(key==='variant'?b.dataset.filterVariant:b.dataset.filterRegion)===val));

// ====== data
async function loadConfig(){
  const r=await fetch(`${API_BASE}/config`,{headers:{accept:'application/json'}});
  if(!r.ok) throw new Error(`Gagal /config (HTTP ${r.status}).`);
  const j=await r.json(); CFG=j;
  promoInfo.textContent=j?.promo?.status==='online'?`Online • -Rp ${rupiah(j.promo.discount||0)}`:'Tidak aktif';
}
const products=(v,r)=>{
  const defQ=v==='HP'?300:600;
  return (CFG?.variants?.[v]?.[r]||[]).map(s=>({
    id:s.id,label:s.label,price:Number(s.price)||0,quota:s.quotaGB??defQ,days:s.expDays??30,
    variant:v,region:r,img:imgFor(v,r)
  }));
};

// ====== render
const card=p=>`
<article class="card-prod">
  ${(p.price<=10000)?'<div class="badge-ribbon">Best Value</div>':''}
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

function applySearchSort(items){
  let out=[...items];
  const q=(qSearch||'').trim().toLowerCase();
  if(q) out=out.filter(p=>(`${p.label} ${p.region} ${p.variant}`).toLowerCase().includes(q));
  switch(qSort){
    case 'price-desc': out.sort((a,b)=>b.price-a.price); break;
    case 'quota-desc': out.sort((a,b)=>b.quota-a.quota); break;
    case 'quota-asc':  out.sort((a,b)=>a.quota-b.quota); break;
    case 'label-asc':  out.sort((a,b)=>String(a.label).localeCompare(b.label)); break;
    default:           out.sort((a,b)=>a.price-b.price);
  }
  return out;
}
function render(){
  const items=applySearchSort(products(curVariant,curRegion));
  grid.innerHTML = items.length ? items.map(card).join('') :
    `<div class="alert alert-warning">Tidak ada item untuk filter ini. Ubah filter atau cek konfigurasi PRICE_${curRegion}_${curVariant}.</div>`;
}

// ====== checkout
async function createInvoice(payload){
  const r=await fetch(`${API_BASE}/pay/create`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const j=await r.json().catch(()=>null);
  if(!r.ok||!j) throw new Error(j?.message||`Gagal membuat invoice (HTTP ${r.status})`);
  return j;
}
async function pollStatus(orderId){
  const start=Date.now(); clearInterval(pollTimer);
  const tick=async()=>{
    if(Date.now()-start>POLL_TIMEOUT_MS){ statusText.textContent='Timeout. Silakan buka halaman pembayaran lagi.'; statusText.className='badge bg-secondary'; return clearInterval(pollTimer); }
    try{
      const r=await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`,{headers:{accept:'application/json'}});
      const d=await r.json();
      if(!r.ok){ statusText.textContent='Order tidak ditemukan / error.'; statusText.className='badge bg-danger'; return clearInterval(pollTimer); }
      if(d.paymentUrl){ payLink.href=d.paymentUrl; const cur=getLastPayment(); if(cur&&cur.orderId===(d.orderId||orderId)) saveLastPayment({...cur,paymentUrl:d.paymentUrl}); }
      const s=String(d.status||'').toUpperCase();
      if(s==='PAID'){ statusText.textContent='Pembayaran diterima ✔'; statusText.className='badge bg-success'; clearLastPayment(); return clearInterval(pollTimer); }
      if(s==='FAILED'){ statusText.textContent='Pembayaran gagal ✖'; statusText.className='badge bg-danger'; clearLastPayment(); return clearInterval(pollTimer); }
      statusText.textContent='Menunggu pembayaran...'; statusText.className='badge bg-warning text-dark';
    }catch{}
  };
  await tick(); pollTimer=setInterval(tick,POLL_INTERVAL_MS);
}
function openModal(title,v,r,sid){
  document.getElementById('checkoutTitle').textContent=title;
  co_variant.value=v; co_region.value=r; co_serverId.value=sid;
  co_protocol.value='vmess'; co_username.value=''; co_email.value='';
  if(!coModal) coModal=new bootstrap.Modal(document.getElementById('checkoutModal'));
  coModal.show();
}
async function doCheckout(){
  const variant=co_variant.value.trim(), region=co_region.value.trim(), serverId=co_serverId.value.trim();
  const protocol=co_protocol.value, username=sanitizeBase(co_username.value||'user'), email=(co_email.value||'').trim();
  if(!username) return alert('Username wajib diisi.');
  if(email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('Email tidak valid.');
  const usernameFinal=withSuffix(username);
  try{
    btnCheckout.disabled=true; btnCheckout.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
    const res=await createInvoice({variant,region,serverId,protocol,username,usernameFinal,email,promoCode:''});
    const {orderId,paymentUrl,reference}=res; if(!orderId||!paymentUrl) throw new Error('Respon API tidak valid.');
    try{localStorage.setItem(LS_LAST_ORDER,orderId)}catch{}
    saveLastPayment({orderId,paymentUrl,reference});
    orderIdText.textContent=orderId; statusText.textContent='Menunggu pembayaran...'; statusText.className='badge bg-warning text-dark';
    payLink.href=paymentUrl; waitingBox.style.display='';
    coModal.hide();
    if(!paymentWindow||paymentWindow.closed){ paymentWindow=window.open(paymentUrl,'_blank','noopener'); } else { paymentWindow.focus(); }
    pollStatus(orderId);
  }catch(e){ alert(e.message||'Gagal membuat invoice'); }
  finally{ btnCheckout.disabled=false; btnCheckout.innerHTML='<i class="bi bi-shield-check me-1"></i> Lanjutkan Pembayaran'; }
}

// ====== init
document.addEventListener('DOMContentLoaded', async ()=>{
  // restore payment
  const last=getLastPayment();
  if(last&&last.orderId){
    orderIdText.textContent=last.orderId; statusText.textContent='Menunggu pembayaran...';
    statusText.className='badge bg-warning text-dark'; if(last.paymentUrl) payLink.href=last.paymentUrl;
    waitingBox.style.display=''; pollStatus(last.orderId);
  }

  // load config + pick first available
  try{ await loadConfig(); }catch(e){ skeleton.style.display='none'; grid.innerHTML=`<div class="alert alert-danger">${e.message}</div>`; return; }
  for(const v of ['HP','STB']){ for(const r of ['SG','ID']){ if((CFG?.variants?.v?.r||CFG?.variants?.[v]?.[r]||[]).length){ curVariant=v; curRegion=r; break; } } if((CFG?.variants?.[curVariant]?.[curRegion]||[]).length) break; }
  skeleton.style.display='none'; render();

  // filter handlers
  const bv=[...document.querySelectorAll('[data-filter-variant]')];
  const br=[...document.querySelectorAll('[data-filter-region]')];
  setActive(bv,curVariant,'variant'); setActive(br,curRegion,'region');
  bv.forEach(b=>b.addEventListener('click',()=>{curVariant=b.dataset.filterVariant; setActive(bv,curVariant,'variant'); render()}));
  br.forEach(b=>b.addEventListener('click',()=>{curRegion=b.dataset.filterRegion; setActive(br,curRegion,'region'); render()}));

  // search + sort
  searchBox.addEventListener('input',()=>{ qSearch=searchBox.value; render(); });
  sortSel.addEventListener('change',()=>{ qSort=sortSel.value; render(); });

  // delegate buy
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-buy]'); if(!btn) return;
    const v=btn.dataset.variant, r=btn.dataset.region, sid=btn.dataset.serverid;
    const title=btn.closest('.card-prod')?.querySelector('.title')?.textContent?.trim() || 'Beli Paket';
    openModal(title,v,r,sid);
  });

  btnCheckout.addEventListener('click', doCheckout);
});
