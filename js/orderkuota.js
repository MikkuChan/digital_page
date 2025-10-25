// ======= CONFIG =======
const API_BASE = "https://call.fadzdigital.store"; // ganti ke domain Worker kamu
const POLL_MS = 4000; // interval polling status invoice

// ======= UTILS =======
const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
const toast = (msg) => {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2200);
};
const spin = (on) => $("#spinner").classList.toggle("hidden", !on);

function rupiah(n){ try { return (n||0).toLocaleString("id-ID",{style:"currency", currency:"IDR", maximumFractionDigits:0}); } catch { return `Rp ${n}`; } }
function normNo(no){
  let s = String(no||"").trim();
  if (!s) return null;
  if (s.startsWith("+62")) s = "0"+s.slice(3);
  else if (s.startsWith("62")) s = "0"+s.slice(2);
  if (!/^0\d{9,14}$/.test(s)) return null;
  return s;
}
function qrisImgUrl(qrText){
  // pakai layanan umum generator QR; fallback aman jika diblok cukup tampilkan string
  const u = "https://api.qrserver.com/v1/create-qr-code/";
  const p = new URLSearchParams({ data: qrText, size:"220x220", qzone:"2", margin:"0" });
  return `${u}?${p.toString()}`;
}

// ======= STATE =======
let CATALOG = [];
let SELECTED = null; // { paket_id, package_named_show, payment_method, price_paket_show }
let CURRENT_ORDER = null; // { orderId, paymentUrl }

// ======= DOM =======
const elYear = $("#year");
const elNo = $("#no_hp");
const elSessionInfo = $("#sessionInfo");
const elOtpInfo = $("#otpSentInfo");
const elCatalog = $("#catalog");
const elPayPanel = $("#payPanel");
const elInvoicePanel = $("#invoicePanel");
const elResultPanel = $("#resultPanel");
const elSumPaket = $("#sumPaket");
const elSumMetode = $("#sumMetode");
const elSumHarga = $("#sumHarga");
const elPaymentUrl = $("#paymentUrl");
const elStatusText = $("#statusText");
const elDeeplinkWrap = $("#deeplinkWrap");
const elDeeplinkUrl = $("#deeplinkUrl");
const elQrisWrap = $("#qrisWrap");
const elQrisImg = $("#qrisImg");
const elQrisText = $("#qrisText");
const elActivePackages = $("#activePackages");

// ======= INIT =======
elYear.textContent = new Date().getFullYear();
const savedNo = localStorage.getItem("fdz:no_hp");
if (savedNo) elNo.value = savedNo;
loadCatalog();

// ======= EVENTS =======
$("#btnCheckSession").addEventListener("click", onCheckSession);
$("#btnLogout").addEventListener("click", onLogout);
$("#btnRequestOtp").addEventListener("click", onRequestOtp);
$("#btnVerifyOtp").addEventListener("click", onVerifyOtp);
$("#btnReloadCatalog").addEventListener("click", loadCatalog);
$("#btnCekPaketAktif").addEventListener("click", onCekPaketAktif);
$("#btnCekPaketAktif2").addEventListener("click", onCekPaketAktif);
$("#btnCreateInvoice").addEventListener("click", onCreateInvoice);
$("#btnCancelSelection").addEventListener("click", () => {
  SELECTED = null;
  elPayPanel.classList.add("hidden");
  toast("Pilihan paket dibatalkan.");
});
$("#btnRefreshStatus").addEventListener("click", onRefreshStatus);

// ======= FUNCTIONS =======
function ensureNo(){
  const v = normNo(elNo.value);
  if (!v) { toast("Nomor tidak valid. Format: 08xxxxxxxxxx"); return null; }
  localStorage.setItem("fdz:no_hp", v);
  return v;
}

