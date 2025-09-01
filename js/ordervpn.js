/* ordervpn.js — fadzdigital */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

// Elemen
const formEl = document.getElementById('orderForm');
const usernameEl = document.getElementById('username');
const emailEl = document.getElementById('email');
const protocolEl = document.getElementById('protocol');
const packageRadios = document.querySelectorAll('input[name="packageId"]');

const usernameFinalPreview = document.getElementById('usernameFinalPreview');
const pricePreview = document.getElementById('pricePreview');
const detailsPreview = document.getElementById('detailsPreview');

const submitBtn = document.getElementById('submitBtn');
const waitingBox = document.getElementById('waitingBox');
const orderIdText = document.getElementById('orderIdText');
const statusText = document.getElementById('statusText');
const payLink = document.getElementById('payLink');

const resultBox = document.getElementById('resultBox');
const configTextEl = document.getElementById('configText');

// Detail akun
const accUsername = document.getElementById('accUsername');
const accUUID = document.getElementById('accUUID');
const accDomain = document.getElementById('accDomain');
const accQuota = document.getElementById('accQuota');
const accCreated = document.getElementById('accCreated');
const accExpired = document.getElementById('accExpired');

const blkWsTls = document.getElementById('blk-ws-tls');
const blkWsNtls = document.getElementById('blk-ws-ntls');
const blkGrpc = document.getElementById('blk-grpc');

const accWsTls = document.getElementById('accWsTls');
const accWsNtls = document.getElementById('accWsNtls');
const accGrpc = document.getElementById('accGrpc');

const copyAllBtn = document.getElementById('copyAllBtn');
const downloadBtn = document.getElementById('downloadConfigBtn');

const errorBox = document.getElementById('errorBox');

// packages
const PACKAGES = {
  SG_HP_10K:  { id:'SG_HP_10K',  label:'SG HP 300GB/30h',  region:'SG', type:'HP',  price:10000, quota:300, expDays:30 },
  ID_HP_15K:  { id:'ID_HP_15K',  label:'ID HP 300GB/30h',  region:'ID', type:'HP',  price:15000, quota:300, expDays:30 },
  SG_STB_15K: { id:'SG_STB_15K', label:'SG STB 600GB/30h', region:'SG', type:'STB', price:15000, quota:600, expDays:30 },
  ID_STB_20K: { id:'ID_STB_20K', label:'ID STB 600GB/30h', region:'ID', type:'STB', price:20000, quota:600, expDays:30 },
};

// Utils tampilan
function show(el){ if(el) el.style.display=''; }
function hide(el){ if(el) el.style.display='none'; }
function setText(el, t){ if(el) el.textContent = t ?? ''; }

