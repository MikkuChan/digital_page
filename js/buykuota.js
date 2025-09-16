/* js/buykuota.js (updated)
   - Menampilkan field terpilih provider
   - Deeplink DANA + QRIS modal + countdown
   - Download bukti: {OrderId}.txt (teks rapi)
   - Auto resume dari ?orderId= saat kembali dari Duitku
*/

/* ====================== Utils ====================== */
const API_BASE = (window.API_BASE || '').replace(/\/+$/,'');
const $ = (sel) => document.querySelector(sel);

function show(el){ if (typeof el === 'string') el = $(el); if (el) el.style.display = ''; }
function hide(el){ if (typeof el === 'string') el = $(el); if (el) el.style.display = 'none'; }
function setText(id, v){ const el = (typeof id==='string') ? $(id) : id; if (el) el.textContent = v ?? ''; }
function setHtml(id, v){ const el = (typeof id==='string') ? $(id) : id; if (el) el.innerHTML = v ?? ''; }

function rupiah(n){
  const x = Number(n||0);
  return x.toLocaleString('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0});
}

async function fetchJSON(url, opt={}){
  const r = await fetch(url, {
    headers: {'content-type':'application/json'},
    ...opt
  });
  const txt = await r.text();
  let js; try { js = JSON.parse(txt); } catch { js = {raw:txt}; }
  if (!r.ok) {
    const msg = (js && (js.message || js.error)) ? (js.message || js.error) : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return js;
}

function toast(msg, type='danger'){
  const box = $('#errorBox');
  if (!box) return alert(msg);
  box.className = `alert alert-${type}`;
  box.style.display = 'block';
  box.innerText = msg;
  setTimeout(()=>{ box.style.display='none'; }, 4000);
}

function startLoading(){ const o = $('#loadingOverlay'); if (o){ o.style.display='flex'; o.style.opacity='1'; } }
function stopLoading(){ const o = $('#loadingOverlay'); if (o){ o.style.opacity='0'; setTimeout(()=>o.style.display='none',300); } }

/* ============== Elemen ============== */
const els = {
  packId:          $('#packId'),
  msisdn:          $('#msisdn'),
  promoCode:       $('#promoCode'),
  btnSession:      $('#btnSession'),
  otpWrap:         $('#otpWrap'),
  otpInput:        $('#otpInput'),
  btnVerifyOtp:    $('#btnVerifyOtp'),
  btnPay:          $('#btnPay'),
  detailsPreview:  $('#detailsPreview'),
  pricePreview:    $('#pricePreview'),
  packLabelPreview:$('#packLabelPreview'),
  msisdnPreview:   $('#msisdnPreview'),
  waitingBox:      $('#waitingBox'),
  resultBox:       $('#resultBox'),
  orderIdText:     $('#orderIdText'),
  statusText:      $('#statusText'),
  payLink:         $('#payLink'),
  resultInfo:      $('#resultInfo'),
  btnDownloadBukti:$('#btnDownloadBukti'),
  btnOpenDeeplink: $('#btnOpenDeeplink'),
  btnShowQRIS:     $('#btnShowQRIS')
};

/* ============== State ============== */
const state = {
  products: [],
  selected: null,
  auth_id: null,
  access_token: null,
  orderId: null,
  pollTimer: null,
  lastProviderNorm: null // simpan hasil normalize utk download bukti
};

function saveLocalSession(msisdn, token){
  if (!msisdn || !token) return;
  localStorage.setItem(`xl_at:${msisdn}`, token);
}
function readLocalSession(msisdn){
  if (!msisdn) return null;
  return localStorage.getItem(`xl_at:${msisdn}`);
}

/* ============== Load Config ============== */
async function loadConfig(){
  startLoading();
  try{
    const cfg = await fetchJSON(`${API_BASE}/xl/config`);
    const list = Array.isArray(cfg.products) ? cfg.products : [];
    state.products = list;

    if (els.packId){
      els.packId.innerHTML =
        `<option value="" selected disabled>-- Pilih Paket --</option>` +
        list.map(p => `<option value="${p.id}" data-price="${p.price||0}">${escapeHtml(p.label||p.id)} — ${rupiah(p.price||0)}</option>`).join('');
    }
  }catch(e){
    toast(`Gagal load config: ${e.message}`);
  }finally{
    stopLoading();
  }
}

/* ============== Helper UI ============== */
function escapeHtml(s){ return String(s||'').replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }

function recalcSummary(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  const packId = els.packId?.value || '';
  const prod = state.products.find(p => p.id === packId) || null;
  state.selected = prod || null;

  if (els.packLabelPreview) setText(els.packLabelPreview, prod ? (prod.label || prod.id) : '-');
  if (els.msisdnPreview)    setText(els.msisdnPreview,    msisdn || '-');

  if (prod){
    const detail = `${prod.label || prod.id} • Metode: ${prod.payment_method || '-'}`;
    setText(els.detailsPreview, detail);
    setText(els.pricePreview, `${rupiah(prod.price||0)} (sebelum promo)`);
  }else{
    setText(els.detailsPreview, '-');
    setText(els.pricePreview, 'Rp 0');
  }

  if (!state.auth_id) hide(els.otpWrap);
}

/* ============== Step 1: Cek sesi / Kirim OTP ============== */
async function onEnsureSession(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  if (!msisdn) return toast('Nomor HP harus diisi.', 'warning');

  startLoading();
  try{
    const r = await fetchJSON(`${API_BASE}/xl/ensure-session`, {
      method: 'POST',
      body: JSON.stringify({ msisdn })
    });

    if (r.access_token){
      state.access_token = r.access_token;
      saveLocalSession(msisdn, r.access_token);
      state.auth_id = null;
      hide(els.otpWrap);
      toast('Sesi ditemukan. Siap lanjut ke pembayaran.', 'success');
      return;
    }

    if (r.session === 'OTP_SENT' && r.auth_id){
      state.auth_id = r.auth_id;
      state.access_token = null;
      show(els.otpWrap);
      toast('OTP terkirim. Cek SMS dan masukkan kodenya.', 'info');
      return;
    }

    toast('Tidak ada respon sesi yang dikenali.', 'warning');
  }catch(e){
    toast(`Gagal cek sesi/kirim OTP: ${e.message}`);
  }finally{
    stopLoading();
  }
}

/* ============== Step 2: Verifikasi OTP ============== */
async function onVerifyOtp(){
  const msisdn = (els.msisdn?.value||'').replace(/\D/g,'');
  const otp = (els.otpInput?.value||'').trim();
  if (!msisdn || !state.auth_id || !otp) return toast('MSISDN, auth_id, dan OTP wajib.', 'warning');

  startLoading();
  try{
    const r = await fetchJSON(`${API_BASE}/xl/submit-otp`, {
      method: 'POST',
      body: JSON.stringify({ msisdn, auth_id: state.auth_id, otp })
    });
    if (r.access_token){
      state.access_token = r.access_token;
      saveLocalSession(msisdn, r.access_token);
      state.auth_id = null;
      hide(els.otpWrap);
      toast('Berhasil verifikasi OTP. Sesi siap.', 'success');
    }else{
      toast('OTP salah atau expired.', 'danger');
    }
  }catch(e){
    toast(`Gagal verifikasi OTP: ${e.message}`);
  }finally{
    stopLoading();
  }
}

/* ============== Step 3: Buat Invoice (Duitku) ============== */
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

    const r = await fetchJSON(`${API_BASE}/pay/create`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!r.orderId || !r.paymentUrl){
      throw new Error('Gagal membuat invoice.');
    }

    state.orderId = r.orderId;

    if (els.waitingBox) show(els.waitingBox);
    if (els.resultBox)  hide(els.resultBox);
    setText(els.orderIdText, r.orderId);
    setText(els.statusText, 'Menunggu…');
    if (els.payLink){ els.payLink.href = r.paymentUrl; els.payLink.target = '_blank'; }

    try { window.open(r.paymentUrl, '_blank'); } catch {}

    startPollingStatus();
  }catch(e){
    toast(`Gagal membuat invoice: ${e.message}`);
  }finally{
    stopLoading();
  }
}