async function onCheckSession(){
  const no = ensureNo(); if (!no) return;
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/session?no_hp=${encodeURIComponent(no)}`);
    const j = await r.json();
    if (j.ok && j.loggedIn){
      elSessionInfo.textContent = `Login: YES (source=${j.source})`;
      elSessionInfo.classList.remove("muted");
      toast("Nomor sudah login.");
    }else{
      elSessionInfo.textContent = `Login: NO`;
      elSessionInfo.classList.add("muted");
      toast(j.message || "Belum login.");
    }
  }catch(e){ toast("Gagal cek session."); }
  finally{ spin(false); }
}

async function onLogout(){
  const no = ensureNo(); if (!no) return;
  if (!confirm("Yakin logout nomor ini? Token akan dihapus.")) return;
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/logout`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ no_hp: no })
    });
    const j = await r.json();
    if (j.ok){ elSessionInfo.textContent = "Logout berhasil."; toast("Logout berhasil."); }
    else toast(j.message || "Logout gagal.");
  }catch(e){ toast("Logout error."); }
  finally{ spin(false); }
}

async function onRequestOtp(){
  const no = ensureNo(); if (!no) return;
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/otp/request`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ no_hp: no })
    });
    const j = await r.json();
    if (j.ok){
      elOtpInfo.textContent = j.data?.can_resend_in ? `Tunggu ${j.data.can_resend_in}s untuk kirim ulang.` : "OTP terkirim.";
      toast(j.message || "OTP terkirim.");
    }else{
      toast(j.message || "Gagal kirim OTP.");
    }
  }catch(e){ toast("OTP request error."); }
  finally{ spin(false); }
}

async function onVerifyOtp(){
  const no = ensureNo(); if (!no) return;
  const kode = $("#kode_otp").value.trim();
  if (!/^\d{4,8}$/.test(kode)){ toast("Kode OTP tidak valid."); return; }
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/otp/verify`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ no_hp: no, kode_otp: kode })
    });
    const j = await r.json();
    if (j.ok){
      elSessionInfo.textContent = `Login: YES`;
      elSessionInfo.classList.remove("muted");
      toast("Login OTP berhasil.");
    }else{
      toast(j.message || "Verifikasi OTP gagal.");
    }
  }catch(e){ toast("OTP verify error."); }
  finally{ spin(false); }
}

async function loadCatalog(){
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/data/kuota/list`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "Gagal load katalog");
    CATALOG = j.data || [];
    renderCatalog();
  }catch(e){
    elCatalog.innerHTML = `<div class="package">Gagal memuat katalog 😢</div>`;
  }finally{ spin(false); }
}

function renderCatalog(){
  if (!CATALOG.length){ elCatalog.innerHTML = `<div class="package">Katalog kosong</div>`; return; }
  elCatalog.innerHTML = "";
  CATALOG.forEach(item => {
    const card = document.createElement("div");
    card.className = "package";
    card.innerHTML = `
      <h3>${esc(item.package_named_show)}</h3>
      <div class="meta">
        <span class="badge">${esc(item.payment_method)}</span>
        <span class="price">${rupiah(item.price_paket_show)}</span>
        <span class="badge">paket_id: ${esc(item.paket_id)}</span>
      </div>
      <div class="desc">${esc(item.desc_package_show).replaceAll("\\n","\n")}</div>
      <div class="inline" style="margin-top:.5rem">
        <button class="btn btn-buy">Pilih</button>
      </div>
    `;
    card.querySelector(".btn-buy").addEventListener("click", () => selectPackage(item));
    elCatalog.appendChild(card);
  });
}

function selectPackage(item){
  SELECTED = { ...item };
  elSumPaket.textContent = item.package_named_show;
  elSumMetode.textContent = item.payment_method;
  elSumHarga.textContent = rupiah(item.price_paket_show);
  elPayPanel.classList.remove("hidden");
  elInvoicePanel.classList.add("hidden");
  elResultPanel.classList.add("hidden");
  CURRENT_ORDER = null;
}

async function onCreateInvoice(){
  if (!SELECTED){ toast("Pilih paket dulu."); return; }
  const no = ensureNo(); if (!no) return;

  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/pay/create`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ no_hp: no, paket_id: SELECTED.paket_id })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "Gagal membuat invoice");
    CURRENT_ORDER = { orderId: j.orderId, paymentUrl: j.paymentUrl };
    elPaymentUrl.href = j.paymentUrl;
    elPaymentUrl.textContent = j.paymentUrl;
    elInvoicePanel.classList.remove("hidden");
    elStatusText.textContent = "PENDING";
    toast("Invoice berhasil dibuat. Silakan lakukan pembayaran.");
    // Mulai poll otomatis sebentar:
    startPollingStatus();
  }catch(e){
    toast(e.message || "Create invoice error");
  }finally{
    spin(false);
  }
}

