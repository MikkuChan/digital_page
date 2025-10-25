/* Order Kuota FE (update)
   - Katalog: GET /data/kuota/list
   - Session check: GET /kuota/session (backend auto-cek ke upstream kalau KV kosong)
   - OTP request: POST /kuota/otp/request (balik auth_id -> disimpan otomatis)
   - OTP verify: POST /kuota/otp/verify  (cukup no_hp + kode_otp; auth_id diambil dari server-side)
   - Buat invoice: POST /kuota/pay/create
   - Poll status:  GET /kuota/pay/status
*/

(() => {
  const API_BASE = 'https://call.fadzdigital.store';

  // ------ Helpers ------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function showOverlay(flag){
    const el = $('#loadingOverlay');
    if (!el) return;
    el.style.display = 'flex';
    el.style.opacity = flag ? '1' : '0';
    if (!flag) setTimeout(()=>{ el.style.display='none'; }, 400);
  }

  function toast(msg, type='info'){
    // Buat toast sederhana
    const toastEl = document.createElement('div');
    toastEl.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    toastEl.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toastEl.innerHTML = `
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toastEl);
    
    // Auto remove setelah 5 detik
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.remove();
      }
    }, 5000);
  }

  function fmtRp(n){
    const x = Number(n||0);
    return x.toLocaleString('id-ID');
  }

  function normNoHp(v){
    let s = String(v||'').trim();
    if (!s) return '';
    // always to 08xxxxxxxx
    if (s.startsWith('+62')) s = '0' + s.slice(3);
    else if (s.startsWith('62')) s = '0' + s.slice(2);
    return s;
  }

  function setSessionBadge(state){
    const badge = $('#sessionBadge');
    if (!badge) return;
    const map = {
      unknown: ['bg-secondary', 'Unknown'],
      loggedin: ['bg-success', 'Logged In'],
      loggedout: ['bg-warning text-dark', 'Need Login']
    };
    const [cls, txt] = map[state] || map.unknown;
    badge.className = `badge rounded-pill ${cls}`;
    badge.textContent = txt;
  }

  function setTrackerStatus(stateText){
    const b = $('#trkStatusBadge');
    if (!b) return;
    const text = String(stateText||'').toUpperCase();
    let cls = 'bg-secondary';
    if (text === 'PAID') cls = 'bg-success';
    else if (text === 'PENDING' || text === 'INVOICE') cls = 'bg-warning text-dark';
    else if (text === 'FAILED' || text === 'EXPIRED') cls = 'bg-danger';
    b.className = `badge rounded-pill ${cls}`;
    b.textContent = text || 'UNKNOWN';
  }

  function qrUrl(data){
    // public QR generator
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}`;
  }

  function persistMsisdn(no){
    localStorage.setItem('fdz.msisdn', no || '');
  }
  function getPersistMsisdn(){
    return localStorage.getItem('fdz.msisdn') || '';
  }

  // ------ DOM refs ------
  const inputNoHp = $('#inputNoHp');
  const btnCheckSession = $('#btnCheckSession');
  const btnSendOTP = $('#btnSendOTP');
  const btnLogout = $('#btnLogout');
  const otpRow = $('#otpRow');
  const inputAuthId = $('#inputAuthId'); // hidden (auto)
  const inputKodeOtp = $('#inputKodeOtp');
  const btnVerifyOtp = $('#btnVerifyOtp');
  const otpHelp = $('#otpInfoHelp');

  const btnRefreshCatalog = $('#btnRefreshCatalog');
  const catalogGrid = $('#catalogGrid');

  const btnCekPaketAktif = $('#btnCekPaketAktif');
  const detailWrap = $('#detailWrap');
  const detailMsisdn = $('#detailMsisdn');
  const detailList = $('#detailList');
  const btnHideDetail = $('#btnHideDetail');

  const orderTracker = $('#orderTracker');
  const trkOrderId = $('#trkOrderId');
  const trkNoHp = $('#trkNoHp');
  const trkStatusBadge = $('#trkStatusBadge');
  const trkOpenPayment = $('#trkOpenPayment');
  const trkPollNow = $('#trkPollNow');
  const trkUpstreamBox = $('#trkUpstreamBox');
  const trkUpstreamMsg = $('#trkUpstreamMsg');
  const trkDeepLinkWrap = $('#trkDeepLinkWrap');
  const trkDeepLink = $('#trkDeepLink');
  const trkDeepLinkRaw = $('#trkDeepLinkRaw');
  const trkQrisWrap = $('#trkQrisWrap');
  const trkQrisImg = $('#trkQrisImg');
  const trkQrisRaw = $('#trkQrisRaw');
  const trkRemain = $('#trkRemain');
  const trkExpire = $('#trkExpire');
  const trkLog = $('#trkLog');
  const btnHideTracker = $('#btnHideTracker');

  // ------ API calls ------
  async function apiGET(path, params={}){
    const u = new URL(API_BASE + path);
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null) u.searchParams.set(k, v); });
    const r = await fetch(u.toString(), { method:'GET', headers:{ 'Accept':'application/json' } });
    return await r.json();
  }
  
  async function apiPOST(path, body){
    const r = await fetch(API_BASE + path, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(body || {})
    });
    return await r.json();
  }

  async function checkSession(nohp){
    const res = await apiGET('/kuota/session', { no_hp: nohp });
    return !!res?.loggedIn;
  }

  async function sendOtp(nohp){
    return await apiPOST('/kuota/otp/request', { no_hp: nohp });
  }
  
  // VERIFIKASI OTP: cukup no_hp + kode_otp (auth_id di-handle server)
  async function verifyOtp(nohp, kode){
    return await apiPOST('/kuota/otp/verify', { no_hp: nohp, kode_otp:kode });
  }

  async function loadCatalog(){
    const res = await apiGET('/data/kuota/list');
    return Array.isArray(res?.data) ? res.data : [];
  }

  async function cekDetail(nohp){
    return await apiGET('/kuota/detail', { no_hp: nohp });
  }

  // Duitku flow (invoice di server kamu)
  async function createInvoice(nohp, paket_id){
    return await apiPOST('/kuota/pay/create', { no_hp: nohp, paket_id });
  }

  async function payStatus(orderId, nohp){
    return await apiGET('/kuota/pay/status', { orderId, no_hp: nohp });
  }

  // ------ Render Katalog ------
  function renderCatalog(list){
    catalogGrid.innerHTML = '';
    if (!list.length){
      catalogGrid.innerHTML = `<div class="col-12"><div class="alert alert-info">Belum ada paket.</div></div>`;
      return;
    }
    list.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      const payColor = item.payment_method === 'DANA' ? 'bg-success'
                     : item.payment_method === 'QRIS' ? 'bg-dark'
                     : 'bg-warning text-dark';
      col.innerHTML = `
        <div class="ok-pkg-card h-100 d-flex flex-column">
          <div class="ok-pkg-head">
            <div class="d-flex align-items-start justify-content-between">
              <div class="me-2">
                <div class="fw-bold">${escapeHtml(item.package_named_show)}</div>
                <div class="small text-muted">Paket ID: <span class="text-monospace">${escapeHtml(item.paket_id)}</span></div>
              </div>
              <span class="badge ${payColor} ok-pay-badge">${escapeHtml(item.payment_method)}</span>
            </div>
          </div>
          <div class="ok-pkg-body d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="ok-pkg-price">Rp ${fmtRp(item.price_paket_show)}</div>
            </div>
            <div class="ok-desc flex-grow-1">${escapeHtml(item.desc_package_show)}</div>
            <div class="d-grid mt-3">
              <button class="btn btn-primary btn-beli" data-paket="${encodeURIComponent(item.paket_id)}">
                <i class="bi bi-cart-plus me-1"></i>Beli Paket Ini
              </button>
            </div>
          </div>
        </div>
      `;
      catalogGrid.appendChild(col);
    });

    // attach handlers
    $$('.btn-beli').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const paket_id = decodeURIComponent(e.currentTarget.getAttribute('data-paket') || '');
        const msisdn = normNoHp(inputNoHp.value);
        if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
          toast('Isi nomor XL valid (format 08xxxxx) dulu ya', 'warning');
          inputNoHp.focus();
          return;
        }
        showOverlay(true);
        try {
          const logged = await checkSession(msisdn);
          if (!logged){
            showOverlay(false);
            toast('Nomor belum login OTP. Kirim & verifikasi OTP dahulu!', 'warning');
            otpRow.style.display = '';
            return;
          }
          const inv = await createInvoice(msisdn, paket_id);
          if (!inv?.ok){
            toast(inv?.message || 'Gagal membuat invoice', 'error');
            return;
          }
          openTracker(inv?.orderId, msisdn, inv?.paymentUrl || '');
          toast('Invoice berhasil dibuat! Silakan lanjutkan pembayaran.', 'success');
        } catch(err){
          console.error(err);
          toast('Terjadi kesalahan saat membuat invoice', 'error');
        } finally {
          showOverlay(false);
        }
      });
    });
  }

  // ------ Detail Paket Aktif ------
  function renderDetail(data, msisdn) {
    detailMsisdn.textContent = msisdn;
    const d = data?.data || {};
    const list = Array.isArray(d?.quotas) ? d.quotas : [];
    
    if (!list.length) {
      detailList.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          Tidak ada paket aktif yang terdeteksi saat ini.
          ${d?.text ? `<div class="mt-2 small">${escapeHtml(d.text)}</div>` : ''}
        </div>
      `;
      return;
    }
    
    const html = list.map((q, index) => {
      const benefits = Array.isArray(q.benefits) ? q.benefits : [];
      const rows = benefits.map(b => {
        const remaining = b.remaining_quota || b.quota || '-';
        const isUsed = remaining === '0 GB' || remaining === '0' ? 'bg-secondary' : 'bg-primary';
        
        return `
          <div class="col-md-6 col-lg-4">
            <div class="ok-quota-item mb-2">
              <div class="d-flex align-items-center justify-content-between">
                <div class="ok-quota-title small">${escapeHtml(b.name || '-')}</div>
                <span class="badge ${isUsed}">${escapeHtml(remaining)}</span>
              </div>
              ${b.information ? `<div class="small text-muted mt-1">${escapeHtml(b.information)}</div>`:''}
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="mb-3 p-3 border rounded bg-light">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-bold text-primary">${escapeHtml(q.name || `Paket ${index + 1}`)}</div>
            <span class="badge bg-success">
              <i class="bi bi-clock me-1"></i>${escapeHtml(q.expired_at || '-')}
            </span>
          </div>
          <div class="row g-2">${rows || '<div class="col-12"><div class="small text-muted">Tidak ada benefit detail</div></div>'}</div>
        </div>
      `;
    }).join('');
    
    detailList.innerHTML = html;
  }

  // ------ Tracker (payment + upstream forward) ------
  let pollTimer = null;

  function openTracker(orderId, msisdn, paymentUrl){
    trkOrderId.textContent = orderId || '-';
    trkNoHp.textContent = msisdn || '-';
    trkOpenPayment.href = paymentUrl || '#';
    setTrackerStatus('INVOICE');
    trkUpstreamBox.style.display = 'none';
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';
    trkLog.textContent = '';
    orderTracker.style.display = 'block';

    // Scroll ke tracker
    orderTracker.scrollIntoView({ behavior: 'smooth' });

    // Buka tab pembayaran (kalau ada)
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener');
    }

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => doPoll(orderId, msisdn), 4000);
    
    // Poll pertama langsung
    setTimeout(() => doPoll(orderId, msisdn), 1000);
  }

  async function doPoll(orderId, msisdn){
    try{
      const res = await payStatus(orderId, msisdn);
      if (!res?.ok) return;
      
      const d = res.data || {};
      setTrackerStatus(d.status || 'UNKNOWN');

      // Update log
      const now = new Date().toLocaleTimeString();
      trkLog.innerHTML = `<div><small>${now}</small> - Status: <strong>${d.status || 'UNKNOWN'}</strong></div>`;

      // Jika upstreamResult tersedia, tampilkan dan hentikan polling
      if (d.upstreamResult) {
        if (pollTimer) { 
          clearInterval(pollTimer); 
          pollTimer = null; 
        }
        fillUpstreamBox(d.upstreamResult, orderId);
        
        if (d.upstreamResult.ok) {
          toast('Pembayaran berhasil! Order sedang diproses...', 'success');
        } else {
          toast('Pembayaran berhasil tapi proses forward gagal: ' + (d.upstreamResult.message || 'Unknown error'), 'warning');
        }
      }
      
      // Jika status PAID tapi belum ada upstream result, tunggu
      if (d.status === 'PAID' && !d.upstreamResult) {
        trkLog.innerHTML += `<div><small>${now}</small> - Menunggu proses forward ke upstream...</div>`;
      }
      
    }catch(e){
      console.warn('Poll error:', e);
      const now = new Date().toLocaleTimeString();
      trkLog.innerHTML += `<div><small>${now}</small> - Error: ${e.message}</div>`;
    }
  }

  function fillUpstreamBox(up, orderId) {
    trkUpstreamBox.style.display = 'block';
    
    if (!up.ok) {
      trkUpstreamMsg.className = 'alert alert-danger';
      trkUpstreamMsg.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Gagal forward ke upstream:</strong> ${up.message || 'Unknown error'}
        <div class="mt-2">
          <button class="btn btn-warning btn-sm" id="btnRetryForward">
            <i class="bi bi-arrow-clockwise me-1"></i>Coba Ulang
          </button>
        </div>
      `;
      
      // Attach retry handler
      setTimeout(() => {
        $('#btnRetryForward')?.addEventListener('click', async () => {
          showOverlay(true);
          try {
            const result = await apiPOST('/kuota/retry', { orderId });
            if (result.ok) {
              toast('Retry berhasil! Silakan tunggu...', 'success');
              // Restart polling
              if (pollTimer) clearInterval(pollTimer);
              pollTimer = setInterval(() => doPoll(orderId, trkNoHp.textContent), 4000);
              setTimeout(() => doPoll(orderId, trkNoHp.textContent), 1000);
            } else {
              toast('Retry gagal: ' + (result.message || 'Unknown error'), 'error');
            }
          } catch (e) {
            toast('Error: ' + e.message, 'error');
          } finally {
            showOverlay(false);
          }
        });
      }, 100);
      
      return;
    }
    
    trkUpstreamMsg.className = 'alert alert-success';
    trkUpstreamMsg.innerHTML = `
      <i class="bi bi-check-circle me-2"></i>
      <strong>Berhasil!</strong> ${up?.message || 'Order berhasil diproses'}
    `;

    const data = up?.data || {};
    const deeplink = data?.deeplink || '';
    const isQris = !!data?.is_qris;

    // reset
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';

    if (deeplink) {
      trkDeepLinkWrap.style.display = 'block';
      trkDeepLink.href = deeplink;
      trkDeepLinkRaw.value = deeplink;
      
      // Auto copy deeplink to clipboard
      setTimeout(() => {
        navigator.clipboard.writeText(deeplink).then(() => {
          toast('Deeplink berhasil disalin ke clipboard!', 'info');
        }).catch(() => {
          // Ignore clipboard errors
        });
      }, 1000);
    }
    
    if (isQris && data?.qris?.qr_code) {
      trkQrisWrap.style.display = 'block';
      const code = data.qris.qr_code;
      trkQrisImg.src = qrUrl(code);
      trkQrisRaw.value = code;
      trkRemain.textContent = data.qris.remaining_time ?? '-';
      
      // Format expiry time
      const expiry = data.qris.payment_expired_at;
      if (expiry) {
        const expiryDate = new Date(expiry * 1000);
        trkExpire.textContent = expiryDate.toLocaleString('id-ID');
      } else {
        trkExpire.textContent = '-';
      }
      
      // Auto copy QRIS code to clipboard
      setTimeout(() => {
        navigator.clipboard.writeText(code).then(() => {
          toast('Kode QRIS berhasil disalin ke clipboard!', 'info');
        }).catch(() => {
          // Ignore clipboard errors
        });
      }, 1000);
    }
    
    // Scroll ke hasil upstream
    setTimeout(() => {
      trkUpstreamBox.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }

  // ------ Events ------
  btnCheckSession?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      toast('Nomor salah. Gunakan format 08xxxxx', 'warning');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const logged = await checkSession(msisdn);
      persistMsisdn(msisdn);
      setSessionBadge(logged ? 'loggedin' : 'loggedout');
      otpRow.style.display = logged ? 'none' : '';
      
      if (logged) {
        toast('Nomor sudah login, siap untuk order!', 'success');
      } else {
        toast('Nomor belum login, silakan verifikasi OTP', 'info');
      }
    } catch(e) {
      toast('Error cek session: ' + e.message, 'error');
    } finally{
      showOverlay(false);
    }
  });

  btnSendOTP?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      toast('Nomor salah. Gunakan format 08xxxxx', 'warning');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const r = await sendOtp(msisdn);
      if (!r?.ok){
        toast(r?.message || 'Gagal mengirim OTP', 'error');
        return;
      }
      // auth_id otomatis (disimpan di server), FE cukup keep jika mau
      inputAuthId.value = r?.data?.auth_id || '';
      otpRow.style.display = 'block';
      otpHelp.textContent = r?.message || 'OTP terkirim. Cek SMS lalu isi kodenya.';
      otpHelp.className = 'small text-success mt-2';
      persistMsisdn(msisdn);
      setSessionBadge('loggedout');
      
      // Focus ke input OTP
      setTimeout(() => {
        inputKodeOtp.focus();
      }, 100);
      
      toast('OTP berhasil dikirim! Cek SMS Anda.', 'success');
    } catch(e) {
      toast('Error kirim OTP: ' + e.message, 'error');
    } finally{
      showOverlay(false);
    }
  });

  btnVerifyOtp?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    const kode = (inputKodeOtp.value||'').trim();
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
      toast('Nomor tidak valid', 'warning');
      return;
    }
    if (!/^\d{4,8}$/.test(kode)) {
      toast('Kode OTP harus 4-8 digit angka', 'warning');
      inputKodeOtp.focus();
      return;
    }

    showOverlay(true);
    try{
      // tidak perlu kirim auth_id
      const r = await verifyOtp(msisdn, kode);
      if (!r?.ok){
        toast(r?.message || 'Verifikasi gagal', 'error');
        return;
      }
      setSessionBadge('loggedin');
      otpRow.style.display = 'none';
      inputKodeOtp.value = '';
      otpHelp.textContent = 'Login OTP berhasil!';
      otpHelp.className = 'small text-success mt-2';
      
      toast('Login OTP berhasil! Sekarang bisa order paket.', 'success');
    } catch(e) {
      toast('Error verifikasi OTP: ' + e.message, 'error');
    } finally{
      showOverlay(false);
    }
  });

  // Handle Enter key di input OTP
  inputKodeOtp?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnVerifyOtp.click();
    }
  });

  btnLogout?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn) {
      toast('Isi nomor dulu ya', 'warning');
      return;
    }
    showOverlay(true);
    try{
      await apiPOST('/kuota/logout', { no_hp: msisdn });
      setSessionBadge('loggedout');
      otpRow.style.display = 'none';
      inputKodeOtp.value = '';
      inputAuthId.value = '';
      otpHelp.textContent = 'Logout berhasil. Silakan login lagi jika ingin order.';
      otpHelp.className = 'small text-info mt-2';
      
      toast('Logout berhasil!', 'info');
    } catch(e) {
      toast('Error logout: ' + e.message, 'error');
    } finally{
      showOverlay(false);
    }
  });

  btnRefreshCatalog?.addEventListener('click', async () => {
    await bootstrapCatalog();
    toast('Katalog diperbarui!', 'info');
  });

  btnCekPaketAktif?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value || getPersistMsisdn());
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      toast('Isi nomor valid dulu ya', 'warning');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const r = await cekDetail(msisdn);
      if (!r?.ok){
        if (r?.need_login) {
          toast('Nomor belum login OTP', 'warning');
        } else {
          toast(r?.message || 'Gagal cek detail paket', 'error');
        }
        return;
      }
      renderDetail(r, msisdn);
      detailWrap.style.display = 'block';
      
      // Scroll ke detail
      setTimeout(() => {
        detailWrap.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      toast('Detail paket berhasil dimuat!', 'success');
    } catch(e) {
      toast('Error cek detail: ' + e.message, 'error');
    } finally{
      showOverlay(false);
    }
  });

  btnHideDetail?.addEventListener('click', () => {
    detailWrap.style.display = 'none';
    toast('Detail paket ditutup', 'info');
  });
  
  btnHideTracker?.addEventListener('click', () => {
    orderTracker.style.display = 'none';
    if (pollTimer) { 
      clearInterval(pollTimer); 
      pollTimer = null; 
    }
    toast('Tracker ditutup', 'info');
  });

  trkPollNow?.addEventListener('click', async () => {
    const id = trkOrderId.textContent || '';
    const ms = trkNoHp.textContent || '';
    if (!id) {
      toast('Tidak ada order aktif', 'warning');
      return;
    }
    showOverlay(true);
    try {
      await doPoll(id, ms);
      toast('Status diperbarui!', 'info');
    } catch(e) {
      toast('Error refresh status: ' + e.message, 'error');
    } finally {
      showOverlay(false);
    }
  });

  // Handle Enter key di input nomor HP
  inputNoHp?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnCheckSession.click();
    }
  });

  // ------ bootstrap ------
  function escapeHtml(s){
    return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  async function bootstrapCatalog(){
    showOverlay(true);
    try{
      const list = await loadCatalog();
      renderCatalog(list);
    }catch(e){
      console.error(e);
      catalogGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Gagal memuat katalog: ${e.message}
          </div>
        </div>
      `;
      toast('Gagal memuat katalog', 'error');
    }finally{
      showOverlay(false);
    }
  }

  async function bootstrapSession(){
    const saved = getPersistMsisdn();
    if (saved){
      inputNoHp.value = saved;
      try{
        const logged = await checkSession(saved);
        setSessionBadge(logged ? 'loggedin' : 'loggedout');
        otpRow.style.display = logged ? 'none' : '';
      }catch(e){
        setSessionBadge('unknown');
        console.log('Session check error:', e);
      }
    }else{
      setSessionBadge('unknown');
    }
  }

  // Auto-check session ketika nomor diubah
  inputNoHp?.addEventListener('blur', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (msisdn && /^0\d{9,14}$/.test(msisdn)) {
      try {
        const logged = await checkSession(msisdn);
        setSessionBadge(logged ? 'loggedin' : 'loggedout');
        otpRow.style.display = logged ? 'none' : '';
        persistMsisdn(msisdn);
      } catch (e) {
        // Silent fail untuk auto-check
      }
    }
  });

  // init
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapSession();
    bootstrapCatalog();
    
    // Focus ke input nomor HP
    setTimeout(() => {
      inputNoHp?.focus();
    }, 500);
  });
})();