/* ============== Polling status ============== */
function startPollingStatus(){
  stopPollingStatus();
  state.pollTimer = setInterval(checkStatus, 3500);
  checkStatus();
}
function stopPollingStatus(){
  if (state.pollTimer){ clearInterval(state.pollTimer); state.pollTimer = null; }
}

async function checkStatus(){
  if (!state.orderId) return;
  try{
    const js = await fetchJSON(`${API_BASE}/pay/status?orderId=${encodeURIComponent(state.orderId)}`);
    const st = (js.status || '').toUpperCase();

    if (els.statusText){
      els.statusText.className = 'badge ' + (st==='PAID' ? 'bg-success' : (st==='FAILED' ? 'bg-danger' : 'bg-warning text-dark'));
      setText(els.statusText, st || '-');
    }

    if (st === 'PAID'){
      stopPollingStatus();
      hide(els.waitingBox);
      show(els.resultBox);

      if (els.resultInfo){
        if (js.providerResult){
          // render + simpan normalized utk download bukti
          const html = renderProviderResult(js.providerResult);
          setHtml(els.resultInfo, html);
        }else{
          setHtml(els.resultInfo, `<div class="alert alert-info mb-0">Pembayaran diterima. Pesanan sedang diproses. Silakan refresh beberapa saat.</div>`);
        }
      }
    }
    else if (st === 'FAILED'){
      stopPollingStatus();
      toast('Pembayaran gagal atau kedaluwarsa.', 'danger');
    }
  }catch(e){
    console.debug('status error:', e.message);
  }
}

