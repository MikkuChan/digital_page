/* js/buykuota.js – XL Kuota */

const API_BASE = (window.API_BASE || '').replace(/\/+$/,'');
const $ = (sel) => document.querySelector(sel);

function show(el){ if (typeof el==='string') el=$(el); if (el) el.style.display=''; }
function hide(el){ if (typeof el==='string') el=$(el); if (el) el.style.display='none'; }
function setText(n,v){ const el=(typeof n==='string')?$(n):n; if(el) el.textContent=v??''; }
function setHtml(n,v){ const el=(typeof n==='string')?$(n):n; if(el) el.innerHTML=v??''; }
function rupiah(n){ return Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}); }

async function fetchJSON(url,opt={}){
  const r = await fetch(url,{ headers:{'content-type':'application/json'}, ...opt });
  const t = await r.text(); let js; try{ js=JSON.parse(t);}catch{ js={raw:t}; }
  if(!r.ok){ throw new Error((js&& (js.message||js.error))||`HTTP ${r.status}`); }
  return js;
}
function toast(msg,type='danger'){
  const box=$('#errorBox'); if(!box) return alert(msg);
  box.className=`alert alert-${type}`; box.style.display='block'; box.innerText=msg;
  setTimeout(()=>{ box.style.display='none'; },4000);
}
function startLoading(){ const o=$('#loadingOverlay'); if(o){ o.style.display='flex'; o.style.opacity='1'; } }
function stopLoading(){ const o=$('#loadingOverlay'); if(o){ o.style.opacity='0'; setTimeout(()=>o.style.display='none',300); } }
function escapeHtml(s){ return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

/* --- URL helpers: dukung beberapa nama param --- */
function qp(k){
  const u = new URL(window.location.href);
  return u.searchParams.get(k) || u.hash.replace(/^#\??/,'').split('&').map(x=>x.split('=')).find(([a])=>a===k)?.[1] || null;
}
function pickOrderIdFromUrl(){
  return qp('orderId') || qp('merchantOrderId') || qp('merchantorderid') || qp('order_id') || null;
}

/* --- DOM refs --- */
const els = {
  packId: $('#packId'), msisdn: $('#msisdn'), promoCode: $('#promoCode'),
  btnSession: $('#btnSession'), otpWrap: $('#otpWrap'), otpInput: $('#otpInput'),
  btnVerifyOtp: $('#btnVerifyOtp'), btnPay: $('#btnPay'),
  detailsPreview: $('#detailsPreview'), pricePreview: $('#pricePreview'),
  packLabelPreview: $('#packLabelPreview'), msisdnPreview: $('#msisdnPreview'),
  waitingBox: $('#waitingBox'), resultBox: $('#resultBox'),
  orderIdText: $('#orderIdText'), statusText: $('#statusText'),
  payLink: $('#payLink'), resultInfo: $('#resultInfo')
};

/* --- State --- */
const state = { products:[], selected:null, auth_id:null, access_token:null, orderId:null, pollTimer:null };

/* --- Local AT cache (opsional) --- */
function saveLocalSession(msisdn, token){ if(msisdn && token) localStorage.setItem(`xl_at:${msisdn}`, token); }
function readLocalSession(msisdn){ return msisdn ? localStorage.getItem(`xl_at:${msisdn}`) : null; }

/* ================== CONFIG ================== */
async function loadConfig(){
  try{
    const cfg = await fetchJSON(`${API_BASE}/xl/config`);
    const list = Array.isArray(cfg.products) ? cfg.products : [];
    state.products = list;
    if (els.packId){
      els.packId.innerHTML =
        `<option value="" selected disabled>-- Pilih Paket --</option>` +
        list.map(p=>`<option value="${p.id}" data-price="${p.price||0}">${escapeHtml(p.label||p.id)} — ${rupiah(p.price||0)}</option>`).join('');
    }
  }catch(e){
    // Jangan blokir alur order — cukup info
    console.debug('Gagal load config:', e.message);
    toast(`Gagal memuat paket: ${e.message}`, 'warning');
  }
}

/* ================== UI summary ================== */
function recalcSummary(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  const packId = els.packId?.value || '';
  const prod = state.products.find(p=>p.id===packId) || null;
  state.selected = prod || null;

  setText(els.packLabelPreview, prod ? (prod.label||prod.id) : '-');
  setText(els.msisdnPreview, msisdn || '-');

  if (prod){
    setText(els.detailsPreview, `${prod.label||prod.id} • Metode: ${prod.payment_method||'-'}`);
    setText(els.pricePreview, `${rupiah(prod.price||0)} (sebelum promo)`);
  }else{
    setText(els.detailsPreview, '-'); setText(els.pricePreview, 'Rp 0');
  }
  if (!state.auth_id) hide(els.otpWrap);
}

/* ================== Session / OTP ================== */
async function onEnsureSession(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  if (!msisdn) return toast('Nomor HP harus diisi.', 'warning');

  startLoading();
  try{
    const r = await fetchJSON(`${API_BASE}/xl/ensure-session`, { method:'POST', body: JSON.stringify({ msisdn }) });
    if (r.access_token){
      state.access_token = r.access_token; saveLocalSession(msisdn, r.access_token);
      state.auth_id = null; hide(els.otpWrap);
      toast('Sesi ditemukan. Siap lanjut ke pembayaran.', 'success'); return;
    }
    if (r.session === 'OTP_SENT' && r.auth_id){
      state.auth_id = r.auth_id; state.access_token = null; show(els.otpWrap);
      toast('OTP terkirim. Cek SMS lalu masukkan kodenya.', 'info'); return;
    }
    toast('Tidak ada respon sesi yang dikenali.', 'warning');
  }catch(e){ toast(`Gagal cek sesi/kirim OTP: ${e.message}`); }
  finally{ stopLoading(); }
}

async function onVerifyOtp(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  const otp = (els.otpInput?.value||'').trim();
  if (!msisdn || !state.auth_id || !otp) return toast('MSISDN, auth_id, dan OTP wajib.', 'warning');

  startLoading();
  try{
    const r = await fetchJSON(`${API_BASE}/xl/submit-otp`, { method:'POST', body: JSON.stringify({ msisdn, auth_id: state.auth_id, otp }) });
    if (r.access_token){
      state.access_token = r.access_token; saveLocalSession(msisdn, r.access_token);
      state.auth_id = null; hide(els.otpWrap); toast('OTP valid. Sesi siap.', 'success');
    }else{ toast('OTP salah/expired.', 'danger'); }
  }catch(e){ toast(`Gagal verifikasi OTP: ${e.message}`); }
  finally{ stopLoading(); }
}

/* ================== Invoice ================== */
async function onCreateInvoice(){
  const packId = els.packId?.value || '';
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  const promo  = els.promoCode?.value || '';
  if (!packId) return toast('Pilih paket dulu.', 'warning');
  if (!msisdn) return toast('Nomor HP harus diisi.', 'warning');

  if (!state.access_token){
    const local = readLocalSession(msisdn);
    if (local) state.access_token = local;
  }

  startLoading();
  try{
    const body = { type:'XL', packId, msisdn };
    if (promo) body.promoCode = promo;
    const r = await fetchJSON(`${API_BASE}/pay/create`, { method:'POST', body: JSON.stringify(body) });

    if (!r.orderId || !r.paymentUrl) throw new Error('Gagal membuat invoice.');
    state.orderId = r.orderId;

    show(els.waitingBox); hide(els.resultBox);
    setText(els.orderIdText, r.orderId);
    if (els.statusText){ els.statusText.className='badge bg-warning text-dark'; setText(els.statusText,'MENUNGGU…'); }
    if (els.payLink){ els.payLink.href=r.paymentUrl; els.payLink.target='_blank'; }
    try{ window.open(r.paymentUrl,'_blank'); }catch{}

    startPollingStatus();
  }catch(e){ toast(`Gagal membuat invoice: ${e.message}`); }
  finally{ stopLoading(); }
}

/* ================== Status Polling ================== */
function startPollingStatus(){ stopPollingStatus(); state.pollTimer=setInterval(checkStatus, 3500); checkStatus(); }
function stopPollingStatus(){ if (state.pollTimer){ clearInterval(state.pollTimer); state.pollTimer=null; } }

async function checkStatus(){
  if (!state.orderId) return;
  try{
    const js = await fetchJSON(`${API_BASE}/pay/status?orderId=${encodeURIComponent(state.orderId)}`);
    const st = (js.status||'').toUpperCase();

    if (els.statusText){
      els.statusText.className='badge '+(st==='PAID'?'bg-success':(st==='FAILED'?'bg-danger':'bg-warning text-dark'));
      setText(els.statusText, st || '-');
    }

    if (st === 'PAID'){
      stopPollingStatus(); hide(els.waitingBox); show(els.resultBox);
      if (els.resultInfo){
        if (js.providerResult) setHtml(els.resultInfo, renderProviderResult(js.providerResult));
        else setHtml(els.resultInfo, `<div class="alert alert-info mb-0">Pembayaran diterima. Pesanan sedang diproses. Silakan refresh beberapa saat.</div>`);
      }
    } else if (st === 'FAILED'){
      stopPollingStatus(); toast('Pembayaran gagal atau kedaluwarsa.', 'danger');
    }
  }catch(e){
    // Jangan spam user; cukup log
    console.debug('status error:', e.message);
  }
}

function renderProviderResult(pr){
  try{
    const obj = (typeof pr === 'string') ? JSON.parse(pr) : pr;
    const pretty = escapeHtml(JSON.stringify(obj,null,2));
    return `
      <div class="mb-2 fw-bold">Hasil Provider:</div>
      <pre class="small p-2 rounded" style="background:#0f172a;color:#e2e8f0;overflow:auto;max-height:260px;">${pretty}</pre>
      <div class="text-muted small">Simpan bukti ini jika diperlukan.</div>
    `;
  }catch{
    return `<pre class="small p-2 rounded" style="background:#0f172a;color:#e2e8f0;overflow:auto;max-height:260px;">${escapeHtml(String(pr||''))}</pre>`;
  }
}

/* ================== Events & Boot ================== */
function bindEvents(){
  els.packId?.addEventListener('change', recalcSummary);
  els.msisdn?.addEventListener('input', recalcSummary);
  els.promoCode?.addEventListener('input', recalcSummary);
  els.btnSession?.addEventListener('click', e=>{ e.preventDefault(); onEnsureSession(); });
  els.btnVerifyOtp?.addEventListener('click', e=>{ e.preventDefault(); onVerifyOtp(); });
  els.btnPay?.addEventListener('click', e=>{ e.preventDefault(); onCreateInvoice(); });
  els.otpInput?.addEventListener('keypress', e=>{ if (e.key==='Enter'){ e.preventDefault(); onVerifyOtp(); }});
}

document.addEventListener('DOMContentLoaded', ()=>{
  bindEvents();

  // 1) **Auto-resume order** duluan, biar tidak ketahan error /xl/config
  const id = pickOrderIdFromUrl();
  if (id){
    state.orderId = id;
    show(els.waitingBox); hide(els.resultBox);
    setText(els.orderIdText, id);
    if (els.statusText){ els.statusText.className='badge bg-warning text-dark'; setText(els.statusText,'MENUNGGU…'); }
    startPollingStatus();
  }

  // 2) Load config jalan paralel (tidak block)
  loadConfig().then(recalcSummary);
});
