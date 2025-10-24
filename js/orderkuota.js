(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const apiBase = (window.FDZ_BACKEND_BASE || '').replace(/\/+$/,'') || 'https://call.fadzdigital.store';

  const toast = $('#toast');
  function showToast(msg, type='ok', ms=2500){
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(()=>toast.classList.add('hidden'), ms);
  }

  function toUpstreamNo(input){
    let s = String(input||'').trim();
    if (!s) return '';
    if (s.startsWith('+62')) s = '0' + s.slice(3);
    else if (s.startsWith('62')) s = '0' + s.slice(2);
    return s;
  }

  function saveMsisdn(msisdn){
    localStorage.setItem('fdz_msisdn', msisdn);
  }
  function getMsisdn(){
    return localStorage.getItem('fdz_msisdn') || '';
  }
  function clearMsisdn(){
    localStorage.removeItem('fdz_msisdn');
  }

  async function api(path, {method='GET', json=null}={}){
    const url = `${apiBase}${path}`;
    const opt = { method, headers:{} };
    if (json){
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(json);
    }
    const r = await fetch(url, opt);
    const t = await r.text().catch(()=> '');
    let j = {};
    try{ j = JSON.parse(t); }catch{ j = { raw:t }; }
    if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
    return j;
  }

  // Elements
  const yearEl = $('#year');
  const secLogin = $('#sec-login');
  const inpNo = $('#inp-nohp');
  const btnOtpReq = $('#btn-otp-request');
  const otpArea = $('#otp-area');
  const inpOtp = $('#inp-otp');
  const btnOtpVerify = $('#btn-otp-verify');
  const otpHint = $('#otp-hint');
  const sessionBar = $('#session-bar');
  const sessMsisdn = $('#sess-msisdn');
  const btnLogout = $('#btn-logout');
  const btnCheckDetail = $('#btn-check-detail');

  const secDetail = $('#sec-detail');
  const btnRefreshDetail = $('#btn-refresh-detail');
  const detailContent = $('#detail-content');

  const secKatalog = $('#sec-katalog');
  const katalogGrid = $('#katalog-grid');
  const inpSearch = $('#inp-search');
  const btnReloadKatalog = $('#btn-reload-katalog');

  const modalOrder = $('#modal-order');
  const moTitle = $('#mo-title');
  const moDesc = $('#mo-desc');
  const moNo = $('#mo-nohp');
  const moSubmit = $('#mo-submit');

  const modalPay = $('#modal-pay');
  const mpTitle = $('#mp-title');
  const mpSummary = $('#mp-summary');
  const mpDeeplinkBox = $('#mp-deeplink');
  const mpDeeplinkBtn = $('#mp-deeplink-btn');
  const mpQrisBox = $('#mp-qris');
  const mpQrisText = $('#mp-qris-text');
  const mpCopy = $('#mp-copy');
  const mpSave = $('#mp-save');
  const mpCountdown = $('#mp-countdown');

  const helpBtn = $('#btn-open-help');
  const modalHelp = $('#modal-help');

  // State
  let lastAuthId = null; // dari /kuota/otp/request
  let katalog = [];
  let currentOrder = null;
  let qrisTimer = null;

  function setLoading(el, on=true){
    if (!el) return;
    if (on){
      el.setAttribute('disabled','disabled');
      el.dataset._txt = el.textContent;
      el.textContent = 'Memproses...';
    } else {
      el.removeAttribute('disabled');
      if (el.dataset._txt) el.textContent = el.dataset._txt;
    }
  }

  function formatRupiah(x){
    const n = Number(x||0);
    return n.toLocaleString('id-ID');
  }

  function renderDetail(data){
    const d = data?.data;
    const quotas = d?.quotas || [];
    if (!quotas.length){
      detailContent.innerHTML = `<div class="muted">Belum ada paket aktif terdeteksi.</div>`;
      return;
    }
    const items = quotas.map(q => {
      const ben = (q.benefits || []).map(b => `
        <div class="quota-row">
          <span>${b.name}${b.information ? ` (${b.information})` : ''}</span>
          <span>${b.remaining_quota ?? b.quota}</span>
        </div>
      `).join('');
      return `
        <div class="quota-item">
          <div class="quota-name">${q.name}</div>
          <div class="muted small">Masa aktif: ${q.expired_at || '-'}</div>
          <div class="quota-benefit">${ben}</div>
        </div>
      `;
    }).join('');
    detailContent.innerHTML = items;
  }

  function renderKatalog(list){
    const keyword = (inpSearch.value || '').toLowerCase();
    const filtered = list.filter(x =>
      x.package_named_show.toLowerCase().includes(keyword) ||
      x.payment_method.toLowerCase().includes(keyword)
    );
    if (!filtered.length){
      katalogGrid.innerHTML = `<div class="muted">Tidak ada paket.</div>`;
      return;
    }
    katalogGrid.innerHTML = filtered.map(x => `
      <div class="kartu" data-id="${x.paket_id}">
        <h3>${x.package_named_show}</h3>
        <div class="meta">
          <span class="tag">${x.payment_method}</span>
        </div>
        <div class="price">Rp ${formatRupiah(x.price_paket_show)}</div>
        <pre class="muted small" style="white-space:pre-wrap">${x.desc_package_show || '-'}</pre>
        <div class="actions">
          <button class="btn btn-primary btn-order" data-id="${x.paket_id}">Order</button>
        </div>
      </div>
    `).join('');
    $$('.btn-order').forEach(btn => btn.addEventListener('click', openOrderModal));
  }

  async function loadKatalog(){
    try{
      const res = await api('/data/kuota/list', { method:'GET' });
      katalog = res?.data || [];
      renderKatalog(katalog);
      secKatalog.hidden = false;
    }catch(e){
      showToast(e.message || 'Gagal memuat katalog', 'err');
    }
  }

  function openOrderModal(ev){
    const id = ev.currentTarget?.dataset?.id;
    const item = katalog.find(x => x.paket_id === id);
    if (!item) return;
    currentOrder = item;
    moTitle.textContent = `Order: ${item.package_named_show}`;
    moDesc.textContent = `Metode: ${item.payment_method} • Harga: Rp ${formatRupiah(item.price_paket_show)}`;
    const last = getMsisdn();
    moNo.value = last || inpNo.value || '';
    modalOrder.showModal();
  }

  // Payment modal helpers
  function clearCountdown(){
    if (qrisTimer){
      clearInterval(qrisTimer);
      qrisTimer = null;
    }
    mpCountdown.textContent = '';
  }

  function startCountdown(remainSec){
    clearCountdown();
    let s = Number(remainSec||0);
    if (!(s>0)) return;
    const tick = () => {
      if (s<=0){ clearCountdown(); mpCountdown.textContent = 'QRIS kadaluarsa.'; return; }
      const m = Math.floor(s/60);
      const r = s%60;
      mpCountdown.textContent = `Sisa waktu pembayaran: ${m}m ${r}s`;
      s -= 1;
    };
    tick();
    qrisTimer = setInterval(tick, 1000);
  }

  function downloadText(filename, content){
    const blob = new Blob([content], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }

  // Session state UI
  async function checkSessionUI(){
    const msisdn = getMsisdn();
    if (!msisdn){
      sessionBar.classList.add('hidden');
      secDetail.hidden = true;
      return;
    }
    try{
      const res = await api(`/kuota/session?no_hp=${encodeURIComponent(msisdn)}`);
      if (res?.loggedIn){
        sessionBar.classList.remove('hidden');
        sessMsisdn.textContent = msisdn;
        secDetail.hidden = false;
      } else {
        sessionBar.classList.add('hidden');
        secDetail.hidden = true;
      }
    }catch{
      sessionBar.classList.add('hidden');
      secDetail.hidden = true;
    }
  }

  // Events
  btnOtpReq.addEventListener('click', async () => {
    const msisdn = toUpstreamNo(inpNo.value);
    if (!/^08\d{8,12}$/.test(msisdn)){
      showToast('Nomor tidak valid. Gunakan format 08xxxxxxxxxx.', 'err'); return;
    }
    setLoading(btnOtpReq, true);
    try{
      const res = await api('/kuota/otp/request', { method:'POST', json:{ no_hp: msisdn } });
      lastAuthId = res?.data?.auth_id || null;
      otpArea.classList.remove('hidden');
      otpHint.textContent = res?.data?.can_resend_in ? `Bisa kirim ulang OTP dalam ${res.data.can_resend_in}s` : '';
      saveMsisdn(msisdn);
      showToast(res?.message || 'OTP terkirim', 'ok');
    }catch(e){
      showToast(e.message || 'Gagal mengirim OTP', 'err');
    }finally{
      setLoading(btnOtpReq, false);
    }
  });

  btnOtpVerify.addEventListener('click', async () => {
    const msisdn = toUpstreamNo(inpNo.value || getMsisdn());
    const otp = (inpOtp.value || '').trim();
    if (!lastAuthId){
      showToast('auth_id tidak ditemukan. Klik Kirim OTP lagi.', 'err'); return;
    }
    if (!otp){
      showToast('Masukkan kode OTP.', 'err'); return;
    }
    setLoading(btnOtpVerify, true);
    try{
      const res = await api('/kuota/otp/verify', { method:'POST', json:{ no_hp: msisdn, auth_id: lastAuthId, kode_otp: otp } });
      showToast(res?.message || 'Login berhasil', 'ok');
      otpArea.classList.add('hidden');
      inpOtp.value = '';
      await checkSessionUI();
      await loadKatalog();
    }catch(e){
      showToast(e.message || 'Verifikasi gagal', 'err');
    }finally{
      setLoading(btnOtpVerify, false);
    }
  });

  btnCheckDetail.addEventListener('click', async () => {
    const msisdn = getMsisdn();
    if (!msisdn) { showToast('Nomor belum diset.', 'err'); return; }
    btnCheckDetail.setAttribute('disabled','disabled');
    try{
      const res = await api(`/kuota/detail?no_hp=${encodeURIComponent(msisdn)}`);
      renderDetail(res);
      showToast('Paket aktif diperbarui', 'ok');
    }catch(e){
      showToast(e.message || 'Gagal memuat paket aktif', 'err');
    }finally{
      btnCheckDetail.removeAttribute('disabled');
    }
  });

  btnRefreshDetail.addEventListener('click', () => btnCheckDetail.click());

  btnReloadKatalog.addEventListener('click', loadKatalog);
  inpSearch.addEventListener('input', () => renderKatalog(katalog));

  // Modal Order handlers
  modalOrder.addEventListener('close', ()=> { /* reset if needed */ });
  moSubmit.addEventListener('click', async (ev) => {
    ev.preventDefault();
    if (!currentOrder) { modalOrder.close(); return; }
    const msisdn = toUpstreamNo(moNo.value || getMsisdn());
    if (!/^08\d{8,12}$/.test(msisdn)){
      showToast('Nomor tidak valid. Gunakan format 08xxxxxxxxxx.', 'err'); return;
    }
    setLoading(moSubmit, true);
    try{
      // Pastikan sudah login
      const sess = await api(`/kuota/session?no_hp=${encodeURIComponent(msisdn)}`);
      if (!sess?.loggedIn){
        showToast('Nomor belum login OTP. Silakan login dulu.', 'err');
        setLoading(moSubmit, false);
        return;
      }
      // Submit order
      const res = await api('/kuota/order', { method:'POST', json:{ paket_id: currentOrder.paket_id, no_hp: msisdn }});
      modalOrder.close();

      // Render result
      const data = res?.data || {};
      mpTitle.textContent = `Pembayaran: ${data?.nama_paket || currentOrder.package_named_show}`;
      mpSummary.innerHTML = `
        <div><b>Nomor:</b> ${data.msisdn || msisdn}</div>
        <div><b>Metode:</b> ${data.payment_method || currentOrder.payment_method}</div>
        <div><b>Trx ID:</b> ${data.trx_id || '-'}</div>
        <div><b>Status:</b> ${data.status || '-'}</div>
      `;

      // Reset views
      mpDeeplinkBox.classList.add('hidden');
      mpQrisBox.classList.add('hidden');
      clearCountdown();

      if ((data.payment_method || '').toUpperCase() === 'DANA' && data.deeplink){
        mpDeeplinkBtn.href = data.deeplink;
        mpDeeplinkBox.classList.remove('hidden');
      } else if ((data.payment_method || '').toUpperCase() === 'QRIS' && data.is_qris){
        const q = data?.qris || {};
        mpQrisText.value = q.qr_code || '';
        mpQrisBox.classList.remove('hidden');
        if (q.remaining_time) startCountdown(q.remaining_time);
      } else {
        // PULSA / lainnya
        showToast('Order dibuat. Ikuti instruksi di aplikasi/layanan terkait.', 'ok', 3500);
      }

      modalPay.showModal();
    }catch(e){
      showToast(e.message || 'Order gagal', 'err');
    }finally{
      setLoading(moSubmit, false);
    }
  });

  // Payment modal actions
  mpCopy.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(mpQrisText.value || '');
      showToast('Payload QRIS disalin', 'ok');
    }catch{
      showToast('Gagal menyalin', 'err');
    }
  });
  mpSave.addEventListener('click', () => {
    const payload = mpQrisText.value || '';
    if (!payload){ showToast('Tidak ada payload', 'err'); return; }
    downloadText(`qris-${Date.now()}.txt`, payload);
  });

  // Logout
  btnLogout.addEventListener('click', async ()=>{
    const msisdn = getMsisdn();
    if (!msisdn){ clearMsisdn(); await checkSessionUI(); return; }
    try{
      await api('/kuota/logout', { method:'POST', json:{ no_hp: msisdn }});
    }catch{}
    clearMsisdn();
    sessionBar.classList.add('hidden');
    secDetail.hidden = true;
    showToast('Keluar dari sesi', 'ok');
  });

  // Help
  helpBtn.addEventListener('click', (e)=>{ e.preventDefault(); modalHelp.showModal(); });

  // Init
  yearEl.textContent = new Date().getFullYear();

  // Prefill msisdn
  const last = getMsisdn();
  if (last) inpNo.value = last;

  // Boot: cek sesi & katalog
  (async () => {
    await checkSessionUI();
    await loadKatalog();
    if (!secDetail.hidden) btnCheckDetail.click();
  })();
})();
