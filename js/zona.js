// js/zona.js — versi "lengkap seluruh kab/kota" (auto fetch)
const WILDCARD_BARAT = "ava.game.naver.com";
const IP_TIMUR = ["104.18.213.235", "104.18.214.235"];

// Sumber data wilayah (statis, CORS-ready, cepat)
const API_BASE = "https://www.emsifa.com/api-wilayah-indonesia/api"; // provinsi, kab/kota, dst. :contentReference[oaicite:0]{index=0}

// Mapping ZONA per provinsi (nama persis sesuai API)
const PROVINCE_ZONE = {
  // BARAT
  "Aceh": "barat",
  "Sumatera Utara": "barat",
  "Sumatera Barat": "barat",
  "Riau": "barat",
  "Kepulauan Riau": "barat",
  "Jambi": "barat",
  "Bengkulu": "barat",
  "Sumatera Selatan": "barat",
  "Lampung": "barat",
  "DKI Jakarta": "barat",
  "Banten": "barat",
  "Jawa Barat": "barat",
  "Kalimantan Barat": "barat",

  // TIMUR
  "Jawa Tengah": "timur",
  "DI Yogyakarta": "timur",
  "Jawa Timur": "timur",
  "Bali": "timur",
  "Nusa Tenggara Barat": "timur",
  "Nusa Tenggara Timur": "timur",
  "Kalimantan Tengah": "timur",
  "Kalimantan Selatan": "timur",
  "Kalimantan Timur": "timur",
  "Kalimantan Utara": "timur",
  "Sulawesi Utara": "timur",
  "Gorontalo": "timur",
  "Sulawesi Tengah": "timur",
  "Sulawesi Barat": "timur",
  "Sulawesi Selatan": "timur",
  "Sulawesi Tenggara": "timur",
  "Maluku": "timur",
  "Maluku Utara": "timur",
  "Papua": "timur",
  "Papua Barat": "timur",
  "Papua Barat Daya": "timur",
  "Papua Tengah": "timur",
  "Papua Pegunungan": "timur",
  "Papua Selatan": "timur"
};

// Helpers
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const STATE = {
  rows: [],     // [{prov, zone, cities:[...], bug}]
  filtered: []
};

function zoneBug(zone) {
  if (zone === "barat") return WILDCARD_BARAT;
  return IP_TIMUR.join(", ");
}

function zoneBadge(zone) {
  return zone === "barat"
    ? `<span class="badge-zone badge-barat">Barat</span>`
    : `<span class="badge-zone badge-timur">Timur</span>`;
}

function bugDisplay(zone) {
  return zone === "barat"
    ? `<span class="copy-badge">${WILDCARD_BARAT}</span>`
    : `<span class="copy-badge">${IP_TIMUR[0]}</span> <span class="copy-badge">•</span> <span class="copy-badge">${IP_TIMUR[1]}</span>`;
}