/* ====== NORMALISASI HASIL PROVIDER + RENDER TERARAH ====== */
function normalizeProviderResult(res){
  let obj = null;
  try { obj = (typeof res === 'string') ? JSON.parse(res) : res; } catch { obj = res; }
  if (!obj || typeof obj !== 'object') return { raw: res };

  const data = obj.data || {};
  const deeplink = data.deeplink_data || {};
  const qris = data.qris_data || {};

  const norm = {
    message: obj.message || data.message || '',
    trx_id:  data.trx_id || data.trxId || '',
    status:  data.status || obj.status || '',
    payment_method: (deeplink.payment_method || data.payment_method || '').toString() || 
                    (obj.is_qris ? 'QRIS' : ''),
    have_deeplink: !!obj.have_deeplink || !!data.have_deeplink || !!deeplink.deeplink_url,
    deeplink_url:  deeplink.deeplink_url || '',
    is_qris: !!obj.is_qris || !!data.is_qris || !!qris.qr_code,
    qris: {
      qr_code: qris.qr_code || '',
      payment_expired_at: qris.payment_expired_at || 0,
      remaining_time: qris.remaining_time || null
    },
    raw: obj
  };
  state.lastProviderNorm = norm;
  return norm;
}
function fmtBadge(v){
  const s = String(v||'').toUpperCase();
  const cls = s==='SUCCESS' ? 'bg-success' : (s==='PENDING'?'bg-warning text-dark':(s==='FAILED'?'bg-danger':'bg-secondary'));
  return `<span class="badge ${cls}">${s || '-'}</span>`;
}
function renderProviderResult(res){
  const n = normalizeProviderResult(res);

  // tombol deeplink / qris / download bukti
  if (els.btnOpenDeeplink){
    if (n.have_deeplink && n.deeplink_url){
      els.btnOpenDeeplink.style.display = '';
      els.btnOpenDeeplink.href = n.deeplink_url;
    } else {
      els.btnOpenDeeplink.style.display = 'none';
    }
  }
  if (els.btnShowQRIS){
    if (n.is_qris && n.qris.qr_code){
      els.btnShowQRIS.style.display = '';
      els.btnShowQRIS.onclick = ()=> showQrisModal(n.qris);
    } else {
      els.btnShowQRIS.style.display = 'none';
    }
  }
  // siapkan tombol Download Bukti (teks)
  prepareDownloadBukti();

  const html = `
    <div class="row g-3">
      <div class="col-12"><div class="alert alert-info mb-2">${escapeHtml(n.message || 'Hasil eksekusi provider')}</div></div>
      <div class="col-6">
        <div class="small text-muted">Trx ID</div>
        <div class="fw-semibold">${escapeHtml(n.trx_id || '-')}</div>
      </div>
      <div class="col-6">
        <div class="small text-muted">Status</div>
        <div>${fmtBadge(n.status)}</div>
      </div>
      <div class="col-6">
        <div class="small text-muted">Metode</div>
        <div class="fw-semibold">${escapeHtml(n.payment_method || (n.is_qris?'QRIS':'-'))}</div>
      </div>
      ${n.is_qris && n.qris.remaining_time != null ? `
        <div class="col-6">
          <div class="small text-muted">Sisa Waktu QR</div>
          <div class="fw-semibold" id="qrisInlineTimer">-</div>
        </div>` : ''
      }
    </div>
  `;

  if (n.is_qris && n.qris.remaining_time != null) {
    // tunggu elemen ada
    setTimeout(()=>{
      const el = document.getElementById('qrisInlineTimer');
      if (el) startInlineQrisCountdown(n.qris, el);
    }, 50);
  }

  return html;
}

