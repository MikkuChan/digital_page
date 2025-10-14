// ====== KONFIG WIFI (EDIT DI SINI) ======
const WIFI_24 = { ssid: "warkop",    pass: "0199e474-92d5-7eeb-e945-698bc762fde5", security: "WPA" };
const WIFI_5G = { ssid: "warkop_5G", pass: "0199e474-92d5-7eeb-e945-698bc762fde5", security: "WPA" };

// ====== HELPERS ======
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

function wifiQRString({ssid, pass, security="WPA", hidden=false}){
  // Format standar: WIFI:T:WPA;S:MySSID;P:mypassword;H:false;;
  const esc = (v)=> String(v).replace(/([\\;,:"])/g,"\\$1");
  return `WIFI:T:${security};S:${esc(ssid)};P:${esc(pass)};H:${hidden?'true':'false'};;`;
}

function drawQR(canvasId, text){
  if (!window.QRCode) return; // lib belum kebaca
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  QRCode.toCanvas(canvas, text, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M"
  }, (err)=>{ if (err) console.error(err); });
}

function copyText(text){
  navigator.clipboard.writeText(text).then(()=>{
    const toastEl = $("#copyToast");
    if (toastEl) new bootstrap.Toast(toastEl, { delay: 1200 }).show();
  });
}

function toggleEye(btn){
  const targetId = btn.getAttribute("data-target");
  const input = document.getElementById(targetId);
  if (!input) return;
  const isPwd = input.getAttribute("type")==="password";
  input.setAttribute("type", isPwd ? "text" : "password");
  btn.innerHTML = `<i class="bi ${isPwd ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", ()=>{
  // Isi SSID & Password ke UI
  $("#ssid24").textContent = WIFI_24.ssid;
  $("#pass24").value       = WIFI_24.pass;
  $("#ssid5").textContent  = WIFI_5G.ssid;
  $("#pass5").value        = WIFI_5G.pass;

  // Generate QR
  drawQR("qr24", wifiQRString(WIFI_24));
  drawQR("qr5",  wifiQRString(WIFI_5G));

  // Toggle eye
  $$(".toggle-eye").forEach(btn => btn.addEventListener("click", ()=>toggleEye(btn)));

  // Copy per input
  $$(".copy-btn").forEach(btn => {
    btn.addEventListener("click", ()=>{
      const src = btn.getAttribute("data-copy");
      const el = document.getElementById(src);
      if (el) copyText(el.value);
    });
  });
  $$(".copy-ssid").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-src");
      const el = document.getElementById(id);
      if (el) copyText(el.textContent);
    });
  });
  $$(".copy-pass").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-src");
      const el = document.getElementById(id);
      if (el) copyText(el.value);
    });
  });

  // Copy semua
  $("#copyAll").addEventListener("click", ()=>{
    const lines = [
      `Wi-Fi 2.4G: ${WIFI_24.ssid} | Pass: ${WIFI_24.pass}`,
      `Wi-Fi 5G  : ${WIFI_5G.ssid} | Pass: ${WIFI_5G.pass}`
    ].join("\n");
    copyText(lines);
  });

  // Print kartu
  $("#printCards").addEventListener("click", ()=> window.print());

  // QRIS actions
  const qrisImg = $("#qrisImg");
  const dl = $("#downloadQris");
  if (qrisImg && dl) dl.href = qrisImg.getAttribute("src");
  $("#printQris").addEventListener("click", ()=> window.print());
});