function showError(msg){
  if(!errorBox) return;
  errorBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(msg)}</div>`;
  show(errorBox);
  setLoading(false);
}
function clearError(){ if(errorBox){ errorBox.innerHTML=''; hide(errorBox); } }

function setLoading(b){
  if(!submitBtn) return;
  submitBtn.disabled = b;
  submitBtn.innerHTML = b
    ? `<span class="spinner-border spinner-border-sm me-2"></span> Memproses...`
    : `<i class="bi bi-cart-check me-2"></i> Checkout & Bayar`;
}

function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// Username final
function randomSuffix3(){ return Math.floor(100+Math.random()*900).toString(); }
function baseSanitize(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9\-]/g,'').slice(0,20); }
function buildUsernameFinal(base){ return `${baseSanitize(base)}-${randomSuffix3()}`.slice(0,24); }

function refreshPreview(){
  const pkg = resolvePackage();
  if(pkg){
    setText(pricePreview, `Rp ${formatRupiah(pkg.price)} / ${pkg.expDays} hari`);
    setText(detailsPreview, `${pkg.region} • ${pkg.type} • Kuota ${pkg.quota}GB`);
  }
  if(usernameEl && usernameFinalPreview){
    setText(usernameFinalPreview, buildUsernameFinal(usernameEl.value || 'user'));
  }
}
function formatRupiah(n){ return (n||0).toLocaleString('id-ID'); }

function getCheckedPackageId(){
  const r = Array.from(packageRadios || []).find(x=>x.checked);
  return r ? r.value : null;
}
function resolvePackage(){
  const id = getCheckedPackageId();
  return id && PACKAGES[id] ? PACKAGES[id] : null;
}

if(usernameEl) usernameEl.addEventListener('input', refreshPreview);
(packageRadios||[]).forEach(r=>r.addEventListener('change', refreshPreview));
document.addEventListener('DOMContentLoaded', refreshPreview);

// Submit form
if(formEl){
  formEl.addEventListener('submit', async (e)=>{
    e.preventDefault();
    clearError(); hide(resultBox); hide(waitingBox);

    const pkg = resolvePackage();
    if(!pkg) return showError('Silakan pilih paket.');

    const protocol = (protocolEl?.value || 'vmess').toLowerCase();
    const username = baseSanitize(usernameEl?.value || '');
    const email = (emailEl?.value || '').trim();

    if(!username) return showError('Username wajib diisi.');
    if(email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Format email tidak valid.');

    const usernameFinal = (usernameFinalPreview?.textContent || buildUsernameFinal(username)).toLowerCase();

    const payload = { packageId: pkg.id, protocol, username, usernameFinal, email };

    setLoading(true);
    try{
      const res = await fetch(`${API_BASE}/pay/create`, {
        method:'POST', headers:{'Content-Type':'application/json'},
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

// Poll status
let pollTimer=null;
async function pollStatus(orderId){
  const started = Date.now();
  const tick = async ()=>{
    try{
      const res = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`);
      const txt = await res.text();
      let data; try{ data = JSON.parse(txt);}catch{ data = { raw: txt }; }

      if(!res.ok){ setText(statusText,'Order tidak ditemukan / error.'); return stopPoll(); }

      setText(orderIdText, data.orderId || orderId);
      const st = (data.status||'').toUpperCase();

      if(st === 'PAID'){
        setText(statusText,'Pembayaran diterima ✔');
        showResultConfig(data);
        return stopPoll();
      }else if(st === 'FAILED'){
        setText(statusText,'Pembayaran gagal ✖');
        return stopPoll();
      }else{
        setText(statusText,'Menunggu pembayaran...');
      }

      if(Date.now()-started > POLL_TIMEOUT_MS){
        setText(statusText,'Timeout menunggu pembayaran. Coba klik “Buka Halaman Pembayaran” lagi.');
        return stopPoll();
      }
    }catch(e){ /* retry */ }
  };
  await tick();
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}
function stopPoll(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }

// ----- Render hasil akun -----
function showResultConfig(data){
  hide(waitingBox); show(resultBox);

  const raw = (data.accountConfig || '').trim();
  if(!raw){
    // belum ada
    configTextEl.classList.remove('d-none');
    configTextEl.value = 'Akun berhasil dibuat, Silakan Refresh Halaman, untuk notifikasi ke email ada sedikit jeda sekitar 5-10menit.\nJika mendapat response --username already exist-- silakan hubungi admin.';
    // kosongkan blok structured
    fillSummary({}, true);
    fillConn({}, true);
    return;
  }

  // parse JSON dari API VPN
  let parsed = null;
  try{ parsed = JSON.parse(raw); }catch{ /* bisa bukan JSON */ }

  if(parsed && typeof parsed === 'object' && (parsed.username || parsed.uuid)){
    // tampil structured
    configTextEl.classList.add('d-none');

    // domain fallback: kalau tidak ada domain di payload, coba deteksi dari link
    if(!parsed.domain){
      parsed.domain = guessDomainFromLinks(parsed) || '';
    }

    fillSummary(parsed, false);
    fillConn(parsed, false);
    // siapkan copy all / download
    setupActions(parsed);
  }else{
    // fallback textarea
    configTextEl.classList.remove('d-none');
    configTextEl.value = raw;
    // kosongkan structured view
    fillSummary({}, true);
    fillConn({}, true);
    setupActions(null, raw);
  }
}