/* ====== QRIS Modal + countdown ====== */
let qrisTimerId = null;
function showQrisModal(q){
  const img = document.getElementById('qrisImg');
  const aDL = document.getElementById('btnDownloadQR');
  const cd  = document.getElementById('qrisCountdown');
  if (!img || !aDL || !cd) return;

  const urlImg = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(q.qr_code)}`;
  img.src = urlImg;
  aDL.href = urlImg;

  if (qrisTimerId) clearInterval(qrisTimerId);
  const target = q.payment_expired_at ? (q.payment_expired_at * 1000) : (Date.now() + (q.remaining_time||300)*1000);
  const tick = ()=>{
    const s = Math.max(0, Math.floor((target - Date.now())/1000));
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    cd.textContent = `Sisa waktu: ${mm}:${ss}`;
    if (s<=0){ clearInterval(qrisTimerId); }
  };
  tick();
  qrisTimerId = setInterval(tick, 1000);

  try {
    const modal = new bootstrap.Modal(document.getElementById('qrisModal'));
    modal.show();
  } catch {}
}
function startInlineQrisCountdown(q, el){
  if (!el) return;
  const target = q.payment_expired_at ? (q.payment_expired_at * 1000) : (Date.now() + (q.remaining_time||300)*1000);
  const update = ()=>{
    const s = Math.max(0, Math.floor((target - Date.now())/1000));
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    el.textContent = `${mm}:${ss}`;
  };
  update();
  const id = setInterval(()=>{
    update();
    if (Date.now() >= target) clearInterval(id);
  }, 1000);
}

/* ====== Download Bukti (TXT rapih) ====== */
function buildReceiptText(){
  const n = state.lastProviderNorm || {};
  const orderId = state.orderId || '-';
  const nomor = (els.msisdn?.value || '').replace(/\D/g,'') || '-';
  const paket = state.selected ? (state.selected.label || state.selected.id) : '-';
  const now = new Date();
  const tanggal = now.toLocaleString('id-ID', { dateStyle:'full', timeStyle:'medium' });

  return [
    `=== BUKTI TRANSAKSI FADZDIGITAL ===`,
    ``,
    `Nomor Invoice : ${orderId}`,
    `Tanggal       : ${tanggal}`,
    ``,
    `Nomor XL      : ${nomor}`,
    `Paket         : ${paket}`,
    ``,
    `Status        : ${n.status || '-'}`,
    `Metode Bayar  : ${n.payment_method || (n.is_qris?'QRIS':'-')}`,
    `Trx Provider  : ${n.trx_id || '-'}`,
    `Pesan         : ${n.message || '-'}`,
    ``,
    `Catatan: simpan bukti ini. Jika terjadi kendala, hubungi CS dengan menyertakan Nomor Invoice.`,
    `====================================`
  ].join('\n');
}
function prepareDownloadBukti(){
  if (!els.btnDownloadBukti) return;
  const fileName = `${state.orderId || 'invoice'}.txt`;
  const blob = new Blob([buildReceiptText()], { type: 'text/plain;charset=utf-8' });
  els.btnDownloadBukti.href = URL.createObjectURL(blob);
  els.btnDownloadBukti.download = fileName;
}

/* ============== Event binding ============== */
function bindEvents(){
  els.packId?.addEventListener('change', recalcSummary);
  els.msisdn?.addEventListener('input', recalcSummary);
  els.promoCode?.addEventListener('input', recalcSummary);

  els.btnSession?.addEventListener('click', (e)=>{ e.preventDefault(); onEnsureSession(); });
  els.btnVerifyOtp?.addEventListener('click', (e)=>{ e.preventDefault(); onVerifyOtp(); });
  els.btnPay?.addEventListener('click', (e)=>{ e.preventDefault(); onCreateInvoice(); });

  els.otpInput?.addEventListener('keypress', (e)=>{
    if (e.key === 'Enter'){ e.preventDefault(); onVerifyOtp(); }
  });
}

/* ============== Auto resume dari ?orderId= ============== */
function bootFromQuery(){
  const sp = new URLSearchParams(location.search);
  const oid = sp.get('orderId') || sp.get('orderid') || '';
  if (!oid) return;
  state.orderId = oid;
  setText(els.orderIdText, oid);
  show(els.waitingBox);
  hide(els.resultBox);
  startPollingStatus();
}

/* ============== Boot ============== */
document.addEventListener('DOMContentLoaded', async ()=>{
  bindEvents();
  await loadConfig();
  recalcSummary();
  bootFromQuery(); // penting untuk redirect dari Duitku
});
