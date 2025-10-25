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
  const catalogCount = $('#catalogCount');

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
  async function apiGET(path, params = {}) {
    try {
      const u = new URL(API_BASE + path);
      Object.entries(params).forEach(([k, v]) => { 
        if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); 
      });
      
      console.log(`🔵 GET ${u.toString()}`);
      const r = await fetch(u.toString(), { 
        method: 'GET', 
        headers: { 'Accept': 'application/json' } 
      });
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      
      const data = await r.json();
      console.log('📥 Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API GET Error:', error);
      throw error;
    }
  }
  
  async function apiPOST(path, body) {
    try {
      console.log(`🟡 POST ${API_BASE + path}`, body);
      const r = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body || {})
      });
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      
      const data = await r.json();
      console.log('📥 Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API POST Error:', error);
      throw error;
    }
  }

  async function checkSession(nohp) {
    try {
      const res = await apiGET('/kuota/session', { no_hp: nohp });
      return !!res?.loggedIn;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
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
    catalogGrid.innerHTML = '';
    
    if (!list.length) {
      catalogGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Belum ada paket kuota yang tersedia.
          </div>
        </div>
      `;
      catalogCount.textContent = '0';
      return;
    }

    catalogCount.textContent = list.length.toString();
    
    list.forEach(item => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      
      const payColor = item.payment_method === 'DANA' ? 'bg-success'
                     : item.payment_method === 'QRIS' ? 'bg-dark'
                     : item.payment_method === 'PULSA' ? 'bg-warning text-dark'
                     : 'bg-secondary';
      
      col.innerHTML = `
        <div class="ok-pkg-card h-100 d-flex flex-column">
          <div class="ok-pkg-head">
            <div class="d-flex align-items-start justify-content-between">
              <div class="me-2">
                <div class="fw-bold text-primary">${escapeHtml(item.package_named_show)}</div>
                <div class="small text-muted mt-1">
                  <i class="bi bi-tag me-1"></i>${escapeHtml(item.payment_method)}
                </div>
              </div>
              <span class="badge ${payColor}">${escapeHtml(item.payment_method)}</span>
            </div>
          </div>
          <div class="ok-pkg-body d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="ok-pkg-price h5 text-success mb-0">Rp ${fmtRp(item.price_paket_show)}</div>
            </div>
            <div class="ok-desc flex-grow-1 small text-muted">
              ${escapeHtml(item.desc_package_show || 'Paket kuota XL')}
            </div>
            <div class="d-grid mt-3">
              <button class="btn btn-primary btn-beli" data-paket="${escapeHtml(item.paket_id)}">
                <i class="bi bi-cart-plus me-1"></i>Beli Paket Ini
              </button>
            </div>
          </div>
        </div>
      `;
      catalogGrid.appendChild(col);
    });

    // Attach event handlers untuk tombol beli
    $$('.btn-beli').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const paket_id = e.currentTarget.getAttribute('data-paket');
        const msisdn = normNoHp(inputNoHp.value);
        
        if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
          toast('Isi nomor XL valid (format 08xxxxx) dulu ya', 'warning');
          inputNoHp.focus();
          return;
        }

        showOverlay(true);
        try {
          // Cek session dulu
          const logged = await checkSession(msisdn);
          if (!logged) {
            showOverlay(false);
            toast('Nomor belum login OTP. Kirim & verifikasi OTP dahulu!', 'warning');
            otpRow.style.display = '';
            return;
          }

          // Buat invoice
          const inv = await createInvoice(msisdn, paket_id);
          if (!inv?.ok) {
            toast(inv?.message || 'Gagal membuat invoice', 'error');
            return;
          }

          // Buka tracker
          openTracker(inv.orderId, msisdn, inv.paymentUrl);
          toast('Invoice berhasil dibuat! Silakan lanjutkan pembayaran.', 'success');
          
        } catch (err) {
          console.error('Beli error:', err);
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
        const isUsed = (remaining === '0 GB' || remaining === '0' || remaining === '0.00 GB') ? 'bg-secondary' : 'bg-success';
        
        return `
          <div class="col-md-6 col-lg-4">
            <div class="ok-quota-item mb-2">
              <div class="d-flex align-items-center justify-content-between">
                <div class="ok-quota-title small">${escapeHtml(b.name || '-')}</div>
                <span class="badge ${isUsed}">${escapeHtml(remaining)}</span>
              </div>
              ${b.information ? `<div class="small text-muted mt-1">${escapeHtml(b.information)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="mb-3 p-3 border rounded bg-light">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-bold text-primary">${escapeHtml(q.name || `Paket ${index + 1}`)}</div>
            <span class="badge bg-dark">
              <i class="bi bi-clock me-1"></i>${escapeHtml(q.expired_at || '-')}
            </span>
          </div>
          <div class="row g-2">
            ${rows || '<div class="col-12"><div class="small text-muted">Tidak ada benefit detail</div></div>'}
          </div>
        </div>
      `;
    }).join('');
    
    detailList.innerHTML = html;
  }

  // ------ Tracker (payment + upstream forward) ------
  let pollTimer = null;
  let qrisCountdown = null;

  function openTracker(orderId, msisdn, paymentUrl) {
    // Reset state
    trkOrderId.textContent = orderId || '-';
    trkNoHp.textContent = msisdn || '-';
    trkOpenPayment.href = paymentUrl || '#';
    setTrackerStatus('PENDING');
    trkUpstreamBox.style.display = 'none';
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';
    trkLog.innerHTML = '<div class="text-center"><i class="bi bi-clock-history me-1"></i>Menunggu update status...</div>';
    orderTracker.style.display = 'block';

    // Clear previous timers
    if (pollTimer) clearInterval(pollTimer);
    if (qrisCountdown) clearInterval(qrisCountdown);

    // Start polling
    pollTimer = setInterval(() => doPoll(orderId), 4000);
    
    // Poll pertama langsung
    setTimeout(() => doPoll(orderId), 1000);

    // Scroll ke tracker
    setTimeout(() => {
      orderTracker.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

    // Buka tab pembayaran (kalau ada)
    if (paymentUrl && paymentUrl !== '#') {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function doPoll(orderId) {
    try {
      const res = await payStatus(orderId);
      if (!res?.ok) return;
      
      const d = res.data || {};
      const status = d.status || 'UNKNOWN';
      setTrackerStatus(status);

      // Update log
      const now = new Date().toLocaleTimeString();
      let logHtml = `<div><small>${now}</small> - Status: <strong>${status}</strong></div>`;

      // Jika ada upstreamResult, proses hasilnya
      if (d.upstreamResult) {
        logHtml += `<div><small>${now}</small> - Forward: <strong>${d.upstreamResult.ok ? 'SUCCESS' : 'FAILED'}</strong></div>`;
        
        if (d.upstreamResult.ok) {
          // Berhasil forward ke upstream
          if (pollTimer) { 
            clearInterval(pollTimer); 
            pollTimer = null; 
          }
          fillUpstreamBox(d.upstreamResult);
          toast('Pembayaran berhasil! Order sedang diproses...', 'success');
        } else {
          // Gagal forward
          if (pollTimer) { 
            clearInterval(pollTimer); 
            pollTimer = null; 
          }
          fillUpstreamBox(d.upstreamResult);
          toast('Pembayaran berhasil tapi proses forward gagal', 'warning');
        }
      } else if (status === 'PAID') {
        // Status PAID tapi belum ada upstream result
        logHtml += `<div><small>${now}</small> - Menunggu proses forward ke upstream...</div>`;
      }
      
      trkLog.innerHTML = logHtml;
      
    } catch (e) {
      console.warn('Poll error:', e);
      const now = new Date().toLocaleTimeString();
      trkLog.innerHTML += `<div><small>${now}</small> - Error: ${e.message}</div>`;
    }
  }

  function fillUpstreamBox(up) {
    trkUpstreamBox.style.display = 'block';
    
    if (!up.ok) {
      // Tampilkan error
      trkUpstreamMsg.className = 'alert alert-danger mb-3';
      trkUpstreamMsg.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Gagal forward ke upstream:</strong> ${up.message || 'Unknown error'}
      `;
      
      trkDeepLinkWrap.style.display = 'none';
      trkQrisWrap.style.display = 'none';
      return;
    }
    
    // Success case
    trkUpstreamMsg.className = 'alert alert-success mb-3';
    trkUpstreamMsg.innerHTML = `
      <i class="bi bi-check-circle me-2"></i>
      <strong>Berhasil!</strong> ${up.message || 'Order berhasil diproses'}
    `;

    const data = up.data || {};
    
    // Reset display
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';

    // Handle Deeplink (DANA)
    if (data.have_deeplink && data.deeplink) {
      trkDeepLinkWrap.style.display = 'block';
      trkDeepLink.href = data.deeplink;
      trkDeepLinkRaw.value = data.deeplink;
      
      // Auto copy deeplink
      setTimeout(() => {
        navigator.clipboard?.writeText(data.deeplink).then(() => {
          toast('Deeplink berhasil disalin ke clipboard!', 'info');
        }).catch(() => {
          // Ignore clipboard errors
        });
      }, 1000);
    }
    
    // Handle QRIS
    if (data.is_qris && data.qris?.qr_code) {
      trkQrisWrap.style.display = 'block';
      const qrData = data.qris;
      
      // Set QR Code image
      trkQrisImg.src = qrUrl(qrData.qr_code);
      trkQrisRaw.value = qrData.qr_code;
      
      // Handle countdown timer
      if (qrData.remaining_time > 0) {
        startQrisCountdown(qrData.remaining_time);
      }
      
      // Format expiry time
      if (qrData.payment_expired_at) {
        const expiryDate = new Date(qrData.payment_expired_at * 1000);
        trkExpire.textContent = expiryDate.toLocaleString('id-ID');
      } else {
        trkExpire.textContent = '-';
      }
      
      // Auto copy QRIS code
      setTimeout(() => {
        navigator.clipboard?.writeText(qrData.qr_code).then(() => {
          toast('Kode QRIS berhasil disalin ke clipboard!', 'info');
        }).catch(() => {
          // Ignore clipboard errors
        });
      }, 1000);
    }
    
    // Scroll ke hasil upstream
    setTimeout(() => {
      trkUpstreamBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  }

  function startQrisCountdown(initialSeconds) {
    let seconds = initialSeconds;
    
    if (qrisCountdown) clearInterval(qrisCountdown);
    
    function updateCountdown() {
      trkRemain.textContent = seconds;
      
      if (seconds <= 0) {
        clearInterval(qrisCountdown);
        trkRemain.textContent = 'EXPIRED';
        trkRemain.className = 'text-danger fw-bold';
      }
      
      seconds--;
    }
    
    // Update immediately
    updateCountdown();
    
    // Update every second
    qrisCountdown = setInterval(updateCountdown, 1000);
  }

  // ------ Event Handlers ------
  btnCheckSession?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
      toast('Nomor salah. Gunakan format 08xxxxx', 'warning');
      inputNoHp.focus();
      return;
    }
    
    showOverlay(true);
    try {
      const logged = await checkSession(msisdn);
      persistMsisdn(msisdn);
      setSessionBadge(logged ? 'loggedin' : 'loggedout');
      otpRow.style.display = logged ? 'none' : '';
      
      if (logged) {
        toast('Nomor sudah login, siap untuk order!', 'success');
      } else {
        toast('Nomor belum login, silakan verifikasi OTP', 'info');
      }
    } catch (e) {
      toast('Error cek session: ' + e.message, 'error');
    } finally {
      showOverlay(false);
    }
  });

  btnSendOTP?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
      toast('Nomor salah. Gunakan format 08xxxxx', 'warning');
      inputNoHp.focus();
      return;
    }
    
    showOverlay(true);
    try {
      const r = await sendOtp(msisdn);
      if (!r?.ok) {
        toast(r?.message || 'Gagal mengirim OTP', 'error');
        return;
      }
      
      // auth_id otomatis (disimpan di server)
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
    } catch (e) {
      toast('Error kirim OTP: ' + e.message, 'error');
    } finally {
      showOverlay(false);
    }
  });

  btnVerifyOtp?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    const kode = (inputKodeOtp.value || '').trim();
    
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
    try {
      const r = await verifyOtp(msisdn, kode);
      if (!r?.ok) {
        toast(r?.message || 'Verifikasi gagal', 'error');
        return;
      }
      
      setSessionBadge('loggedin');
      otpRow.style.display = 'none';
      inputKodeOtp.value = '';
      otpHelp.textContent = 'Login OTP berhasil!';
      otpHelp.className = 'small text-success mt-2';
      
      toast('Login OTP berhasil! Sekarang bisa order paket.', 'success');
    } catch (e) {
      toast('Error verifikasi OTP: ' + e.message, 'error');
    } finally {
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
    try {
      await apiPOST('/kuota/logout', { no_hp: msisdn });
      setSessionBadge('loggedout');
      otpRow.style.display = 'none';
      inputKodeOtp.value = '';
      inputAuthId.value = '';
      otpHelp.textContent = 'Logout berhasil. Silakan login lagi jika ingin order.';
      otpHelp.className = 'small text-info mt-2';
      
      toast('Logout berhasil!', 'info');
    } catch (e) {
      toast('Error logout: ' + e.message, 'error');
    } finally {
      showOverlay(false);
    }
  });

  btnRefreshCatalog?.addEventListener('click', async () => {
    await bootstrapCatalog();
    toast('Katalog diperbarui!', 'info');
  });

  btnCekPaketAktif?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value || getPersistMsisdn());
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) {
      toast('Isi nomor valid dulu ya', 'warning');
      inputNoHp.focus();
      return;
    }
    
    showOverlay(true);
    try {
      const r = await cekDetail(msisdn);
      if (!r?.ok) {
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
        detailWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      toast('Detail paket berhasil dimuat!', 'success');
    } catch (e) {
      toast('Error cek detail: ' + e.message, 'error');
    } finally {
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
    if (qrisCountdown) {
      clearInterval(qrisCountdown);
      qrisCountdown = null;
    }
    toast('Tracker ditutup', 'info');
  });

  trkPollNow?.addEventListener('click', async () => {
    const id = trkOrderId.textContent || '';
    if (!id) {
      toast('Tidak ada order aktif', 'warning');
      return;
    }
    
    showOverlay(true);
    try {
      await doPoll(id);
      toast('Status diperbarui!', 'info');
    } catch (e) {
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

  // ------ Utility Functions ------
  function escapeHtml(s) {
    return String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  // ------ Bootstrap Functions ------
  async function bootstrapCatalog() {
    showOverlay(true);
    try {
      const list = await loadCatalog();
      renderCatalog(list);
    } catch (e) {
      console.error('Bootstrap catalog error:', e);
      catalogGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Gagal memuat katalog: ${e.message}
          </div>
        </div>
      `;
      catalogCount.textContent = '0';
      toast('Gagal memuat katalog', 'error');
    } finally {
      showOverlay(false);
    }
  }

  async function bootstrapSession() {
    const saved = getPersistMsisdn();
    if (saved) {
      inputNoHp.value = saved;
      try {
        const logged = await checkSession(saved);
        setSessionBadge(logged ? 'loggedin' : 'loggedout');
        otpRow.style.display = logged ? 'none' : '';
      } catch (e) {
        setSessionBadge('unknown');
        console.log('Session check error:', e);
      }
    } else {
      setSessionBadge('unknown');
    }
  }

  // ------ Initialize Application ------
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Order Kuota App...');
    
    // Initialize session and catalog
    bootstrapSession();
    bootstrapCatalog();
    
    // Focus ke input nomor HP
    setTimeout(() => {
      inputNoHp?.focus();
    }, 500);
  });
})();