function renderTable(data) {
  const tbody = $("#zonaTableBody");
  const empty = $("#emptyState");
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-zone", item.zone);

    const cityChips = item.cities
      .map(c => `<span class="city-chip"><i class="bi bi-geo-alt"></i>${c.name}</span>`)
      .join(" ");

    tr.innerHTML = `
      <td class="fw-semibold">${item.prov}</td>
      <td>${cityChips}</td>
      <td>${zoneBadge(item.zone)}</td>
      <td>${bugDisplay(item.zone)}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary copy-btn" data-copy="${zoneBug(item.zone)}">
            <i class="bi bi-clipboard"></i> Copy
          </button>
          <button class="btn btn-sm btn-outline-secondary ping-btn" data-zone="${item.zone}">
            <i class="bi bi-speedometer2"></i> Ping Tips
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Stats
  $("#statProv").textContent = data.length;
  $("#statBarat").textContent = data.filter(x => x.zone === "barat").length;
  $("#statTimur").textContent = data.filter(x => x.zone === "timur").length;
  const cityCount = data.reduce((acc, it) => acc + it.cities.length, 0);
  $("#statCities").textContent = cityCount;

  empty.classList.toggle("d-none", data.length > 0);
  $$('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
}

function applyFilter() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const active = $(".btn-tab.active")?.getAttribute("data-filter") || "all";

  STATE.filtered = STATE.rows.filter(row => {
    const zoneOk = active === "all" ? true : row.zone === active;
    if (!zoneOk) return false;

    if (!query) return true;

    const provOk  = row.prov.toLowerCase().includes(query);
    const kotaOk  = row.cities.some(c => c.name.toLowerCase().includes(query));
    return provOk || kotaOk;
  });

  renderTable(STATE.filtered);
}

function setActiveTab(btn) {
  $$(".btn-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}

// --- Loader: ambil semua provinsi lalu semua kab/kota ---
async function loadAll() {
  // Skeleton loading
  $("#zonaTableBody").innerHTML = `
    <tr><td colspan="5" class="text-center py-5 text-muted">
      <div class="spinner-border me-2" role="status" aria-hidden="true"></div>
      Memuat data provinsi & kota/kab seluruh Indonesia…
    </td></tr>
  `;

  const provs = await fetch(`${API_BASE}/provinces.json`).then(r => r.json()); // [{id, name}] :contentReference[oaicite:1]{index=1}

  // Fetch paralel kab/kota per provinsi
  const rows = await Promise.all(provs.map(async (p) => {
    const zone = PROVINCE_ZONE[p.name] || "timur"; // default timur jika belum terpetakan
    const cities = await fetch(`${API_BASE}/regencies/${p.id}.json`).then(r => r.json()); // [{id, province_id, name}] :contentReference[oaicite:2]{index=2}
    // Sort alfabetis biar rapi
    cities.sort((a,b) => a.name.localeCompare(b.name, "id"));
    return {
      prov: p.name,
      zone,
      bug: zoneBug(zone),
      cities: cities.map(c => ({ id: c.id, name: c.name }))
    };
  }));

  // Urutkan provinsi: barat dulu lalu timur, lalu alfabet
  rows.sort((a,b) => {
    if (a.zone !== b.zone) return a.zone === "barat" ? -1 : 1;
    return a.prov.localeCompare(b.prov, "id");
  });

  STATE.rows = rows;
  STATE.filtered = rows;
  renderTable(rows);
}

if (window.AOS && typeof AOS.init === 'function') {
  AOS.init({ once: true, duration: 600, easing: 'ease-out' });
}

// ---- Events ----
document.addEventListener("DOMContentLoaded", () => {
  // Init load
  loadAll().catch(err => {
    console.error(err);
    $("#zonaTableBody").innerHTML = `
      <tr><td colspan="5" class="text-center py-5 text-danger">
        Gagal memuat data wilayah. Coba refresh (Ctrl/Cmd+R).
      </td></tr>
    `;
  });

  // Search
  $("#searchInput").addEventListener("input", applyFilter);

  // Tabs
  $$(".btn-tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn)));

  // Reset
  $("#btnReset").addEventListener("click", () => {
    $("#searchInput").value = "";
    setActiveTab($('[data-filter="all"]'));
  });
  const btnResetEmpty = $("#btnResetEmpty");
  if (btnResetEmpty) {
    btnResetEmpty.addEventListener("click", () => {
      $("#searchInput").value = "";
      setActiveTab($('[data-filter="all"]'));
      window.scrollTo({ top: document.querySelector('.zona-toolbar')?.offsetTop || 0, behavior: 'smooth' });
    });
  }

  // Delegation: copy & ping
  document.body.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn) {
      const val = copyBtn.getAttribute("data-copy");
      navigator.clipboard.writeText(val).then(() => {
        // pakai toast kalau ada (zona.html revamp include toast)
        const toastEl = $("#copyToast");
        if (toastEl) new bootstrap.Toast(toastEl, { delay: 1200 }).show();
        else {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = `<i class="bi bi-check2-circle"></i> Tersalin!`;
          setTimeout(() => (copyBtn.innerHTML = orig), 1200);
        }
      });
    }

    const pingBtn = e.target.closest(".ping-btn");
    if (pingBtn) {
      const zone = pingBtn.getAttribute("data-zone");
      if (zone === "barat") {
        alert(`Tips Ping (Zona Barat):\n1) Buka Command Prompt/Terminal\n2) Jalankan: ping ${WILDCARD_BARAT}\n3) Pilih latensi paling kecil (ms).`);
      } else {
        alert(`Tips Ping (Zona Timur):\n1) Buka Command Prompt/Terminal\n2) Jalankan:\n   ping ${IP_TIMUR[0]}\n   ping ${IP_TIMUR[1]}\n3) Pilih latensi paling kecil (ms).`);
      }
    }
  });
});
