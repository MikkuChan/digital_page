(() => {
  const API_BASE = 'https://call.fadzdigital.store';

  // ------ Helpers ------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let currentFilter = 'all';
  let otpCountdownTimer = null;

  function showOverlay(flag){
    const el = $('#loadingOverlay');
    if (!el) return;
    el.style.display = 'flex';
    el.style.opacity = flag ? '1' : '0';
    if (!flag) setTimeout(()=>{ el.style.display='none'; }, 400);
  }

  function showToast(message, type = 'info') {
    const toastContainer = $('#toastContainer');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'bg-success' : 
                   type === 'error' ? 'bg-danger' : 
                   type === 'warning' ? 'bg-warning' : 'bg-info';
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${bgColor} text-white`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="toast-body">
        <div class="d-flex align-items-center">
          <i class="bi ${type === 'success' ? 'bi-check-circle' : 
                       type === 'error' ? 'bi-exclamation-circle' : 
                       type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'} 
            me-2"></i>
          <div class="flex-grow-1">${escapeHtml(message)}</div>
          <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    bsToast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  function fmtRp(n){
    const x = Number(n||0);
    return x.toLocaleString('id-ID');
  }

  function normNoHp(v){
    let s = String(v||'').trim();
    if (!s) return '';
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
      loggedout: ['bg-warning text-dark', 'Need Login'],
      checking: ['bg-info', 'Checking...']
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
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}`;
  }

  function persistMsisdn(no){
    localStorage.setItem('fdz.msisdn', no || '');
  }
  
  function getPersistMsisdn(){
    return localStorage.getItem('fdz.msisdn') || '';
  }

  function startOtpCountdown(seconds = 60) {
    const countdownEl = $('#otpCountdown');
    if (!countdownEl) return;
    
    let timeLeft = seconds;
    
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    
    const updateCountdown = () => {
      if (timeLeft <= 0) {
        countdownEl.textContent = 'OTP expired';
        countdownEl.className = 'small text-danger';
        clearInterval(otpCountdownTimer);
        return;
      }
      
      countdownEl.textContent = `Dapat mengirim ulang dalam ${timeLeft}s`;
      countdownEl.className = 'small text-warning';
      timeLeft--;
    };
    
    updateCountdown();
    otpCountdownTimer = setInterval(updateCountdown, 1000);
  }

  // ------ API calls ------
  async function apiGET(path, params = {}) {
    const u = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => { 
      if (v !== undefined && v !== null) u.searchParams.set(k, v); 
    });
    
    const r = await fetch(u.toString(), { 
      method: 'GET', 
      headers: { 'Accept': 'application/json' } 
    });
    
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    
    return await r.json();
  }

  async function apiPOST(path, body) {
    const r = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
    });
    
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    
    return await r.json();
  }

  async function checkSession(nohp) {
    try {
      const res = await apiGET('/kuota/session', { no_hp: nohp });
      return !!res?.loggedIn;
    } catch (error) {
      console.error('Session check error:', error);
      throw error;
    }
  }

  async function sendOtp(nohp) {
    return await apiPOST('/kuota/otp/request', { no_hp: nohp });
  }

  async function verifyOtp(nohp, kode) {
    return await apiPOST('/kuota/otp/verify', { no_hp: nohp, kode_otp: kode });
  }

  async function loadCatalog() {
    const res = await apiGET('/data/kuota/list');
    return Array.isArray(res?.data) ? res.data : [];
  }

  async function cekDetail(nohp) {
    return await apiGET('/kuota/detail', { no_hp: nohp });
  }

  async function createInvoice(nohp, paket_id) {
    return await apiPOST('/kuota/pay/create', { no_hp: nohp, paket_id });
  }

  async function payStatus(orderId) {
    return await apiGET('/kuota/pay/status', { orderId });
  }

  // ------ Render Katalog ------
  function renderCatalog(list) {
    const catalogGrid = $('#catalogGrid');
    const catalogLoading = $('#catalogLoading');
    
    if (!catalogGrid) return;
    
    // Hide loading
    if (catalogLoading) catalogLoading.style.display = 'none';
    
    catalogGrid.innerHTML = '';
    
    if (!list.length) {
      catalogGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-info text-center">
            <i class="bi bi-info-circle me-2"></i>Belum ada paket yang tersedia.
          </div>
        </div>
      `;
      return;
    }

    // Filter packages based on current filter
    const filteredList = currentFilter === 'all' 
      ? list 
      : list.filter(item => item.payment_method === currentFilter);

    if (!filteredList.length) {
      catalogGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning text-center">
            <i class="bi bi-filter me-2"></i>Tidak ada paket dengan metode pembayaran ${currentFilter}.
          </div>
        </div>
      `;
      return;
    }

    filteredList.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      
      const payColor = item.payment_method === 'DANA' ? 'bg-success' :
                     item.payment_method === 'QRIS' ? 'bg-dark' :
                     'bg-warning text-dark';
                     
      const payIcon = item.payment_method === 'DANA' ? 'bi-wallet2' :
                    item.payment_method === 'QRIS' ? 'bi-qr-code' :
                    'bi-phone';
      
      col.innerHTML = `
        <div class="ok-pkg-card h-100 d-flex flex-column">
          <div class="ok-pkg-head">
            <div class="d-flex align-items-start justify-content-between">
              <div class="me-2">
                <div class="fw-bold text-truncate" title="${escapeHtml(item.package_named_show)}">
                  ${escapeHtml(item.package_named_show)}
                </div>
                <div class="small text-muted">Paket ID: <span class="font-monospace">${escapeHtml(item.paket_id)}</span></div>
              </div>
              <span class="badge ${payColor} ok-pay-badge d-flex align-items-center">
                <i class="bi ${payIcon} me-1"></i>${escapeHtml(item.payment_method)}
              </span>
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

    // Attach event handlers to buy buttons
    $$('.btn-beli').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const paket_id = decodeURIComponent(e.currentTarget.getAttribute('data-paket') || '');
        const msisdn = normNoHp(inputNoHp.value);
        
        if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
          showToast('Isi nomor XL valid (format 08xxxxx) dulu ya', 'warning');
          inputNoHp.focus();
          return;
        }
        
        showOverlay(true);
        try {
          const logged = await checkSession(msisdn);
          if (!logged) {
            showOverlay(false);
            showToast('Nomor belum login OTP. Kirim & verifikasi OTP dahulu!', 'warning');
            otpRow.style.display = '';
            return;
          }
          
          const inv = await createInvoice(msisdn, paket_id);
          if (!inv?.ok) {
            showToast(inv?.message || 'Gagal membuat invoice', 'error');
            return;
          }
          
          openTracker(inv?.orderId, msisdn, inv?.paymentUrl || '');
          showToast('Invoice berhasil dibuat! Silakan lanjutkan pembayaran.', 'success');
          
        } catch (err) {
          console.error('Create invoice error:', err);
          showToast('Terjadi kesalahan saat membuat invoice', 'error');
        } finally {
          showOverlay(false);
        }
      });
    });
  }

  // ------ Detail Paket Aktif ------
  function renderDetail(data, msisdn) {
    const detailMsisdn = $('#detailMsisdn');
    const detailList = $('#detailList');
    
    if (!detailMsisdn || !detailList) return;
    
    detailMsisdn.textContent = msisdn;
    const d = data?.data || {};
    const list = Array.isArray(d?.quotas) ? d.quotas : [];
    
    if (!list.length) {
      detailList.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>Tidak ada paket aktif yang terdeteksi saat ini.
        </div>
      `;
      return;
    }
    
    const html = list.map((q, index) => {
      const benefits = Array.isArray(q.benefits) ? q.benefits : [];
      const rows = benefits.map(b => `
        <div class="col-md-6">
          <div class="ok-quota-item mb-2">
            <div class="d-flex align-items-center justify-content-between">
              <div class="ok-quota-title">${escapeHtml(b.name || '-')}</div>
              <span class="badge bg-primary">${escapeHtml(b.remaining_quota || b.quota || '-')}</span>
            </div>
            ${b.information ? `<div class="small text-muted mt-1">${escapeHtml(b.information)}</div>` : ''}
          </div>
        </div>
      `).join('');
      
      return `
        <div class="mb-3 p-3 border rounded">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-bold">${escapeHtml(q.name || `Paket ${index + 1}`)}</div>
            <span class="badge bg-success">Expired: ${escapeHtml(q.expired_at || '-')}</span>
          </div>
          <div class="row mt-2 g-2">${rows || '<div class="col-12"><div class="small text-muted">Tidak ada benefit terdeteksi</div></div>'}</div>
        </div>
      `;
    }).join('');
    
    detailList.innerHTML = html;
  }

  // ------ Tracker (payment + upstream forward) ------
  let pollTimer = null;

  function openTracker(orderId, msisdn, paymentUrl) {
    const orderTracker = $('#orderTracker');
    const detailWrap = $('#detailWrap');
    
    if (detailWrap) detailWrap.style.display = 'none';
    if (orderTracker) orderTracker.style.display = '';
    
    trkOrderId.textContent = orderId || '-';
    trkNoHp.textContent = msisdn || '-';
    trkOpenPayment.href = paymentUrl || '#';
    setTrackerStatus('INVOICE');
    trkUpstreamBox.style.display = 'none';
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';
    trkLog.textContent = '';

    // Scroll to tracker
    orderTracker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Buka tab pembayaran (kalau ada)
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener');
    }

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => doPoll(orderId), 4000);
    
    // Initial poll
    doPoll(orderId);
  }

  async function doPoll(orderId) {
    try {
      const res = await payStatus(orderId);
      if (!res?.ok) return;
      
      const d = res.data || {};
      setTrackerStatus(d.status || 'UNKNOWN');

      // Update log
      const now = new Date().toLocaleTimeString();
      trkLog.textContent = `[${now}] status=${d.status}`;

      // Jika upstreamResult tersedia, tampilkan dan hentikan polling
      if (d.upstreamResult) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        fillUpstreamBox(d.upstreamResult);
        
        if (d.upstreamResult.ok) {
          showToast('Pembayaran berhasil! Order sedang diproses upstream.', 'success');
        } else {
          showToast(`Pembayaran berhasil tapi gagal diproses: ${d.upstreamResult.message}`, 'warning');
        }
      }
      
      // Jika status FAILED/EXPIRED, stop polling
      if (['FAILED', 'EXPIRED'].includes(d.status)) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        showToast(`Pembayaran ${d.status.toLowerCase()}`, 'error');
      }
      
    } catch (e) {
      console.warn('Poll error:', e);
      trkLog.textContent += ` [ERROR: ${e.message}]`;
    }
  }

  function fillUpstreamBox(up) {
    trkUpstreamBox.style.display = '';
    trkUpstreamMsg.textContent = up?.message || 'OK';

    const data = up?.data || {};
    const deeplink = data?.deeplink || '';
    const isQris = !!data?.is_qris;

    // Reset displays
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';

    if (deeplink) {
      trkDeepLinkWrap.style.display = '';
      trkDeepLink.href = deeplink;
      trkDeepLinkRaw.value = deeplink;
    }
    
    if (isQris && data?.qris?.qr_code) {
      trkQrisWrap.style.display = '';
      const code = data.qris.qr_code;
      trkQrisImg.src = qrUrl(code);
      trkQrisRaw.value = code;
      trkRemain.textContent = data.qris.remaining_time ?? '-';
      trkExpire.textContent = data.qris.payment_expired_at ?? '-';
    }
  }

  // ------ Event Handlers ------
  function attachEventHandlers() {
    // Check Session
    btnCheckSession?.addEventListener('click', async () => {
      const msisdn = normNoHp(inputNoHp.value);
      if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
        showToast('Nomor salah. Gunakan format 08xxxxx', 'warning');
        inputNoHp.focus();
        return;
      }
      
      showOverlay(true);
      setSessionBadge('checking');
      
      try {
        const logged = await checkSession(msisdn);
        persistMsisdn(msisdn);
        setSessionBadge(logged ? 'loggedin' : 'loggedout');
        otpRow.style.display = logged ? 'none' : '';
        
        if (logged) {
          showToast('Session aktif ditemukan!', 'success');
        } else {
          showToast('Session tidak ditemukan, silakan login OTP', 'info');
        }
      } catch (error) {
        console.error('Session check error:', error);
        setSessionBadge('unknown');
        showToast('Gagal memeriksa session', 'error');
      } finally {
        showOverlay(false);
      }
    });

    // Send OTP
    btnSendOTP?.addEventListener('click', async () => {
      const msisdn = normNoHp(inputNoHp.value);
      if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
        showToast('Nomor salah. Gunakan format 08xxxxx', 'warning');
        inputNoHp.focus();
        return;
      }
      
      showOverlay(true);
      try {
        const r = await sendOtp(msisdn);
        if (!r?.ok) {
          showToast(r?.message || 'Gagal mengirim OTP', 'error');
          return;
        }
        
        // Start countdown
        startOtpCountdown(r?.data?.can_resend_in || 60);
        
        otpRow.style.display = '';
        showToast('OTP berhasil dikirim! Cek SMS Anda.', 'success');
        persistMsisdn(msisdn);
        setSessionBadge('loggedout');
        
        // Auto focus OTP input
        setTimeout(() => {
          const otpInput = $('#inputKodeOtp');
          if (otpInput) otpInput.focus();
        }, 500);
        
      } catch (error) {
        console.error('Send OTP error:', error);
        showToast('Gagal mengirim OTP', 'error');
      } finally {
        showOverlay(false);
      }
    });

    // Verify OTP
    btnVerifyOtp?.addEventListener('click', async () => {
      const msisdn = normNoHp(inputNoHp.value);
      const kode = (inputKodeOtp.value || '').trim();
      
      if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
        showToast('Nomor tidak valid', 'warning');
        return;
      }
      
      if (!/^\d{4,8}$/.test(kode)) {
        showToast('Kode OTP tidak valid (4-8 digit)', 'warning');
        inputKodeOtp.focus();
        return;
      }

      showOverlay(true);
      try {
        const r = await verifyOtp(msisdn, kode);
        if (!r?.ok) {
          showToast(r?.message || 'Verifikasi gagal', 'error');
          return;
        }
        
        setSessionBadge('loggedin');
        otpRow.style.display = 'none';
        inputKodeOtp.value = '';
        
        if (otpCountdownTimer) {
          clearInterval(otpCountdownTimer);
          otpCountdownTimer = null;
        }
        
        const countdownEl = $('#otpCountdown');
        if (countdownEl) {
          countdownEl.textContent = '';
          countdownEl.className = 'small text-muted';
        }
        
        showToast('Login OTP berhasil!', 'success');
        
      } catch (error) {
        console.error('Verify OTP error:', error);
        showToast('Gagal verifikasi OTP', 'error');
      } finally {
        showOverlay(false);
      }
    });

    // Logout
    btnLogout?.addEventListener('click', async () => {
      const msisdn = normNoHp(inputNoHp.value);
      if (!msisdn) {
        showToast('Isi nomor terlebih dahulu', 'warning');
        return;
      }
      
      showOverlay(true);
      try {
        await apiPOST('/kuota/logout', { no_hp: msisdn });
        setSessionBadge('loggedout');
        otpRow.style.display = '';
        inputKodeOtp.value = '';
        inputAuthId.value = '';
        showToast('Logout berhasil', 'success');
      } catch (error) {
        console.error('Logout error:', error);
        showToast('Gagal logout', 'error');
      } finally {
        showOverlay(false);
      }
    });

    // Refresh Catalog
    btnRefreshCatalog?.addEventListener('click', async () => {
      await bootstrapCatalog();
    });

    // Check Active Packages
    btnCekPaketAktif?.addEventListener('click', async () => {
      const msisdn = normNoHp(inputNoHp.value || getPersistMsisdn());
      if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
        showToast('Isi nomor valid dulu ya', 'warning');
        inputNoHp.focus();
        return;
      }
      
      showOverlay(true);
      try {
        const logged = await checkSession(msisdn);
        if (!logged) {
          showToast('Nomor belum login OTP', 'warning');
          showOverlay(false);
          return;
        }
        
        const r = await cekDetail(msisdn);
        if (!r?.ok) {
          if (r?.need_login) {
            showToast('Nomor belum login OTP', 'warning');
          } else {
            showToast(r?.message || 'Gagal cek detail', 'error');
          }
          return;
        }
        
        renderDetail(r, msisdn);
        detailWrap.style.display = '';
        showToast('Detail paket berhasil dimuat', 'success');
        
      } catch (error) {
        console.error('Check package error:', error);
        showToast('Gagal memuat detail paket', 'error');
      } finally {
        showOverlay(false);
      }
    });

    // Filter buttons
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.getAttribute('data-filter');
        
        // Update active state
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        currentFilter = filter;
        bootstrapCatalog(); // Re-render with new filter
      });
    });

    // Hide Detail
    btnHideDetail?.addEventListener('click', () => {
      detailWrap.style.display = 'none';
    });

    // Hide Tracker
    btnHideTracker?.addEventListener('click', () => {
      orderTracker.style.display = 'none';
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    });

    // Manual Poll
    trkPollNow?.addEventListener('click', async () => {
      const id = trkOrderId.textContent || '';
      if (!id) return;
      
      showOverlay(true);
      try {
        await doPoll(id);
      } finally {
        showOverlay(false);
      }
    });

    // Enter key in OTP field
    inputKodeOtp?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnVerifyOtp.click();
      }
    });

    // Enter key in phone field
    inputNoHp?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnCheckSession.click();
      }
    });
  }

  // ------ Utilities ------
  function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
  }

  // ------ Bootstrap Functions ------
  async function bootstrapCatalog() {
    const catalogGrid = $('#catalogGrid');
    const catalogLoading = $('#catalogLoading');
    
    if (catalogGrid) catalogGrid.innerHTML = '';
    if (catalogLoading) catalogLoading.style.display = '';
    
    try {
      const list = await loadCatalog();
      renderCatalog(list);
    } catch (e) {
      console.error('Catalog load error:', e);
      if (catalogGrid) {
        catalogGrid.innerHTML = `
          <div class="col-12">
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>Gagal memuat katalog. Silakan refresh halaman.
            </div>
          </div>
        `;
      }
      showToast('Gagal memuat katalog', 'error');
    } finally {
      if (catalogLoading) catalogLoading.style.display = 'none';
    }
  }

  async function bootstrapSession() {
    const saved = getPersistMsisdn();
    if (saved) {
      inputNoHp.value = saved;
      try {
        setSessionBadge('checking');
        const logged = await checkSession(saved);
        setSessionBadge(logged ? 'loggedin' : 'loggedout');
        otpRow.style.display = logged ? 'none' : '';
      } catch (error) {
        console.error('Initial session check error:', error);
        setSessionBadge('unknown');
      }
    } else {
      setSessionBadge('unknown');
    }
  }

  // ------ Initialize ------
  function init() {
    attachEventHandlers();
    bootstrapSession();
    bootstrapCatalog();
    
    // Show welcome message
    setTimeout(() => {
      showToast('Selamat datang! Silakan masukkan nomor XL Anda untuk mulai berbelanja.', 'info');
    }, 1000);
  }

  // Start the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
