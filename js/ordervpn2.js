/* =========================================================
   ordervpn.js — FE dinamis (fetch /config + flow baru/legacy)
   ========================================================= */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

// ---------- GET ELEMENTS ----------
const formEl     = document.getElementById('orderForm');

const usernameEl = document.getElementById('username');
const emailEl    = document.getElementById('email');
const protocolEl = document.getElementById('protocol');

const packageRadios = document.querySelectorAll('input[name="packageId"]'); // legacy

// Flow baru controls (optional jika ada di HTML)
const variantSel = document.getElementById('variant');   // HP / STB
const regionSel  = document.getElementById('region');    // SG / ID
const serverSel  = document.getElementById('serverId');  // sgdo1 / id1 / dst
const promoEl    = document.getElementById('promoCode'); // optional

// Preview
const usernameFinalPreview = document.getElementById('usernameFinalPreview');
const pricePreview   = document.getElementById('pricePreview');
const detailsPreview = document.getElementById('detailsPreview');

// Status pembayaran
const submitBtn   = document.getElementById('submitBtn');
const waitingBox  = document.getElementById('waitingBox');
const orderIdText = document.getElementById('orderIdText');
const statusText  = document.getElementById('statusText');
const payLink     = document.getElementById('payLink');

// Hasil akun
const resultBox   = document.getElementById('resultBox');
const configTextEl = document.getElementById('configText');

// Detail akun (structured)
const accUsername = document.getElementById('accUsername');
const accUUID     = document.getElementById('accUUID');
const accDomain   = document.getElementById('accDomain');
const accQuota    = document.getElementById('accQuota');
const accCreated  = document.getElementById('accCreated');
const accExpired  = document.getElementById('accExpired');

const blkWsTls = document.getElementById('blk-ws-tls');
const blkWsNtls = document.getElementById('blk-ws-ntls');
const blkGrpc  = document.getElementById('blk-grpc');

const accWsTls  = document.getElementById('accWsTls');
const accWsNtls = document.getElementById('accWsNtls');
const accGrpc   = document.getElementById('accGrpc');

const copyAllBtn  = document.getElementById('copyAllBtn');
const downloadBtn = document.getElementById('downloadConfigBtn');

const errorBox = document.getElementById('errorBox');

// ---------- STATE ----------
let CFG = null;         // hasil GET /config
let USE_NEW_FLOW = false; // true jika elemen variant/region/serverId tersedia
let pollTimer = null;

// ---------- UTILS UI ----------
function show(el){ if(el) el.style.display=''; }
function hide(el){ if(el) el.style.display='none'; }
function setText(el, t){ if(el) el.textContent = (t ?? ''); }
function htmlEscape(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function showError(msg){
  if(!errorBox) return;
  errorBox.innerHTML = `<div class="alert alert-danger">${htmlEscape(msg)}</div>`;
  show(errorBox);
  setLoading(false);
}
function clearError(){ if(errorBox){ errorBox.innerHTML=''; hide(errorBox); } }

function setLoading(b){
  if(!submitBtn) return;
  submitBtn.disabled = b;
  submitBtn.innerHTML = b
    ? `<span class="spinner-border spinner-border-sm me-2"></span> Memproses...`
    : `<i class="bi bi-cart-check me-2"></i>Checkout & Bayar`;
}

// ---------- HELPERS ----------
function randomSuffix3(){ return Math.floor(100 + Math.random()*900).toString(); }
function baseSanitize(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9\-]/g,'').slice(0,20); }
function buildUsernameFinal(base){ return `${baseSanitize(base)}-${randomSuffix3()}`.slice(0,24); }
function rupiah(n){ return (n||0).toLocaleString('id-ID'); }

function getCheckedPackageId(){
  const r = Array.from(packageRadios || []).find(x=>x.checked);
  return r ? r.value : null;
}