let pollTimer = null;
function startPollingStatus(){
  stopPolling();
  pollTimer = setInterval(onRefreshStatus, POLL_MS);
}
function stopPolling(){
  if (pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}

async function onRefreshStatus(){
  if (!CURRENT_ORDER){ toast("Belum ada invoice."); return; }
  try{
    const r = await fetch(`${API_BASE}/kuota/pay/status?orderId=${encodeURIComponent(CURRENT_ORDER.orderId)}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "Gagal cek status");
    const st = (j.data?.status || "PENDING").toUpperCase();
    elStatusText.textContent = st;

    if (st === "PAID"){
      // tampilkan upstream result jika ada
      const up = j.data?.upstreamResult || null;
      if (up && up.ok){
        renderUpstreamResult(up);
      }else{
        // mungkin masih diproses: keep polling sebentar
      }
    }
    if (st === "FAILED"){ stopPolling(); toast("Pembayaran gagal."); }
  }catch(e){ /* diamkan, nanti coba lagi next tick */ }
}

function renderUpstreamResult(up){
  stopPolling();
  elResultPanel.classList.remove("hidden");

  const haveDeeplink = !!up.data?.have_deeplink && up.data?.deeplink;
  const isQris = !!up.data?.is_qris;

  // Deeplink
  if (haveDeeplink){
    elDeeplinkUrl.href = up.data.deeplink;
    elDeeplinkUrl.textContent = up.data.deeplink;
    elDeeplinkWrap.classList.remove("hidden");
  }else{
    elDeeplinkWrap.classList.add("hidden");
  }

  // QRIS
  if (isQris && up.data?.qris?.qr_code){
    const qr = up.data.qris.qr_code;
    elQrisImg.src = qrisImgUrl(qr);
    elQrisText.textContent = qr;
    elQrisWrap.classList.remove("hidden");
  }else{
    elQrisWrap.classList.add("hidden");
  }

  toast(up.message || "Forward selesai.");
}

async function onCekPaketAktif(){
  const no = ensureNo(); if (!no) return;
  spin(true);
  try{
    const r = await fetch(`${API_BASE}/kuota/detail?no_hp=${encodeURIComponent(no)}`);
    const j = await r.json();
    if (!j.ok){ throw new Error(j.message || "Gagal mengambil paket aktif"); }
    renderActivePackages(j.data);
  }catch(e){
    elActivePackages.innerHTML = `<div class="empty">Gagal mengambil paket aktif.</div>`;
  }finally{
    spin(false);
  }
}

function renderActivePackages(data){
  const qs = Array.isArray(data?.quotas) ? data.quotas : [];
  if (!qs.length){ elActivePackages.innerHTML = `<div class="empty">Tidak ada paket aktif / tunggu 1 menit dan cek ulang.</div>`; return; }
  elActivePackages.innerHTML = "";
  qs.forEach(q => {
    const div = document.createElement("div");
    div.className = "pkg";
    const benefits = Array.isArray(q.benefits) ? q.benefits : [];
    div.innerHTML = `
      <div class="hdr">
        <div><b>${esc(q.name || "-")}</b></div>
        <div class="muted">${esc(q.expired_at || "-")}</div>
      </div>
      <div class="benefits"></div>
    `;
    const benWrap = div.querySelector(".benefits");
    benefits.forEach(b => {
      const row = document.createElement("div");
      row.className = "benefit";
      row.innerHTML = `
        <div>${esc(b.name)} ${b.information ? `<span class="muted">(${esc(b.information)})</span>` : ""}</div>
        <div>${esc(b.remaining_quota || b.quota || "-")}</div>
      `;
      benWrap.appendChild(row);
    });
    elActivePackages.appendChild(div);
  });
}

// ======= helpers =======
function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
