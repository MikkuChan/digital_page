/* js/buykuota.js
   Frontend untuk pembelian kuota XL:
   - GET  :  {API_BASE}/xl/config
   - POST :  {API_BASE}/xl/ensure-session   { msisdn }
   - POST :  {API_BASE}/xl/submit-otp       { msisdn, auth_id, otp }
   - POST :  {API_BASE}/pay/create          { type:'XL', msisdn, packId, promoCode? }
   - GET  :  {API_BASE}/pay/status?orderId=...
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
  btnDownload:     $('#btnDownload'),

  // QRIS modal
  qrisModal:       $('#qrisModal'),
  qrisImage:       $('#qrisImage'),
  qrisCountdown:   $('#qrisCountdown'),
  btnCopyQrString: $('#btnCopyQrString')
};

/* ============== State ============== */
const state = {
  products: [],
  selected: null,
  auth_id: null,
  access_token: null,
  orderId: null,
  pollTimer: null,

  // QRIS
  qrisTimer: null,
  qrisRemaining: 0,
  qrisString: ''
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

/* ====== QRIS helpers ====== */
function startQrisCountdown(seconds){
  stopQrisCountdown();
  state.qrisRemaining = Math.max(0, parseInt(seconds||0,10) || 0);
  updateQrisCountdown();
  state.qrisTimer = setInterval(()=>{
    state.qrisRemaining = Math.max(0, state.qrisRemaining - 1);
    updateQrisCountdown();
    if (state.qrisRemaining <= 0) stopQrisCountdown();
  }, 1000);
}
function stopQrisCountdown(){
  if (state.qrisTimer){ clearInterval(state.qrisTimer); state.qrisTimer = null; }
}
function updateQrisCountdown(){
  if (!els.qrisCountdown) return;
  const s = state.qrisRemaining;
  if (!s) { els.qrisCountdown.innerText = ''; return; }
  const m = Math.floor(s/60), d = s%60;
  els.qrisCountdown.innerText = `Waktu tersisa: ${m}m ${d}s`;
}
function openQrisModal(qrString, remaining){
  state.qrisString = qrString || '';
  if (els.qrisImage){
    // Pakai layanan QR gratis untuk render (tanpa dependency)
    const url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrString || '');
    els.qrisImage.src = url;
  }
  startQrisCountdown(remaining || 0);

  if (els.btnCopyQrString){
    els.btnCopyQrString.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(state.qrisString || ''); toast('Data QR disalin.', 'success'); }
      catch{ toast('Gagal menyalin data QR.', 'danger'); }
    };
  }

  const modal = new bootstrap.Modal(els.qrisModal);
  modal.show();
}

