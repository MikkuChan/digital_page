// ======================
// IP Locator (robust)
// ======================

// (Opsional) Isi token ipinfo kalau punya. Kalau tidak, biarkan string kosong.
const IPINFO_TOKEN = ""; // contoh: "123abc456"

// Elemen UI
const ipForm        = document.getElementById('ipForm');
const ipInput       = document.getElementById('ipInput');
const lookupBtn     = document.getElementById('lookupBtn');
const resultSection = document.getElementById('resultSection');
const ipCardInfo    = document.getElementById('ipCardInfo');
const errorSection  = document.getElementById('errorSection');
const copyBtn       = document.getElementById('copyResult');
const mapsBtn       = document.getElementById('mapsBtn');

// Toast sederhana
function showToast(msg, ok = true) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = `position-fixed z-3 px-4 py-2 fw-bold rounded-4 ${ok ? 'bg-success' : 'bg-danger'} text-white shadow-lg clash-toast`;
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1400);
  setTimeout(() => { document.body.removeChild(toast); }, 1900);
}

// Emoji bendera dari country code (A-Z)
function flagFromCC(cc) {
  if (!cc) return "🌍";
  return String.fromCodePoint(...cc.toUpperCase().split("").map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

// Validasi dasar IPv4/IPv6 (longgar tapi cukup)
const REG_IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})$/;
const REG_IPV6 = /^([0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$/i;
function looksLikeIP(x) {
  return REG_IPV4.test(x) || REG_IPV6.test(x);
}

// Normalisasi respons dari berbagai provider -> bentuk seragam
function normalizeFrom(provider, data) {
  // Bentuk akhir:
  // { ip, country, country_code, city, region, org, asn, timezone, lat, lon }
  let n = {
    ip: "-", country: "-", country_code: "-", city: "-", region: "-",
    org: "-", asn: "-", timezone: "-", lat: "-", lon: "-"
  };

  if (provider === "ipapi") {
    // https://ipapi.co/{ip}/json/
    // keys: ip, city, region, country_name, country, latitude, longitude, org, asn, timezone
    n.ip = data.ip || "-";
    n.city = data.city || "-";
    n.region = data.region || "-";
    n.country = data.country_name || data.country || "-";
    n.country_code = data.country || "-";
    n.lat = (data.latitude != null) ? String(data.latitude) : "-";
    n.lon = (data.longitude != null) ? String(data.longitude) : "-";
    n.org = data.org || "-";
    n.asn = data.asn || "-";
    n.timezone = data.timezone || "-";
    return n;
  }

  if (provider === "ipinfo") {
    // https://ipinfo.io/{ip}/json?token=...
    // keys: ip, hostname, city, region, country, loc("lat,lon"), org, postal, timezone
    n.ip = data.ip || "-";
    n.city = data.city || "-";
    n.region = data.region || "-";
    n.country_code = data.country || "-";
    n.country = data.country || "-";
    if (data.loc) {
      const [la, lo] = String(data.loc).split(",");
      n.lat = la || "-";
      n.lon = lo || "-";
    }
    n.org = data.org || "-";
    n.asn = data.org ? String(data.org).split(" ")[0] : "-"; // "ASxxxx Company"
    n.timezone = data.timezone || "-";
    return n;
  }

  if (provider === "ipwhois") {
    // https://ipwho.is/{ip}
    // keys: success, ip, city, region, country, country_code, latitude, longitude
    // connection: { org, isp, asn }, timezone: { id }
    if (data && data.success === false) throw new Error(data.message || "Provider ipwho.is gagal.");
    n.ip = data.ip || "-";
    n.city = data.city || "-";
    n.region = data.region || "-";
    n.country = data.country || "-";
    n.country_code = data.country_code || "-";
    n.lat = (data.latitude != null) ? String(data.latitude) : "-";
    n.lon = (data.longitude != null) ? String(data.longitude) : "-";
    n.org = (data.connection && (data.connection.org || data.connection.isp)) || "-";
    n.asn = (data.connection && data.connection.asn) || "-";
    n.timezone = (data.timezone && (data.timezone.id || data.timezone)) || "-";
    return n;
  }

  return n;
}

// Provider fetchers (urutan fallback)
async function fetch_ipapi(ip) {
  const base = "https://ipapi.co/";
  const url = ip ? `${base}${encodeURIComponent(ip)}/json/` : `${base}json/`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`ipapi.co error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || "ipapi.co gagal memproses");
  return normalizeFrom("ipapi", data);
}

async function fetch_ipinfo(ip) {
  const base = "https://ipinfo.io/";
  const tokenPart = IPINFO_TOKEN ? `?token=${encodeURIComponent(IPINFO_TOKEN)}` : "";
  const url = ip ? `${base}${encodeURIComponent(ip)}/json${tokenPart}` : `${base}json${tokenPart}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`ipinfo.io error ${res.status}`);
  const data = await res.json();
  if (!data || (!data.ip && !data.loc)) throw new Error("ipinfo.io respons tidak valid");
  return normalizeFrom("ipinfo", data);
}

async function fetch_ipwhois(ip) {
  const base = "https://ipwho.is/";
  const url = ip ? `${base}${encodeURIComponent(ip)}` : `${base}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`ipwho.is error ${res.status}`);
  const data = await res.json();
  return normalizeFrom("ipwhois", data);
}

async function lookup(ip) {
  // Coba berurutan: ipapi → ipinfo → ipwho.is
  // (ipinfo bisa pakai token kalau ada)
  const attempts = [
    () => fetch_ipapi(ip),
    () => fetch_ipinfo(ip),
    () => fetch_ipwhois(ip),
  ];

  let lastErr = null;
  for (const run of attempts) {
    try {
      return await run();
    } catch (e) {
      lastErr = e;
      // console.warn("[lookup] provider gagal:", e);
      continue;
    }
  }
  throw lastErr || new Error("Semua provider gagal.");
}

// Render hasil ke kartu
function renderResult(n) {
  const flag = flagFromCC(n.country_code);
  let gmap = "";
  if (n.lat !== "-" && n.lon !== "-") {
    gmap = `https://maps.google.com/?q=${encodeURIComponent(n.lat)},${encodeURIComponent(n.lon)}`;
    mapsBtn.classList.remove("d-none");
    mapsBtn.href = gmap;
  } else {
    mapsBtn.classList.add("d-none");
  }

  ipCardInfo.innerHTML = `
    <div class="row-info"><span class="icon"><i class="bi bi-globe"></i></span>
      <span class="key">IP</span>: <span class="val">${n.ip}</span>
    </div>
    <div class="row-info"><span class="icon flag">${flag}</span>
      <span class="key">Negara</span>: <span class="val">${n.country} (${n.country_code})</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-building"></i></span>
      <span class="key">Kota</span>: <span class="val">${n.city}</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-map"></i></span>
      <span class="key">Region</span>: <span class="val">${n.region}</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-bank"></i></span>
      <span class="key">ASN/ORG</span>: <span class="val">${[n.asn, n.org].filter(Boolean).join(" · ")}</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-clock-history"></i></span>
      <span class="key">Timezone</span>: <span class="val">${n.timezone}</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-geo"></i></span>
      <span class="key">Latitude</span>: <span class="val">${n.lat}</span>
    </div>
    <div class="row-info"><span class="icon"><i class="bi bi-geo"></i></span>
      <span class="key">Longitude</span>: <span class="val">${n.lon}</span>
    </div>
  `;
}

