/**
 * js/zona.js — versi lengkap (auto-fetch seluruh provinsi & kab/kota)
 * - Sumber data utama: API wilayah Indonesia (JSON statis)
 * - Fallback: /data/provinces.json & /data/regencies/<id>.json (jika kamu host lokal)
 * - Last-resort: seed minimal agar halaman tetap hidup meski offline total
 */

const WILDCARD_BARAT = "ava.game.naver.com";
const IP_TIMUR = ["104.18.213.235", "104.18.214.235"];

// Sumber data (utama & fallback)
const API_MAIN = "https://www.emsifa.com/api-wilayah-indonesia/api";
const API_LOCAL = "/data"; // siapkan jika mau offline penuh: /data/provinces.json & /data/regencies/<id>.json

// Mapping ZONA per provinsi (38 provinsi) — ubah di sini jika ada pengecualian
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

// ---- Helpers DOM
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const STATE = { rows: [], filtered: [] };

function zoneBug(zone) { return zone === "barat" ? WILDCARD_BARAT : IP_TIMUR.join(", "); }
function zoneBadge(zone) {
  return zone === "barat" ? `<span class="badge-zone badge-barat">Barat</span>` : `<span class="badge-zone badge-timur">Timur</span>`;
}
function bugDisplay(zone) {
  return zone === "barat"
    ? `<span class="copy-badge">${WILDCARD_BARAT}</span>`
    : `<span class="copy-badge">${IP_TIMUR[0]}</span> <span class="copy-badge">•</span> <span class="copy-badge">${IP_TIMUR[1]}</span>`;
}

