/* Order Kuota FE
   - Ambil katalog dari /data/kuota/list
   - OTP request/verify & session check
   - Create invoice via /kuota/pay/create
   - Poll status di /kuota/pay/status sampai upstreamResult ada
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
    // simple lightweight toast using alert() replacement
    console.log(`[${type}]`, msg);
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
      loggedout: ['bg-warning', 'Need Login']
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
    // use public QR generator
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
  const inputAuthId = $('#inputAuthId');
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
    const r = await fetch(u.toString(), { method:'GET', headers:{ 'Accept':'application/json' }, credentials:'omit' });
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
  async function verifyOtp(nohp, auth_id, kode){
    return await apiPOST('/kuota/otp/verify', { no_hp: nohp, auth_id, kode_otp:kode });
  }

  async function loadCatalog(){
    const res = await apiGET('/data/kuota/list');
    return Array.isArray(res?.data) ? res.data : [];
  }

  async function cekDetail(nohp){
    return await apiGET('/kuota/detail', { no_hp: nohp });
  }

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
      col.className = 'col-md-6';
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
          alert('Isi nomor XL valid (format 08xxxxx) dulu ya');
          inputNoHp.focus();
          return;
        }
        showOverlay(true);
        try {
          const logged = await checkSession(msisdn);
          if (!logged){
            showOverlay(false);
            alert('Nomor belum login OTP. Kirim & verifikasi OTP dahulu!');
            otpRow.style.display = '';
            return;
          }
          const inv = await createInvoice(msisdn, paket_id);
          if (!inv?.ok){
            alert(inv?.message || 'Gagal membuat invoice');
            return;
          }
          openTracker(inv?.orderId, msisdn, inv?.paymentUrl || '');
        } catch(err){
          console.error(err);
          alert('Terjadi kesalahan');
        } finally {
          showOverlay(false);
        }
      });
    });
  }

  // ------ Detail Paket Aktif ------
  function renderDetail(data, msisdn){
    detailMsisdn.textContent = msisdn;
    const d = data?.data || {};
    const list = Array.isArray(d?.quotas) ? d.quotas : [];
    if (!list.length){
      detailList.innerHTML = `<div class="alert alert-info">Tidak ada paket aktif yang terdeteksi saat ini.</div>`;
      return;
    }
    const html = list.map(q => {
      const benefits = Array.isArray(q.benefits) ? q.benefits : [];
      const rows = benefits.map(b => `
        <div class="col-md-6">
          <div class="ok-quota-item mb-2">
            <div class="d-flex align-items-center justify-content-between">
              <div class="ok-quota-title">${escapeHtml(b.name || '-')}</div>
              <span class="badge bg-primary">${escapeHtml(b.remaining_quota || b.quota || '-')}</span>
            </div>
            ${b.information ? `<div class="small text-muted mt-1">${escapeHtml(b.information)}</div>`:''}
          </div>
        </div>
      `).join('');
      return `
        <div class="mb-3 p-3 border rounded">
          <div class="d-flex align-items-center justify-content-between">
            <div class="fw-bold">${escapeHtml(q.name || '-')}</div>
            <span class="badge bg-success">Expired: ${escapeHtml(q.expired_at || '-')}</span>
          </div>
          <div class="row mt-2 g-2">${rows || '<div class="small text-muted">-</div>'}</div>
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
    orderTracker.style.display = '';

    // Buka tab pembayaran (kalau ada)
    if (paymentUrl) window.open(paymentUrl, '_blank', 'noopener');

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => doPoll(orderId, msisdn), 4000);
  }

  async function doPoll(orderId, msisdn){
    try{
      const res = await payStatus(orderId, msisdn);
      if (!res?.ok) return;
      const d = res.data || {};
      setTrackerStatus(d.status || 'UNKNOWN');

      // Log ringkes
      trkLog.textContent = `[${new Date().toLocaleTimeString()}] status=${d.status}`;

      // Jika upstreamResult tersedia, tampilkan dan hentikan polling
      if (d.upstreamResult && d.upstreamResult.ok){
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        fillUpstreamBox(d.upstreamResult);
      }
    }catch(e){
      console.warn('poll err', e);
    }
  }

  function fillUpstreamBox(up){
    trkUpstreamBox.style.display = '';
    trkUpstreamMsg.textContent = up?.message || 'OK';

    const data = up?.data || {};
    const deeplink = data?.deeplink || '';
    const isQris = !!data?.is_qris;

    // reset
    trkDeepLinkWrap.style.display = 'none';
    trkQrisWrap.style.display = 'none';

    if (deeplink){
      trkDeepLinkWrap.style.display = '';
      trkDeepLink.href = deeplink;
      trkDeepLinkRaw.value = deeplink;
    }
    if (isQris && data?.qris?.qr_code){
      trkQrisWrap.style.display = '';
      const code = data.qris.qr_code;
      trkQrisImg.src = qrUrl(code);
      trkQrisRaw.value = code;
      trkRemain.textContent = data.qris.remaining_time ?? '-';
      trkExpire.textContent = data.qris.payment_expired_at ?? '-';
    }
  }

  // ------ Events ------
  btnCheckSession?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      alert('Nomor salah. Gunakan format 08xxxxx');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const logged = await checkSession(msisdn);
      persistMsisdn(msisdn);
      setSessionBadge(logged ? 'loggedin' : 'loggedout');
      if (!logged) otpRow.style.display = '';
      else otpRow.style.display = 'none';
    }finally{
      showOverlay(false);
    }
  });

  btnSendOTP?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      alert('Nomor salah. Gunakan format 08xxxxx');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const r = await sendOtp(msisdn);
      if (!r?.ok){
        alert(r?.message || 'Gagal mengirim OTP');
        return;
      }
      otpRow.style.display = '';
      inputAuthId.value = r?.data?.auth_id || '';
      otpHelp.textContent = r?.message || '';
      persistMsisdn(msisdn);
    }finally{
      showOverlay(false);
    }
  });

  btnVerifyOtp?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    const auth_id = (inputAuthId.value||'').trim();
    const kode = (inputKodeOtp.value||'').trim();
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)) return alert('Nomor tidak valid');
    if (!auth_id) return alert('Auth ID kosong, kirim OTP dulu');
    if (!/^\d{4,8}$/.test(kode)) return alert('Kode OTP tidak valid');

    showOverlay(true);
    try{
      const r = await verifyOtp(msisdn, auth_id, kode);
      if (!r?.ok){
        alert(r?.message || 'Verifikasi gagal');
        return;
      }
      setSessionBadge('loggedin');
      otpRow.style.display = 'none';
      toast('Login OTP berhasil', 'success');
    }finally{
      showOverlay(false);
    }
  });

  btnLogout?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value);
    if (!msisdn) return;
    showOverlay(true);
    try{
      await apiPOST('/kuota/logout', { no_hp: msisdn });
      setSessionBadge('loggedout');
      otpRow.style.display = '';
      inputAuthId.value = '';
      inputKodeOtp.value = '';
    }finally{
      showOverlay(false);
    }
  });

  btnRefreshCatalog?.addEventListener('click', async () => {
    await bootstrapCatalog();
  });

  btnCekPaketAktif?.addEventListener('click', async () => {
    const msisdn = normNoHp(inputNoHp.value || getPersistMsisdn());
    if (!msisdn || !/^0\d{9,14}$/.test(msisdn)){
      alert('Isi nomor valid dulu ya');
      inputNoHp.focus();
      return;
    }
    showOverlay(true);
    try{
      const r = await cekDetail(msisdn);
      if (!r?.ok){
        if (r?.need_login) alert('Nomor belum login OTP');
        else alert(r?.message || 'Gagal cek detail');
        return;
      }
      renderDetail(r, msisdn);
      detailWrap.style.display = '';
    }finally{
      showOverlay(false);
    }
  });

  btnHideDetail?.addEventListener('click', () => {
    detailWrap.style.display = 'none';
  });
  btnHideTracker?.addEventListener('click', () => {
    orderTracker.style.display = 'none';
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  });

  trkPollNow?.addEventListener('click', async () => {
    const id = trkOrderId.textContent || '';
    const ms = trkNoHp.textContent || '';
    await doPoll(id, ms);
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
      catalogGrid.innerHTML = `<div class="col-12"><div class="alert alert-danger">Gagal memuat katalog.</div></div>`;
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
      }catch{
        setSessionBadge('unknown');
      }
    }else{
      setSessionBadge('unknown');
    }
  }

  // init
  bootstrapSession();
  bootstrapCatalog();
})();