// Ringkasan
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

// Koneksi
function fillConn(p, hideAll){
  // ws_tls
  if(!hideAll && p.ws_tls){
    accWsTls.textContent = p.ws_tls;
    show(blkWsTls);
  }else{
    hide(blkWsTls); accWsTls.textContent='';
  }

  // ws_ntls (tidak semua protokol punya)
  if(!hideAll && p.ws_ntls){
    accWsNtls.textContent = p.ws_ntls;
    show(blkWsNtls);
  }else{
    hide(blkWsNtls); accWsNtls.textContent='';
  }

  // grpc
  if(!hideAll && p.grpc){
    accGrpc.textContent = p.grpc;
    show(blkGrpc);
  }else{
    hide(blkGrpc); accGrpc.textContent='';
  }
}

// ----- Fallback deteksi domain dari link-link -----
function guessDomainFromLinks(p){
  // Prioritas: ws_tls -> ws_ntls -> grpc
  const candidates = [p?.ws_tls, p?.ws_ntls, p?.grpc].filter(Boolean);

  for(const link of candidates){
    if(/^vmess:\/\//i.test(link)){
      const b64 = link.replace(/^vmess:\/\//i, '').trim();
      const json = tryDecodeVmessBase64(b64);
      if(json){
        // 'add' biasanya hostname; kalau tidak ada, coba 'host'
        const host = json.add || json.host;
        if(host) return host;
      }
    } else if(/^vless:\/\//i.test(link) || /^trojan:\/\//i.test(link)){
      try{
        const u = new URL(link);
        if(u.hostname) return u.hostname;
        // beberapa klien menaruh host di param 'host' / 'sni'
        const host = u.searchParams.get('host') || u.searchParams.get('sni');
        if(host) return host;
      }catch{ /* ignore */ }
    }
  }
  return '';
}

function tryDecodeVmessBase64(b64){
  try{
    // perbaiki padding base64
    let s = b64.replace(/\s+/g,'').replace(/-/g,'+').replace(/_/g,'/');
    if(s.length % 4 !== 0) s += '='.repeat(4 - (s.length % 4));
    const decoded = atob(s);
    return JSON.parse(decoded);
  }catch{
    return null;
  }
}

// Copy tombol per baris
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

// Copy semua & download
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

//----- Susun isi .txt ----
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

  if(p.ws_tls){
    lines.push('[WS TLS]');
    lines.push(p.ws_tls);
    lines.push('');
  }
  if(p.ws_ntls){
    lines.push('[WS Non-TLS]');
    lines.push(p.ws_ntls);
    lines.push('');
  }
  if(p.grpc){
    lines.push('[gRPC]');
    lines.push(p.grpc);
    lines.push('');
  }

  if(p.config_url){ // khususon trojan
    lines.push(`Config URL: ${p.config_url}`);
    lines.push('');
  }

  lines.push('Simpan file ini untuk impor konfigurasi.');
  return lines.join('\n');
}

// Copy & Download (fallback raw tetap bekerja)
if(downloadBtn && !downloadBtn.onclick){
  downloadBtn.addEventListener('click', ()=>{
    const txt = configTextEl.value || '';
    const blob = new Blob([txt], {type:'text/plain'});
    const a = document.createElement('a');
    const orderId = (orderIdText?.textContent || 'vpn-account').replace(/\s+/g,'');
    a.href = URL.createObjectURL(blob);
    a.download = `${orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const last = localStorage.getItem('fdz_last_order');
  if(last){
    if(waitingBox){ setText(orderIdText,last); setText(statusText,'Memeriksa status terakhir...'); show(waitingBox); }
    pollStatus(last);
  }
});