// ---- Render
function renderTable(data) {
  const tbody = $("#zonaTableBody");
  const empty = $("#emptyState");
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-zone", item.zone);
    const cityChips = item.cities.map(c => `<span class="city-chip"><i class="bi bi-geo-alt"></i>${c.name}</span>`).join(" ");

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
  const q = $("#searchInput").value.trim().toLowerCase();
  const active = $(".btn-tab.active")?.getAttribute("data-filter") || "all";

  STATE.filtered = STATE.rows.filter(row => {
    const zoneOk = active === "all" ? true : row.zone === active;
    if (!zoneOk) return false;
    if (!q) return true;
    return row.prov.toLowerCase().includes(q) || row.cities.some(c => c.name.toLowerCase().includes(q));
  });

  renderTable(STATE.filtered);
}
function setActiveTab(btn) {
  $$(".btn-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}

// ---- Data Loader (dengan fallback)
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

async function loadProvinces() {
  // coba sumber utama
  try { return await fetchJSON(`${API_MAIN}/provinces.json`); }
  catch { /* fallback lokal */ }
  try { return await fetchJSON(`${API_LOCAL}/provinces.json`); }
  catch {
    // seed minimal (last resort) — biar halaman gak blank
    return [
      { id: "11", name: "Aceh" },
      { id: "31", name: "DKI Jakarta" },
      { id: "32", name: "Jawa Barat" },
      { id: "33", name: "Jawa Tengah" },
      { id: "35", name: "Jawa Timur" },
      { id: "51", name: "Bali" },
    ];
  }
}

async function loadRegencies(provId) {
  // utama
  try { return await fetchJSON(`${API_MAIN}/regencies/${provId}.json`); }
  catch { /* fallback lokal */ }
  try { return await fetchJSON(`${API_LOCAL}/regencies/${provId}.json`); }
  catch {
    // minimal fallback per beberapa provinsi umum
    const seed = {
      "11": [ {id:"1101", name:"Kota Banda Aceh"}, {id:"1102", name:"Kota Lhokseumawe"} ],
      "31": [ {id:"3171", name:"Jakarta Pusat"}, {id:"3172", name:"Jakarta Selatan"}, {id:"3173", name:"Jakarta Barat"}, {id:"3174", name:"Jakarta Timur"}, {id:"3175", name:"Jakarta Utara"} ],
      "32": [ {id:"3273", name:"Kota Bekasi"}, {id:"3279", name:"Kota Depok"}, {id:"3277", name:"Kota Cimahi"}, {id:"3275", name:"Kota Bogor"} ],
      "33": [ {id:"3374", name:"Kota Semarang"}, {id:"3372", name:"Kota Surakarta"}, {id:"3301", name:"Kab. Cilacap"} ],
      "35": [ {id:"3578", name:"Kota Surabaya"}, {id:"3573", name:"Kota Malang"}, {id:"3515", name:"Kab. Sidoarjo"} ],
      "51": [ {id:"5171", name:"Kota Denpasar"}, {id:"5103", name:"Kab. Badung"} ],
    };
    return seed[provId] || [];
  }
}

async function loadAll() {
  $("#zonaTableBody").innerHTML = `
    <tr><td colspan="5" class="text-center py-5 text-muted">
      <div class="spinner-border me-2" role="status" aria-hidden="true"></div>
      Memuat data provinsi & kab/kota seluruh Indonesia…
    </td></tr>
  `;

  const provs = await loadProvinces(); // [{id,name}]
  const rows = await Promise.all(provs.map(async p => {
    const zone = PROVINCE_ZONE[p.name] || "timur";
    const cities = await loadRegencies(p.id); // [{id,name}]
    cities.sort((a,b) => a.name.localeCompare(b.name, "id"));
    return { prov: p.name, zone, bug: zoneBug(zone), cities: cities.map(c => ({id:c.id, name:c.name})) };
  }));

  // urutkan: barat dulu, baru timur; lalu alfabet
  rows.sort((a,b) => (a.zone === b.zone ? a.prov.localeCompare(b.prov, "id") : (a.zone === "barat" ? -1 : 1)));

  STATE.rows = rows;
  STATE.filtered = rows;
  renderTable(rows);
}

// ---- Events
document.addEventListener("DOMContentLoaded", () => {
  // Init load
  loadAll().catch(err => {
    console.error(err);
    $("#zonaTableBody").innerHTML = `
      <tr><td colspan="5" class="text-center py-5 text-danger">
        Gagal memuat data wilayah. Coba refresh (Ctrl/Cmd+R) atau siapkan data lokal di <code>/data</code>.
      </td></tr>
    `;
  });

  // Search
  $("#searchInput").addEventListener("input", applyFilter);

  // Tabs
  $$(".btn-tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn)));

  // Reset
  $("#btnReset").addEventListener("click", () => { $("#searchInput").value=""; setActiveTab($('[data-filter="all"]')); });
  const btnResetEmpty = $("#btnResetEmpty");
  if (btnResetEmpty) btnResetEmpty.addEventListener("click", () => { $("#searchInput").value=""; setActiveTab($('[data-filter="all"]')); });

  // Delegation: copy & ping
  document.body.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn) {
      const val = copyBtn.getAttribute("data-copy");
      navigator.clipboard.writeText(val).then(() => {
        const toastEl = $("#copyToast");
        if (toastEl) new bootstrap.Toast(toastEl, { delay: 1200 }).show();
      });
    }

    const pingBtn = e.target.closest(".ping-btn");
    if (pingBtn) {
      const zone = pingBtn.getAttribute("data-zone");
      if (zone === "barat") {
        alert(`Tips Ping (Zona Barat):\n1) Buka Terminal/Command Prompt\n2) Jalankan: ping ${WILDCARD_BARAT}\n3) Pilih latensi paling kecil (ms).`);
      } else {
        alert(`Tips Ping (Zona Timur):\n1) Buka Terminal/Command Prompt\n2) Jalankan:\n   ping ${IP_TIMUR[0]}\n   ping ${IP_TIMUR[1]}\n3) Pilih latensi paling kecil (ms).`);
      }
    }
  });
});