// Reset tampilan
function resetUI() {
  ipCardInfo.innerHTML = '';
  errorSection.classList.add("d-none");
  errorSection.textContent = '';
  resultSection.classList.add("d-none");
  mapsBtn.classList.add("d-none");
}

// Submit handler
ipForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = ipInput.value.trim();
  const ip = raw === "" ? "" : raw;

  resetUI();

  // Kalau user mengisi tapi bukan format IP, tetap coba (beberapa provider izinkan hostname).
  // Namun beri peringatan kecil.
  if (ip && !looksLikeIP(ip)) {
    // Boleh hostname, tapi info ke user
    showToast("Input bukan format IP, mencoba resolve…", true);
  }

  lookupBtn.disabled = true;
  lookupBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Proses...`;

  try {
    const data = await lookup(ip);
    renderResult(data);
    resultSection.classList.remove("d-none");
  } catch (err) {
    // Tampilkan error yang ramah
    const msg = (err && err.message) ? String(err.message) : "Gagal mengambil info IP.";
    let pretty = msg;

    // Rapikan pesan umum
    if (/429|rate/i.test(msg)) {
      pretty = "Kena rate limit provider. Coba lagi sebentar, atau isi token ipinfo.";
    } else if (/NetworkError|Failed to fetch|CORS/i.test(msg)) {
      pretty = "Permintaan diblokir jaringan/CORS. Coba refresh atau ganti provider internet.";
    } else if (/Unexpected token|JSON/i.test(msg)) {
      pretty = "Provider mengirim respons tak terduga. Coba lagi.";
    }

    errorSection.textContent = pretty;
    errorSection.classList.remove("d-none");
    resultSection.classList.remove("d-none");
    showToast(pretty, false);
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.innerHTML = `<i class="bi bi-search me-2"></i>Cari Lokasi IP`;
  }
});

// Copy hasil
copyBtn.addEventListener('click', async () => {
  const text = ipCardInfo.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Info IP berhasil disalin!");
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast("Info IP berhasil disalin!");
  }
});