// Legacy package map (fallback)
const LEGACY_PACKAGES = {
  SG_HP_10K:  { id:'SG_HP_10K',  label:'SG HP 300GB/30h',  region:'SG', type:'HP',  price:10000, quota:300, expDays:30 },
  ID_HP_15K:  { id:'ID_HP_15K',  label:'ID HP 300GB/30h',  region:'ID', type:'HP',  price:15000, quota:300, expDays:30 },
  SG_STB_15K: { id:'SG_STB_15K', label:'SG STB 600GB/30h', region:'SG', type:'STB', price:15000, quota:600, expDays:30 },
  ID_STB_20K: { id:'ID_STB_20K', label:'ID STB 600GB/30h', region:'ID', type:'STB', price:20000, quota:600, expDays:30 },
};

// ---------- INIT CONFIG (/config) ----------
async function initConfig(){
  try{
    const res = await fetch(`${API_BASE}/config`, { method:'GET' });
    const txt = await res.text();
    let data; try{ data = JSON.parse(txt);}catch{ data = null; }
    if(!res.ok || !data) throw new Error('Gagal mengambil config.');

    CFG = data;
    // deteksi apakah ada elemen flow baru
    USE_NEW_FLOW = !!(variantSel && regionSel && serverSel);

    if (USE_NEW_FLOW) {
      populateVariantRegion();
      bindVariantRegionChange();
      refreshPricePreview(); // akan memicu load server & hitung harga
    } else {
      // fallback legacy: cukup refresh preview dari radio paket
      refreshLegacyPreview();
    }
  }catch(e){
    // Jika /config error, fallback ke legacy saja (kalau ada)
    USE_NEW_FLOW = !!(variantSel && regionSel && serverSel);
    if (USE_NEW_FLOW) {
      // kalau user memang pakai flow baru tapi /config error → tampilkan error
      showError('Gagal memuat konfigurasi server. Coba reload halaman.');
    } else {
      refreshLegacyPreview();
    }
  }
}

// ---------- POPULATE & BIND (FLOW BARU) ----------
function populateVariantRegion(){
  // Isi variant (HP/STB) kalau option belum ada
  if (variantSel && !variantSel.options.length) {
    const opts = [
      { v:'HP',  t:'HP'  },
      { v:'STB', t:'STB' }
    ];
    for(const o of opts){
      const el = document.createElement('option');
      el.value = o.v; el.textContent = o.t;
      variantSel.appendChild(el);
    }
  }
  // Isi region (SG/ID) kalau kosong
  if (regionSel && !regionSel.options.length) {
    const opts = [
      { v:'SG', t:'Singapore' },
      { v:'ID', t:'Indonesia' }
    ];
    for(const o of opts){
      const el = document.createElement('option');
      el.value = o.v; el.textContent = o.t;
      regionSel.appendChild(el);
    }
  }

  // Isi server list pertama kali
  populateServers();
}

