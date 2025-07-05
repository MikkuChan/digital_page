// iplocator.js

function showToast(msg) {
  let toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4 bg-success text-white shadow-lg clash-toast";
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1200);
  setTimeout(() => { document.body.removeChild(toast); }, 1750);
}

const ipForm = document.getElementById('ipForm');
const ipInput = document.getElementById('ipInput');
const lookupBtn = document.getElementById('lookupBtn');
const resultSection = document.getElementById('resultSection');
const ipCardInfo = document.getElementById('ipCardInfo');
const errorSection = document.getElementById('errorSection');
const copyBtn = document.getElementById('copyResult');
const mapsBtn = document.getElementById('mapsBtn');
let endpoint = "";

fetch('json/api.json')
  .then(res => res.json())
  .then(json => { endpoint = json.iplocator.endpoint; });

ipForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const ip = ipInput.value.trim();
  ipCardInfo.innerHTML = '';
  errorSection.style.display = "none";
  resultSection.style.display = "none";
  mapsBtn.classList.add("d-none");

  if (!ip) {
    showToast("Masukkan IP address dulu!");
    ipInput.focus();
    return;
  }
  lookupBtn.disabled = true;
  lookupBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Proses...`;

  fetch(endpoint + encodeURIComponent(ip))
    .then(res => res.json())
    .then(data => {
      if (!data.ipInfo || data.ipInfo.ip !== ip) throw new Error("IP tidak ditemukan atau format tidak valid.");
      const d = data.ipInfo;
      // emoji flag unicode dari country code
      const flag = d.country_code
        ? String.fromCodePoint(...[...d.country_code.toUpperCase()].map(c=>0x1F1E6-65+c.charCodeAt()))
        : "🌍";
      // Google Maps URL
      let gmap = "";
      if (d.latitude && d.longitude) {
        gmap = `https://maps.google.com/?q=${d.latitude},${d.longitude}`;
        mapsBtn.classList.remove("d-none");
        mapsBtn.href = gmap;
      } else {
        mapsBtn.classList.add("d-none");
      }

      ipCardInfo.innerHTML = `
        <div class="row-info"><span class="icon"><i class="bi bi-globe"></i></span>
          <span class="key">IP</span>: <span class="val">${d.ip}</span>
        </div>
        <div class="row-info"><span class="icon flag">${flag}</span>
          <span class="key">Negara</span>: <span class="val">${d.country_name || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-building"></i></span>
          <span class="key">Kota</span>: <span class="val">${d.city || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-map"></i></span>
          <span class="key">Region</span>: <span class="val">${d.region || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-bank"></i></span>
          <span class="key">ASN</span>: <span class="val">${d.asn || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-diagram-3"></i></span>
          <span class="key">Provider</span>: <span class="val">${d.org || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-clock-history"></i></span>
          <span class="key">Timezone</span>: <span class="val">${d.timezone || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-geo"></i></span>
          <span class="key">Latitude</span>: <span class="val">${d.latitude || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-geo"></i></span>
          <span class="key">Longitude</span>: <span class="val">${d.longitude || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-currency-exchange"></i></span>
          <span class="key">Mata Uang</span>: <span class="val">${d.currency_name || "-"} (${d.currency || "-"})</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-telephone"></i></span>
          <span class="key">Kode Telp</span>: <span class="val">${d.country_calling_code || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-bookmark"></i></span>
          <span class="key">Network</span>: <span class="val">${d.network || "-"}</span>
        </div>
        <div class="row-info"><span class="icon"><i class="bi bi-translate"></i></span>
          <span class="key">Bahasa</span>: <span class="val">${d.languages || "-"}</span>
        </div>
      `;
      resultSection.style.display = "block";
    })
    .catch(err => {
      errorSection.innerHTML = `<span class="text-danger">${err.message || "Gagal mengambil info IP."}</span>`;
      errorSection.style.display = "block";
    })
    .finally(() => {
      lookupBtn.disabled = false;
      lookupBtn.innerHTML = `<i class="bi bi-search me-2"></i>Cari Lokasi IP`;
    });
});

copyBtn.onclick = function() {
  // Copy versi "ringkas" bukan kode HTML
  const info = Array.from(ipCardInfo.querySelectorAll('.row-info'))
    .map(row => row.innerText.replace(/\n/g, ' '))
    .join('\n');
  if (!info) return;
  navigator.clipboard.writeText(info);
  showToast("Info IP berhasil disalin!");
};