/* ====== Download Bukti (TXT) ====== */
function downloadProof(orderId, data){
  const lines = [];
  lines.push("=== Bukti Pembelian Kuota XL ===");
  lines.push(`Nomor Invoice : ${orderId}`);
  if (data.trx_id) lines.push(`Transaksi ID  : ${data.trx_id}`);
  if (data.status) lines.push(`Status        : ${data.status}`);

  // cari payment_method
  let method = data.payment_method || '';
  if (!method && data.deeplink_data && data.deeplink_data.payment_method){
    method = data.deeplink_data.payment_method;
  }
  if (data.is_qris) method = 'QRIS';
  if (method) lines.push(`Metode Bayar  : ${method}`);

  const msg = data.message || (data.have_deeplink && method==='DANA'
              ? 'Silakan klik tombol BAYAR di aplikasi DANA.'
              : (data.is_qris ? 'Silakan scan/upload QR di e-wallet/m-banking Anda.' : 'Transaksi berhasil dieksekusi.'));

  if (msg) lines.push(`Pesan         : ${msg}`);

  if (data.is_qris && data.qris_data){
    lines.push("");
    lines.push("=== Instruksi QRIS ===");
    if (data.qris_data.remaining_time){
      const menit = Math.floor(data.qris_data.remaining_time / 60);
      const detik = data.qris_data.remaining_time % 60;
      lines.push(`Waktu Tersisa : ${menit} menit ${detik} detik`);
    }
    if (data.qris_data.qr_code){
      lines.push("QR Code:");
      lines.push(data.qris_data.qr_code);
    }
  }

  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${orderId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ====== Render hasil provider (ringkas) ====== */
function renderProviderBox(data){
  // derive fields
  const trx = data.trx_id || '-';
  const st  = data.status || '-';
  let method = data.payment_method || (data.deeplink_data && data.deeplink_data.payment_method) || (data.is_qris ? 'QRIS' : (data.have_deeplink ? 'DANA' : 'PULSA/BALANCE'));
  if (!method && data.is_qris) method = 'QRIS';

  const msg = data.message || (data.have_deeplink && method==='DANA'
              ? 'Pastikan kamu punya aplikasi DANA lalu klik tombol BAYAR.'
              : (data.is_qris ? 'Silakan scan/upload QR di e-wallet/m-banking Anda.' : 'Transaksi berhasil diproses.'));

  // badges
  const stBadge = (st || '').toUpperCase() === 'SUCCESS' ? 'bg-success' : 'bg-secondary';

  let extra = '';
  // tombol DANA deeplink
  if (data.have_deeplink && data.deeplink_data && data.deeplink_data.deeplink_url){
    extra += `
      <a class="btn btn-primary w-100 mt-2" href="${escapeHtml(data.deeplink_data.deeplink_url)}" target="_blank" rel="noopener">
        <i class="bi bi-lightning-charge"></i> Buka DANA &amp; Bayar
      </a>`;
  }
  // tombol QRIS
  if (data.is_qris && data.qris_data && data.qris_data.qr_code){
    extra += `
      <button id="btnShowQris" class="btn btn-outline-primary w-100 mt-2">
        <i class="bi bi-qr-code"></i> Tampilkan QRIS
      </button>`;
  }

  return `
    <div class="border rounded p-3" style="background:#0f172a0a;">
      <div class="mb-2"><span class="badge ${stBadge}">${escapeHtml(st || '-')}</span></div>
      <div class="mb-1"><b>Transaksi ID</b><br><code>${escapeHtml(trx)}</code></div>
      <div class="mb-1"><b>Metode Bayar</b><br>${escapeHtml(method || '-')}</div>
      <div class="mb-2"><b>Pesan</b><br>${escapeHtml(msg || '-')}</div>
      ${extra}
    </div>
  `;
}

/* ====== Cek status ====== */
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

      // Tampilkan box hasil provider (ringkas)
      if (els.resultInfo){
        const pr = js.providerResult || null;
        if (pr){
          // render ringkas
          setHtml(els.resultInfo, renderProviderBox(pr));

          // aktifkan tombol QRIS modal jika ada
          if (pr.is_qris && pr.qris_data && pr.qris_data.qr_code){
            const btnQ = document.getElementById('btnShowQris');
            if (btnQ) btnQ.onclick = ()=> openQrisModal(pr.qris_data.qr_code, pr.qris_data.remaining_time);
          }

          // munculkan tombol download
          if (els.btnDownload){
            els.btnDownload.style.display = 'block';
            els.btnDownload.onclick = () => downloadProof(state.orderId, {
              trx_id: pr.trx_id,
              status: pr.status,
              payment_method: (pr.payment_method || (pr.deeplink_data && pr.deeplink_data.payment_method) || (pr.is_qris ? 'QRIS' : '')),
              message: pr.message || (pr.is_qris ? 'Silakan scan/upload QR di e-wallet/m-banking Anda.' : (pr.have_deeplink ? 'Silakan bayar via DANA.' : 'Transaksi berhasil.')),
              is_qris: pr.is_qris,
              qris_data: pr.qris_data,
              have_deeplink: pr.have_deeplink,
              deeplink_data: pr.deeplink_data
            });
          }
        }else{
          setHtml(els.resultInfo, `<div class="alert alert-info mb-0">Pembayaran diterima. Pesanan sedang diproses. Silakan refresh beberapa saat.</div>`);
        }
      }
    }
    else if (st === 'FAILED'){
      stopPollingStatus();
      toast('Pembayaran gagal atau kedaluwarsa.', 'danger');
    } else {
      // tetap menunggu
    }
  }catch(e){
    console.debug('status error:', e.message);
  }
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

/* ============== Boot ============== */
document.addEventListener('DOMContentLoaded', async ()=>{
  bindEvents();
  await loadConfig();
  recalcSummary();

  // Auto-load status dari query ?orderId=... (returnUrl Duitku)
  const url = new URL(window.location.href);
  const orderId = url.searchParams.get('orderId');
  if (orderId) {
    state.orderId = orderId;
    if (els.waitingBox) show(els.waitingBox);
    if (els.resultBox)  hide(els.resultBox);
    setText(els.orderIdText, orderId);
    setText(els.statusText, 'Menunggu…');
    startPollingStatus();
  }
});