function populateServers(){
  if (!CFG || !serverSel) return;

  const variant = (variantSel?.value || 'HP').toUpperCase();
  const region  = (regionSel?.value  || 'SG').toUpperCase();

  // Dari CFG.variants[variant][region] -> array {id,label,price}
  const arr = CFG?.variants?.[variant]?.[region] || [];
  serverSel.innerHTML = '';
  for (const s of arr) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.label} — Rp ${rupiah(s.price)}`;
    opt.setAttribute('data-price', String(s.price));
    opt.setAttribute('data-label', s.label);
    serverSel.appendChild(opt);
  }
}

function bindVariantRegionChange(){
  if (variantSel) variantSel.addEventListener('change', ()=>{
    populateServers();
    refreshPricePreview();
  });
  if (regionSel) regionSel.addEventListener('change', ()=>{
    populateServers();
    refreshPricePreview();
  });
  if (serverSel) serverSel.addEventListener('change', ()=>{
    refreshPricePreview();
  });
}

function refreshPricePreview(){
  // username final
  if(usernameEl && usernameFinalPreview){
    setText(usernameFinalPreview, buildUsernameFinal(usernameEl.value || 'user'));
  }

  if (!USE_NEW_FLOW) return;

  const variant = (variantSel?.value || 'HP').toUpperCase();
  const region  = (regionSel?.value  || 'SG').toUpperCase();

  let price = 0, label = '';
  if (serverSel && serverSel.options.length) {
    const sel = serverSel.selectedOptions[0];
    if (sel) {
      price = parseInt(sel.getAttribute('data-price') || '0', 10) || 0;
      label = sel.getAttribute('data-label') || sel.textContent || '';
    }
  }

  // Promo (preview)
  let after = price;
  const code = (promoEl?.value || '').trim();
  const promoOnline = (CFG?.promo?.status || '').toLowerCase() === 'online';
  if (promoOnline && code) {
    const disc = parseInt(CFG?.promo?.discount || 0, 10) || 0;
    // Preview potong hanya jika kode ada di daftar (optional: bisa abaikan check list supaya UX cepat)
    const list = (CFG?.promo?.codes || []).map(x=>String(x||'').toLowerCase());
    if (list.includes(code.toLowerCase())) {
      after = Math.max(0, price - disc);
    }
  }

  if(pricePreview) setText(pricePreview, `Rp ${rupiah(after)} / 30 hari`);
  if(detailsPreview) setText(detailsPreview, `${region} • ${variant} • ${label||'-'}`);
}

// ---------- PREVIEW (LEGACY) ----------
function refreshLegacyPreview(){
  const id = getCheckedPackageId();
  const pkg = id && LEGACY_PACKAGES[id] ? LEGACY_PACKAGES[id] : null;
  if(pkg && pricePreview){
    setText(pricePreview, `Rp ${rupiah(pkg.price)} / ${pkg.expDays} hari`);
  }
  if(pkg && detailsPreview){
    setText(detailsPreview, `${pkg.region} • ${pkg.type} • Kuota ${pkg.quota}GB`);
  }
  if(usernameEl && usernameFinalPreview){
    setText(usernameFinalPreview, buildUsernameFinal(usernameEl.value || 'user'));
  }
}

// ---------- BIND INPUT ----------
if (usernameEl) usernameEl.addEventListener('input', ()=>{
  if (USE_NEW_FLOW) refreshPricePreview(); else refreshLegacyPreview();
});

(packageRadios || []).forEach(r=>{
  r.addEventListener('change', refreshLegacyPreview);
});

if (promoEl) promoEl.addEventListener('input', refreshPricePreview);

// ---------- SUBMIT ----------
if (formEl) {
  formEl.addEventListener('submit', async (e)=>{
    e.preventDefault();
    clearError(); hide(resultBox); hide(waitingBox);

    // Validasi umum
    const protocol = (protocolEl?.value || 'vmess').toLowerCase();
    const username = baseSanitize(usernameEl?.value || '');
    const email    = (emailEl?.value || '').trim();
    if(!username) return showError('Username wajib diisi.');
    if(email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Format email tidak valid.');

    const usernameFinal = (usernameFinalPreview?.textContent || buildUsernameFinal(username)).toLowerCase();

    // Payload...
    let payload = null;

    if (USE_NEW_FLOW) {
      // Flow baru
      const variant = (variantSel?.value || '').toUpperCase();
      const region  = (regionSel?.value  || '').toUpperCase();
      const serverId= (serverSel?.value  || '').trim();
      if (!variant || !region || !serverId) return showError('Varian/Region/Server belum dipilih.');

      payload = {
        variant, region, serverId,
        promoCode: (promoEl?.value || '').trim(),
        protocol, username, usernameFinal, email
      };
    } else {
      // Legacy (pakai packageId radio)
      const pkgId = getCheckedPackageId();
      if(!pkgId) return showError('Silakan pilih paket.');
      payload = { packageId: pkgId, protocol, username, usernameFinal, email };
    }

    setLoading(true);
    try{
      const res = await fetch(`${API_BASE}/pay/create`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      let data; try{ data = JSON.parse(txt);}catch{ data = { raw: txt }; }
      setLoading(false);

      if(!res.ok) return showError(data?.message || 'Gagal membuat invoice.');

      const { orderId, paymentUrl } = data;
      if(!orderId || !paymentUrl) return showError('Response tidak lengkap dari server.');

      localStorage.setItem('fdz_last_order', orderId);
      setText(orderIdText, orderId);
      setText(statusText, 'Menunggu pembayaran...');
      if(payLink){ payLink.href = paymentUrl; payLink.target = '_blank'; }
      show(waitingBox);
      window.open(paymentUrl, '_blank', 'noopener');
      pollStatus(orderId);
    }catch(err){
      setLoading(false);
      showError('Gagal terhubung ke API.');
    }
  });
}

// ---------- POLLING ----------
async function pollStatus(orderId){
  const started = Date.now();

  const tick = async ()=>{
    try{
      const res = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`);
      const txt = await res.text();
      let data; try{ data = JSON.parse(txt);}catch{ data = { raw: txt }; }

      if(!res.ok){
        setText(statusText, 'Order tidak ditemukan / error.');
        return stopPoll();
      }

      setText(orderIdText, data.orderId || orderId);
      const st = (data.status || '').toUpperCase();

      if (st === 'PAID') {
        setText(statusText, 'Pembayaran diterima ✔');
        showResultConfig(data);
        return stopPoll();
      } else if (st === 'FAILED') {
        setText(statusText, 'Pembayaran gagal ✖');
        return stopPoll();
      } else {
        setText(statusText, 'Menunggu pembayaran...');
      }

      if (Date.now() - started > POLL_TIMEOUT_MS) {
        setText(statusText,'Timeout menunggu pembayaran. Klik “Buka Halaman Pembayaran” untuk lanjut.');
        return stopPoll();
      }
    } catch(e){
      // diam, coba lagi next tick
    }
  };

  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPoll(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }

// ---------- RENDER HASIL AKUN ----------
function showResultConfig(data){
  hide(waitingBox); show(resultBox);

  const raw = (data.accountConfig || '').trim();
  if(!raw){
    configTextEl.classList.remove('d-none');
    configTextEl.value = 'Akun berhasil dibuat, Silakan Refresh Halaman. Untuk email ada jeda 5–10 menit.\nJika mendapat --username already exist-- hubungi admin.';
    fillSummary({}, true);
    fillConn({}, true);
    setupActions(null, configTextEl.value);
    return;
  }

  let parsed = null;
  try{ parsed = JSON.parse(raw); }catch{}

  if (parsed && typeof parsed === 'object' && (parsed.username || parsed.uuid)) {
    configTextEl.classList.add('d-none');

    // fallback domain jika tidak ada → coba deteksi dari link / gunakan host server
    if (!parsed.domain) {
      parsed.domain = guessDomainFromLinks(parsed) || (data?.server?.host || '');
    }

    fillSummary(parsed, false);
    fillConn(parsed, false);
    setupActions(parsed, null);
  } else {
    configTextEl.classList.remove('d-none');
    configTextEl.value = raw;
    fillSummary({}, true);
    fillConn({}, true);
    setupActions(null, raw);
  }
}

// ---------- SUMMARY ----------
function fillSummary(p, hideAll){
  if(hideAll){
    setText(accUsername,'-'); setText(accUUID,'-'); setText(accDomain,'-');
    setText(accQuota,'-'); setText(accCreated,'-'); setText(accExpired,'-');
    return;
  }
  setText(accUsername, p.username || '-');
  setText(accUUID, p.uuid || '-');
  setText(accDomain, p.domain || '-');
  setText(accQuota, (p.quota_gb ? `${p.quota_gb} GB` : (p.quota ? `${p.quota} GB` : '-')));
  setText(accCreated, p.created || '-');
  setText(accExpired, p.expired || '-');
}

// ---------- CONNECTION BLOCKS ----------
function fillConn(p, hideAll){
  if(!hideAll && p.ws_tls){
    accWsTls.textContent = p.ws_tls; show(blkWsTls);
  } else { hide(blkWsTls); accWsTls.textContent=''; }

  if(!hideAll && p.ws_ntls){
    accWsNtls.textContent = p.ws_ntls; show(blkWsNtls);
  } else { hide(blkWsNtls); accWsNtls.textContent=''; }

  if(!hideAll && p.grpc){
    accGrpc.textContent = p.grpc; show(blkGrpc);
  } else { hide(blkGrpc); accGrpc.textContent=''; }
}

