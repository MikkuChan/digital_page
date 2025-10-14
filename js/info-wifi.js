// ====== KONFIG WIFI (EDIT DI SINI SAJA) ======
const WIFI_24 = { ssid: "warkop",    pass: "0199e474-92d5-7eeb-e945-698bc762fde5", security: "WPA" };
const WIFI_5G = { ssid: "warkop_5G", pass: "0199e474-92d5-7eeb-e945-698bc762fde5", security: "WPA" };

// ====== UTIL ======
const $  = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
const esc = v => String(v).replace(/([\\;,:"])/g,"\\$1");
const wifiString = ({ssid, pass, security="WPA", hidden=false}) =>
  `WIFI:T:${security};S:${esc(ssid)};P:${esc(pass)};H:${hidden?'true':'false'};;`;

function copyText(text){
  navigator.clipboard.writeText(text).catch(()=>{});
}

function drawQR(canvasId, imgId, text){
  const canvas = document.getElementById(canvasId);
  const img = document.getElementById(imgId);
  // Jika library qrcode tersedia, pakai canvas; kalau tidak, fallback img API
  if (window.QRCode && canvas){
    QRCode.toCanvas(canvas, text, { margin:1, width:220, errorCorrectionLevel:"M" }, ()=>{});
  } else if (img){
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`;
    img.src = url;
    img.classList.remove("d-none");
    if (canvas) canvas.classList.add("d-none");
  }
}

function toggleEye(btn){
  const id = btn.getAttribute("data-target");
  const input = document.getElementById(id);
  if (!input) return;
  const isPwd = input.type === "password";
  input.type = isPwd ? "text" : "password";
  btn.innerHTML = `<i class="bi ${isPwd ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
}

// ====== INIT (scoped ke #wifiPage supaya aman) ======
document.addEventListener("DOMContentLoaded", ()=>{
  const root = document.getElementById("wifiPage");
  if (!root) return; // halaman lain, skip

  // isi data
  $("#ssid24", root).textContent = WIFI_24.ssid;
  $("#pass24", root).value       = WIFI_24.pass;
  $("#ssid5",  root).textContent = WIFI_5G.ssid;
  $("#pass5",  root).value       = WIFI_5G.pass;

  // QR
  drawQR("qr24", "qr24img", wifiString(WIFI_24));
  drawQR("qr5",  "qr5img",  wifiString(WIFI_5G));

  // eye/copy
  $$(".wifi-toggle", root).forEach(btn => btn.addEventListener("click", ()=>toggleEye(btn)));
  $$(".wifi-copy", root).forEach(btn => {
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-src");
      const el = document.getElementById(id);
      if (el) copyText(el.value);
    });
  });
  $$(".wifi-copy-text", root).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-text-src");
      const el = document.getElementById(id);
      if (el) copyText(el.textContent);
    });
  });

  // QRIS actions
  const qrisImg = $("#qrisImg", root);
  const dl = $("#downloadQris", root);
  if (qrisImg && dl) dl.href = qrisImg.getAttribute("src");
  const printBtn = $("#printQris", root);
  if (printBtn) printBtn.addEventListener("click", ()=> window.print());
});
