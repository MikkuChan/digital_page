(() => {
  const BASE = window.FDZ_BACKEND_BASE || 'https://call.fadzdigital.store';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (x) => new Intl.NumberFormat('id-ID').format(x);

  const els = {
    year: $('#year'),
    otp: {
      form: $('#otpForm'),
      nohp: $('#no_hp'),
      auth: $('#auth_id'),
      code: $('#kode_otp'),
      btnReq: $('#btnReqOtp'),
      btnVerify: $('#btnVerifyOtp'),
      status: $('#otpStatus'),
      badge: $('#sessionBadge')
    },
    catalog: {
      grid: $('#catalogGrid'),
      empty: $('#catalogEmpty')
    },
    pay: {
      section: $('#statusSection'),
      nohp: $('#status_no_hp'),
      order: $('#status_order_id'),
      btnCheck: $('#btnCheckStatus'),
      btnPoll: $('#btnPollStatus'),
      box: $('#payResult')
    },
    detail: {
      nohp: $('#detail_no_hp'),
      btn: $('#btnFetchDetail'),
      box: $('#detailBox')
    },
    modal: {
      root: $('#modal'),
      close: $('#modalClose'),
      openPay: $('#openPayLink'),
      startPoll: $('#startPolling'),
      info: $('#modalInfo')
    },
    nav: {
      home: $('#navHome'),
      status: $('#navStatus')
    }
  };

  // ---------- Utils ----------
  function toast(el, msg, ok = true){
    el.textContent = msg;
    el.style.color = ok ? '#b8ffe5' : '#ffb3ba';
  }
  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }

  async function apiGET(path){
    const r = await fetch(`${BASE}${path}`, { method:'GET', headers:{ 'Accept':'application/json' }});
    const t = await r.text();
    const j = JSON.parse(t);
    if (!r.ok || j?.ok === false) throw new Error(j?.message || `HTTP ${r.status}`);
    return j;
  }
  async function apiPOST(path, data){
    const r = await fetch(`${BASE}${path}`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(data || {})
    });
    const t = await r.text();
    const j = JSON.parse(t);
    if (!r.ok || j?.ok === false || j?.status >= 400) throw new Error(j?.message || `HTTP ${r.status}`);
    return j;
  }

  function saveMsisdn(no){
    localStorage.setItem('fdz.msisdn', no);
    els.otp.nohp.value = no;
    els.pay.nohp.value = no;
    els.detail.nohp.value = no;
  }
  function loadMsisdn(){
    const s = localStorage.getItem('fdz.msisdn') || '';
    if (s) {
      els.otp.nohp.value = s;
      els.pay.nohp.value = s;
      els.detail.nohp.value = s;
    }
    return s;
  }
  function saveOrderId(id){ localStorage.setItem('fdz.orderId', id); els.pay.order.value = id; }
  function loadOrderId(){ const s = localStorage.getItem('fdz.orderId') || ''; if (s) els.pay.order.value = s; return s; }

  function openModal(payUrl){
    els.modal.openPay.href = payUrl;
    show(els.modal.root);
  }
  function closeModal(){ hide(els.modal.root); }

  function renderCatalog(items){
    els.catalog.grid.innerHTML = '';
    if (!items || !items.length) {
      show(els.catalog.empty);
      return;
    }
    hide(els.catalog.empty);

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'pcard';
      card.innerHTML = `
        <div class="meta">
          <span class="pill">${item.payment_method}</span>
        </div>
        <h3>${escapeHtml(item.package_named_show)}</h3>
        <div class="price">Rp ${fmt(item.price_paket_show)}</div>
        <div class="desc">${escapeHtml(item.desc_package_show)}</div>
        <div class="actions">
          <button class="btn btn-primary">Order</button>
          <button class="btn btn-outline">Salin ID Paket</button>
        </div>
      `;
      const [btnOrder, btnCopy] = card.querySelectorAll('button');

      btnOrder.addEventListener('click', async () => {
        const msisdn = (els.otp.nohp.value || '').trim();
        if (!/^(08)\d{8,12}$/.test(msisdn)) {
          alert('Masukkan nomor 08xxxxxxxxxx yang valid lalu login OTP dulu.');
          return;
        }
        try {
          btnOrder.disabled = true;
          btnOrder.textContent = 'Membuat Invoice...';
          const res = await apiPOST('/kuota/pay/create', { paket_id: item.paket_id, no_hp: msisdn });
          const { orderId, paymentUrl } = res || {};
          if (!orderId || !paymentUrl) throw new Error('Gagal membuat invoice');
          saveOrderId(orderId);
          saveMsisdn(msisdn);
          els.modal.info.textContent = `Order ID: ${orderId}`;
          openModal(paymentUrl);
          // langsung buka tab baru juga (kalau popup blocker mengizinkan)
          window.open(paymentUrl, '_blank', 'noopener');
        } catch (e) {
          alert(e?.message || e);
        } finally {
          btnOrder.disabled = false;
          btnOrder.textContent = 'Order';
        }
      });

      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item.paket_id);
          btnCopy.textContent = 'Disalin ✓';
          setTimeout(()=>btnCopy.textContent='Salin ID Paket', 1200);
        } catch {}
      });

      els.catalog.grid.appendChild(card);
    });
  }

  function escapeHtml(s){
    return String(s||'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;');
  }

  function renderStatus(data){
    // data dari /kuota/pay/status -> { order fields, upstreamResult? }
    const box = els.pay.box;
    box.innerHTML = '';

    const kv = document.createElement('div');
    kv.className = 'kv';
    const addRow = (k,v) => {
      const dk = document.createElement('div'); dk.className='key'; dk.textContent = k;
      const dv = document.createElement('div'); dv.textContent = v;
      kv.append(dk, dv);
    };

    addRow('Order ID', data.orderId || '-');
    addRow('Tipe', data.type || '-');
    addRow('Status Jasa', data.status || '-');
    addRow('Nomor', data.msisdn || '-');
    addRow('Harga Jasa', data.price_sell != null ? `Rp ${fmt(data.price_sell)}` : '-');

    box.appendChild(kv);

    // Upstream result (deeplink/QRIS) kalau sudah ada
    if (data.upstreamResult && data.upstreamResult.data) {
      const up = data.upstreamResult.data;
      const wrap = document.createElement('div');
      wrap.className = 'card';
      const title = document.createElement('h3');
      title.textContent = 'Instruksi Pembayaran ke Provider';
      wrap.appendChild(title);

      const kv2 = document.createElement('div'); kv2.className = 'kv';
      const add2 = (k,v) => { const a=document.createElement('div'); a.className='key'; a.textContent=k; const b=document.createElement('div'); b.textContent=v; kv2.append(a,b); };
      add2('Nama Paket', up.nama_paket || '-');
      add2('Metode', up.payment_method || '-');
      add2('Trx ID', up.trx_id || '-');
      add2('Status', up.status || '-');
      wrap.appendChild(kv2);

      if (up.payment_method === 'DANA' && up.have_deeplink && up.deeplink) {
        const act = document.createElement('div'); act.className='btn-row'; act.style.marginTop='10px';
        const btn = document.createElement('a');
        btn.href = up.deeplink; btn.target = '_blank'; btn.rel='noopener';
        btn.className='btn btn-primary'; btn.textContent='Bayar di DANA';
        act.appendChild(btn);
        wrap.appendChild(act);
      }

      if (up.payment_method === 'QRIS' && up.is_qris && up.qris && up.qris.qr_code) {
        const qrBox = document.createElement('div'); qrBox.className='qrbox'; qrBox.style.marginTop='10px';
        const emv = encodeURIComponent(up.qris.qr_code);
        const img = document.createElement('img');
        // Gunakan generator QR publik sederhana
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${emv}`;
        img.alt = 'QRIS';
        qrBox.appendChild(img);

        const meta = document.createElement('div'); meta.className='muted'; meta.style.marginTop='8px';
        const expAt = up.qris.payment_expired_at ? new Date(up.qris.payment_expired_at*1000) : null;
        const remain = document.createElement('div'); remain.style.marginTop='6px';

        meta.textContent = expAt ? `Kedaluwarsa: ${expAt.toLocaleString('id-ID')}` : 'QRIS aktif';
        qrBox.appendChild(meta);
        qrBox.appendChild(remain);

        // Countdown
        let left = Number(up.qris.remaining_time||0);
        function tick(){
          if (left<=0) { remain.textContent = 'Waktu habis — refresh status untuk QR baru.'; return; }
          remain.textContent = `Sisa waktu: ${left}s`;
          left -= 1; setTimeout(tick, 1000);
        }
        if (left>0) tick();

        wrap.appendChild(qrBox);

        // Tombol salin EMV
        const btnRow = document.createElement('div'); btnRow.className='btn-row'; btnRow.style.marginTop='8px';
        const copyBtn = document.createElement('button'); copyBtn.className='btn btn-outline'; copyBtn.textContent='Salin Kode QR';
        copyBtn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(up.qris.qr_code); copyBtn.textContent = 'Disalin ✓'; setTimeout(()=>copyBtn.textContent='Salin Kode QR', 1200); } catch {}
        });
        btnRow.appendChild(copyBtn);
        wrap.appendChild(btnRow);
      }

      box.appendChild(wrap);
    } else {
      const wait = document.createElement('div');
      wait.className = 'muted';
      wait.textContent = 'Menunggu pembayaran jasa (Duitku) dikonfirmasi dan diteruskan ke provider...';
      box.appendChild(wait);
    }
  }

  function renderDetail(data){
    const box = els.detail.box;
    box.innerHTML = '';
    if (!data || !data.quotas || !data.quotas.length) {
      box.textContent = 'Tidak ada paket aktif.';
      return;
    }
    const t = [];
    t.push(`Nomor: ${data.msisdn || '-'}`);
    if (data.text) t.push(data.text);
    t.push('');
    data.quotas.forEach(q => {
      t.push(`• ${q.name} (exp: ${q.expired_at || '-'})`);
      if (Array.isArray(q.benefits)) {
        q.benefits.forEach(b => {
          t.push(`   - ${b.name}${b.information ? ` (${b.information})` : ''}: ${b.remaining_quota || b.quota || '-'}`);
        });
      }
      t.push('');
    });
    box.textContent = t.join('\n');
  }

  // ---------- OTP handlers ----------
  els.otp.btnReq.addEventListener('click', async () => {
    const msisdn = (els.otp.nohp.value || '').trim();
    if (!/^(08)\d{8,12}$/.test(msisdn)) { toast(els.otp.status, 'Nomor tidak valid', false); return; }
    try {
      els.otp.btnReq.disabled = true;
      const res = await apiPOST('/kuota/otp/request', { no_hp: msisdn });
      saveMsisdn(msisdn);
      toast(els.otp.status, `OTP dikirim. auth_id: ${res?.data?.auth_id || '-'}`);
    } catch (e) {
      toast(els.otp.status, e?.message || e, false);
    } finally {
      els.otp.btnReq.disabled = false;
    }
  });

  els.otp.btnVerify.addEventListener('click', async () => {
    const msisdn = (els.otp.nohp.value || '').trim();
    const auth  = (els.otp.auth.value || '').trim();
    const code  = (els.otp.code.value || '').trim();
    if (!msisdn || !auth || !code) { toast(els.otp.status, 'Lengkapi data OTP', false); return; }
    try {
      els.otp.btnVerify.disabled = true;
      const res = await apiPOST('/kuota/otp/verify', { no_hp: msisdn, auth_id: auth, kode_otp: code });
      toast(els.otp.status, res?.message || 'Login OTP berhasil');
      show(els.otp.badge);
      saveMsisdn(msisdn);
      // refresh katalog di bawah (opsi)
    } catch (e) {
      toast(els.otp.status, e?.message || e, false);
    } finally {
      els.otp.btnVerify.disabled = false;
    }
  });

  // ---------- Katalog ----------
  async function loadCatalog(){
    try {
      const res = await apiGET('/data/kuota/list');
      renderCatalog(res?.data || []);
    } catch (e) {
      els.catalog.grid.innerHTML = ''; show(els.catalog.empty);
    }
  }

  // ---------- Status (manual & auto poll) ----------
  async function fetchStatusOnce(){
    const msisdn = (els.pay.nohp.value || '').trim();
    const orderId = (els.pay.order.value || '').trim();
    if (!msisdn || !orderId) { alert('Isi Nomor & Order ID'); return; }
    const res = await apiGET(`/kuota/pay/status?orderId=${encodeURIComponent(orderId)}&no_hp=${encodeURIComponent(msisdn)}`);
    if (res?.data) renderStatus(res.data);
    return res;
  }
  let pollTimer = null;
  function startPoll(){
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await fetchStatusOnce();
        const d = res?.data;
        // stop kalau upstreamResult sudah ada dan status bukan pending
        if (d?.upstreamResult && d?.status === 'PAID') stopPoll();
      } catch {}
    }, 3500);
    els.pay.btnPoll.textContent = 'Stop Poll';
  }
  function stopPoll(){
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    els.pay.btnPoll.textContent = 'Auto Poll';
  }

  els.pay.btnCheck.addEventListener('click', fetchStatusOnce);
  els.pay.btnPoll.addEventListener('click', () => pollTimer ? stopPoll() : startPoll());

  // Modal events
  els.modal.close.addEventListener('click', closeModal);
  els.modal.startPoll.addEventListener('click', () => { startPoll(); els.modal.info.textContent = 'Auto poll berjalan...'; });
  // jika user klik buka link pembayaran
  $('#openPayLink').addEventListener('click', () => { els.modal.info.textContent = 'Link pembayaran dibuka. Selesaikan pembayaran, lalu sistem otomatis meneruskan ke provider.'; });

  // ---------- Detail Paket Aktif ----------
  els.detail.btn.addEventListener('click', async () => {
    const msisdn = (els.detail.nohp.value || '').trim();
    if (!msisdn) { alert('Isi nomor 08xxxxxxxxxx'); return; }
    try {
      const res = await apiGET(`/kuota/detail?no_hp=${encodeURIComponent(msisdn)}`);
      renderDetail(res?.data || {});
    } catch (e) {
      els.detail.box.textContent = e?.message || 'Gagal mengambil detail paket.';
    }
  });

  // ---------- Session badge ----------
  async function checkSessionBadge(){
    const msisdn = (els.otp.nohp.value || '').trim();
    if (!msisdn) { hide(els.otp.badge); return; }
    try {
      const s = await apiGET(`/kuota/session?no_hp=${encodeURIComponent(msisdn)}`);
      if (s?.loggedIn) show(els.otp.badge); else hide(els.otp.badge);
    } catch { hide(els.otp.badge); }
  }

  // ---------- Navigation small UX ----------
  els.nav.home.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top:0, behavior:'smooth' }); });
  els.nav.status.addEventListener('click', (e) => { e.preventDefault(); $('#statusSection').scrollIntoView({ behavior:'smooth' }); });

  // ---------- Init ----------
  (function init(){
    els.year.textContent = new Date().getFullYear();
    loadMsisdn();
    loadOrderId();
    checkSessionBadge();
    loadCatalog();
  })();
})();