// ---------- DETEKSI DOMAIN DARI LINK ----------
function guessDomainFromLinks(p){
  const candidates = [p?.ws_tls, p?.ws_ntls, p?.grpc].filter(Boolean);
  for(const link of candidates){
    if(/^vmess:\/\//i.test(link)){
      const b64 = link.replace(/^vmess:\/\//i, '').trim();
      const json = tryDecodeVmessBase64(b64);
      if(json){
        const host = json.add || json.host;
        if(host) return host;
      }
    } else if(/^vless:\/\//i.test(link) || /^trojan:\/\//i.test(link)){
      try{
        const u = new URL(link);
        if(u.hostname) return u.hostname;
        const host = u.searchParams.get('host') || u.searchParams.get('sni');
        if(host) return host;
      }catch{}
    }
  }
  return '';
}

function tryDecodeVmessBase64(b64){
  try{
    let s = b64.replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
    if(s.length % 4 !== 0) s += '='.repeat(4 - (s.length % 4));
    const decoded = atob(s);
    return JSON.parse(decoded);
  }catch{
    return null;
  }
}

// ---------- COPY BUTTONS ----------
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.cfg-copy');
  if(!btn) return;
  const id = btn.getAttribute('data-target');
  const el = document.getElementById(id);
  if(!el) return;
  try{
    await navigator.clipboard.writeText(el.textContent || '');
    btn.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
    setTimeout(()=> btn.innerHTML = `<i class="bi bi-clipboard"></i> Copy`, 1200);
  }catch{ alert('Gagal menyalin. Salin manual ya.'); }
});

// ---------- COPY SEMUA & DOWNLOAD ----------
function setupActions(parsed, rawText){
  if(copyAllBtn){
    copyAllBtn.onclick = async ()=>{
      const text = parsed ? buildTextDump(parsed) : (rawText || configTextEl.value || '');
      try{
        await navigator.clipboard.writeText(text);
        copyAllBtn.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
        setTimeout(()=> copyAllBtn.innerHTML = `<i class="bi bi-clipboard-check"></i> Copy Semua`, 1200);
      }catch{ alert('Gagal menyalin.'); }
    };
  }

  if(downloadBtn){
    downloadBtn.onclick = ()=>{
      const text = parsed ? buildTextDump(parsed) : (rawText || configTextEl.value || '');
      const blob = new Blob([text], {type:'text/plain'});
      const a = document.createElement('a');
      const orderId = (orderIdText?.textContent || 'vpn-account').replace(/\s+/g,'');
      a.href = URL.createObjectURL(blob);
      a.download = `${orderId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    };
  }
}

function buildTextDump(p){
  const lines = [];
  lines.push('=== FADZDIGITAL VPN ACCOUNT ===');
  if(p.username) lines.push(`Username : ${p.username}`);
  if(p.uuid)     lines.push(`UUID     : ${p.uuid}`);
  if(p.domain)   lines.push(`Domain   : ${p.domain}`);
  if(p.quota_gb) lines.push(`Quota    : ${p.quota_gb} GB`);
  if(p.created)  lines.push(`Created  : ${p.created}`);
  if(p.expired)  lines.push(`Expired  : ${p.expired}`);
  lines.push('');
  if(p.ws_tls){  lines.push('[WS TLS]');     lines.push(p.ws_tls);  lines.push(''); }
  if(p.ws_ntls){ lines.push('[WS Non-TLS]'); lines.push(p.ws_ntls); lines.push(''); }
  if(p.grpc){    lines.push('[gRPC]');       lines.push(p.grpc);    lines.push(''); }
  if(p.config_url){ lines.push(`Config URL: ${p.config_url}`); lines.push(''); }
  lines.push('Simpan file ini untuk impor konfigurasi.');
  return lines.join('\n');
}

// ---------- RESUME LAST ORDER ----------
document.addEventListener('DOMContentLoaded', async ()=>{
  await initConfig(); // ambil /config (kalau gagal → legacy fallback)

  const last = localStorage.getItem('fdz_last_order');
  if(last){
    if(waitingBox){
      setText(orderIdText,last);
      setText(statusText,'Memeriksa status terakhir...');
      show(waitingBox);
    }
    pollStatus(last);
  }
});
