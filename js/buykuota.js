/* global QRious */
(() => {
  const $ = (id) => document.getElementById(id);
  const elProductList = $('productList');
  const elMsisdn = $('msisdn');
  const elCheckSession = $('checkSessionBtn');
  const elOtpArea = $('otpArea');
  const elOtpCode = $('otpCode');
  const elSubmitOtp = $('submitOtpBtn');
  const elResendOtp = $('resendOtpBtn');
  const elSessionInfo = $('sessionInfo');

  const elSummaryProduct = $('summaryProduct');
  const elSummaryMsisdn = $('summaryMsisdn');
  const elSummaryPrice = $('summaryPrice');

  const elPayBtn = $('payBtn');
  const elErrBox = $('errBox');

  const waitingBox = $('waitingBox');
  const orderIdText = $('orderIdText');
  const statusText = $('statusText');
  const payLink = $('payLink');

  const provBox = $('provBox');
  const deeplinkWrap = $('deeplinkWrap');
  const deeplinkBtn = $('deeplinkBtn');
  const qrisWrap = $('qrisWrap');
  const qrisCanvas = $('qrisCanvas');
  const provExtra = $('provExtra');

  // state
  let CONFIG = null;
  let SELECTED = null; // product object
  let ACCESS_TOKEN = null;
  let AUTH_ID = null;
  let ORDER_ID = null;
  let POLL = null;

  // ---------- helpers ----------
  function money(n){ 
    n = Number(n||0);
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  function showErr(msg){
    elErrBox.style.display='block';
    elErrBox.className = 'alert alert-danger';
    elErrBox.textContent = msg || 'Terjadi kesalahan.';
  }
  function clearErr(){
    elErrBox.style.display='none';
    elErrBox.textContent = '';
  }
  function setLoading(disabled){
    [elCheckSession, elSubmitOtp, elResendOtp, elPayBtn].forEach(b=>{
      if (b) b.disabled = !!disabled;
    });
  }

  // ---------- load config (produk dari env worker) ----------
  async function loadConfig(){
    const r = await fetch(`${window.API_BASE}/kuota/config`);
    const js = await r.json();
    CONFIG = js;
    renderProducts(js.products || []);
  }

  function renderProducts(items){
    elProductList.innerHTML = '';
    if (!items.length){
      elProductList.innerHTML = `<div class="col-12"><div class="alert alert-warning">Produk belum tersedia.</div></div>`;
      return;
    }
    items.forEach((p, i) => {
      const col = document.createElement('div');
      col.className = 'col-12';
      col.innerHTML = `
        <label class="product-card">
          <input type="radio" name="product" value="${p.id}" ${i===0?'checked':''}/>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="product-title">${p.title}</div>
                <div class="product-sub">${p.subtitle || ''}</div>
              </div>
              <div class="product-price">${money(p.sellPrice || 0)}</div>
            </div>
            <div class="small text-muted mt-1">Pembayaran provider: <b>${p.payment_method}</b></div>
          </div>
        </label>
      `;
      elProductList.appendChild(col);
    });
    // set default selected
    updateSelection();
    elProductList.addEventListener('change', updateSelection, { once:true });
    elProductList.addEventListener('change', updateSummary);
  }

  function updateSelection(){
    const val = (document.querySelector('input[name="product"]:checked')||{}).value;
    SELECTED = (CONFIG.products || []).find(x => String(x.id) === String(val)) || null;
    updateSummary();
  }

  function updateSummary(){
    elSummaryProduct.textContent = SELECTED ? `${SELECTED.title}` : '-';
    elSummaryMsisdn.textContent = formatMsisdn(elMsisdn.value || '-');
    elSummaryPrice.textContent = SELECTED ? money(SELECTED.sellPrice||0) : 'Rp 0';
    elPayBtn.disabled = !(SELECTED && ACCESS_TOKEN && validMsisdn(elMsisdn.value));
  }

  function validMsisdn(s){
    s = String(s||'').trim();
    return /^0[0-9]{9,13}$/.test(s);
  }
  function formatMsisdn(s){ return String(s||'').replace(/\s+/g,''); }

  // ---------- Step 1: Cek sesi / OTP ----------
  elCheckSession.addEventListener('click', async (e) => {
    e.preventDefault(); clearErr();
    const msisdn = formatMsisdn(elMsisdn.value);
    if (!validMsisdn(msisdn)) return showErr('Nomor XL tidak valid.');

    setLoading(true);
    try{
      const r = await fetch(`${window.API_BASE}/kuota/otp/start`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ msisdn })
      });
      const js = await r.json();

      if (js.access_token){
        ACCESS_TOKEN = js.access_token;
        elSessionInfo.style.display='block';
        elSessionInfo.innerHTML = `<span class="badge bg-success">Sesi ditemukan</span> &nbsp;<code class="text-muted">${ACCESS_TOKEN.split(':')[0]}:****</code>`;
        elOtpArea.style.display='none';
        updateSummary();
        return;
      }

      if (js.needOtp){
        AUTH_ID = js.auth_id;
        elOtpArea.style.display='block';
        elSessionInfo.style.display='block';
        elSessionInfo.innerHTML = `<span class="badge bg-warning text-dark">OTP dibutuhkan</span> Kirim ke nomor <b>${formatMsisdn(msisdn)}</b>`;
        updateSummary();
        return;
      }

      showErr(js.message || 'Gagal memulai sesi/OTP.');
    } catch(err){
      showErr('Network error saat cek sesi/OTP.');
    } finally{
      setLoading(false);
    }
  });

  elResendOtp.addEventListener('click', async () => {
    // panggil start lagi untuk resend
    const msisdn = formatMsisdn(elMsisdn.value);
    if (!validMsisdn(msisdn)) return;
    try{
      await fetch(`${window.API_BASE}/kuota/otp/start`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ msisdn, resend: true })
      });
      elOtpCode.value = '';
      elOtpCode.focus();
    }catch{}
  });

  elSubmitOtp.addEventListener('click', async (e) => {
    e.preventDefault(); clearErr();
    const msisdn = formatMsisdn(elMsisdn.value);
    const code = String(elOtpCode.value||'').trim();
    if (!AUTH_ID) return showErr('Auth ID tidak ditemukan. Klik Cek/OTP dulu.');
    if (!/^[0-9]{4,8}$/.test(code)) return showErr('Kode OTP tidak valid.');

    setLoading(true);
    try{
      const r = await fetch(`${window.API_BASE}/kuota/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ msisdn, auth_id: AUTH_ID, kode_otp: code })
      });
      const js = await r.json();
      if (js.access_token){
        ACCESS_TOKEN = js.access_token;
        elOtpArea.style.display='none';
        elSessionInfo.style.display='block';
        elSessionInfo.innerHTML = `<span class="badge bg-success">Login OTP sukses</span>`;
        updateSummary();
      }else{
        showErr(js.message || 'OTP salah/expired.');
      }
    } catch(err){
      showErr('Network error saat verifikasi OTP.');
    } finally{
      setLoading(false);
    }
  });

  elMsisdn.addEventListener('input', updateSummary);

  // ---------- Step 2: Buat invoice Duitku ----------
  $('kuotaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  });

  elPayBtn.addEventListener('click', async (e) => {
    e.preventDefault(); clearErr();
    if (!SELECTED) return showErr('Silakan pilih paket terlebih dahulu.');
    if (!ACCESS_TOKEN) return showErr('Silakan login/OTP dahulu.');
    const msisdn = formatMsisdn(elMsisdn.value);
    if (!validMsisdn(msisdn)) return showErr('Nomor XL tidak valid.');

    setLoading(true);
    try{
      const r = await fetch(`${window.API_BASE}/kuota/create`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          productId: SELECTED.id,
          msisdn,
          access_token: ACCESS_TOKEN
        })
      });
      const js = await r.json();
      if (!r.ok){
        showErr(js?.message || 'Gagal membuat invoice.');
        return;
      }
      ORDER_ID = js.orderId;
      waitingBox.style.display='block';
      orderIdText.textContent = ORDER_ID;
      statusText.className = 'badge bg-warning text-dark';
      statusText.textContent = 'Menunggu…';
      payLink.href = js.paymentUrl;
      payLink.target = '_blank';
      // mulai polling
      startPolling();
      // scroll ke panel
      waitingBox.scrollIntoView({ behavior:'smooth', block:'center' });
    }catch(err){
      showErr('Network error saat membuat invoice.');
    }finally{
      setLoading(false);
    }
  });

  // ---------- polling status ----------
  function startPolling(){
    stopPolling();
    POLL = setInterval(checkStatus, 3000);
  }
  function stopPolling(){
    if (POLL){ clearInterval(POLL); POLL = null; }
  }
  async function checkStatus(){
    if (!ORDER_ID) return;
    try{
      const r = await fetch(`${window.API_BASE}/kuota/status?orderId=${encodeURIComponent(ORDER_ID)}`);
      const js = await r.json();

      if (js.status === 'PAID' || js.status === 'SUCCESS'){
        statusText.className = 'badge bg-success';
        statusText.textContent = 'Lunas';
        // tampilkan instruksi provider (deeplink/QR)
        renderProvider(js.provider || {});
        stopPolling();
      }else if (js.status === 'FAILED' || js.status === 'EXPIRED'){
        statusText.className = 'badge bg-danger';
        statusText.textContent = 'Gagal / Expired';
        stopPolling();
      }else{
        statusText.className = 'badge bg-warning text-dark';
        statusText.textContent = 'Menunggu…';
      }
    }catch{}
  }

  function renderProvider(p){
    provBox.style.display='block';

    // Deeplink
    if (p.have_deeplink && p.deeplink_data && p.deeplink_data.deeplink_url){
      deeplinkWrap.style.display='block';
      deeplinkBtn.href = p.deeplink_data.deeplink_url;
    }else{
      deeplinkWrap.style.display='none';
    }

    // QRIS
    if (p.is_qris && p.qris_data && p.qris_data.qr_code){
      qrisWrap.style.display='block';
      const qr = new QRious({
        element: qrisCanvas,
        value: p.qris_data.qr_code,
        size: 320
      });
      // fallback size
      setTimeout(()=>{ try{ qr.size = 320; }catch{} }, 0);
    }else{
      qrisWrap.style.display='none';
    }

    // extra
    const expAt = p.qris_data && p.qris_data.payment_expired_at ? new Date(p.qris_data.payment_expired_at*1000) : null;
    provExtra.textContent = expAt ? `QR/Deeplink berlaku hingga ${expAt.toLocaleString('id-ID')}` : '';
    provBox.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  // init
  loadConfig().catch(()=> showErr('Gagal memuat daftar produk.'));
})();
