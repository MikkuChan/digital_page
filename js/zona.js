/**
 * zona.js — Pembagian Zona Koneksi Indonesia
 * Version: 1.0
 */

(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const API_MAIN = "https://www.emsifa.com/api-wilayah-indonesia/api";
  const API_LOCAL = "/data";

  // Mapping zona per provinsi (38 provinsi Indonesia)
  const PROVINCE_ZONE = {
    // ZONA BARAT
    "Aceh": "barat",
    "Sumatera Utara": "barat",
    "Sumatera Barat": "barat",
    "Riau": "barat",
    "Kepulauan Riau": "barat",
    "Jambi": "barat",
    "Bengkulu": "barat",
    "Sumatera Selatan": "barat",
    "Kepulauan Bangka Belitung": "barat",
    "Lampung": "barat",
    "DKI Jakarta": "barat",
    "Banten": "barat",
    "Jawa Barat": "barat",
    "Kalimantan Barat": "barat",

    // ZONA TIMUR
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

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const STATE = {
    rows: [],
    filtered: [],
    isLoading: false
  };

  // ============================================================================
  // DOM HELPERS
  // ============================================================================
  
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Get zone for a province
   */
  function getZone(provinceName) {
    // Direct match first
    if (PROVINCE_ZONE[provinceName]) {
      return PROVINCE_ZONE[provinceName];
    }
    
    // Try case-insensitive match
    const normalizedName = provinceName.trim();
    for (const [key, value] of Object.entries(PROVINCE_ZONE)) {
      if (key.toLowerCase() === normalizedName.toLowerCase()) {
        return value;
      }
    }
    
    // Log warning for unmapped provinces
    console.warn(`Province "${provinceName}" not found in mapping, defaulting to timur`);
    
    return "timur";
  }

  /**
   * Create zone badge HTML
   */
  function zoneBadge(zone) {
    const icon = zone === "barat" ? "sunset" : "sunrise";
    const label = zone === "barat" ? "Barat" : "Timur";
    return `<span class="badge-zone badge-${zone}"><i class="bi bi-${icon} me-1"></i>${label}</span>`;
  }

  /**
   * Fetch JSON with error handling
   */
  async function fetchJSON(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on ${url}`);
    }
    return response.json();
  }

  /**
   * Load provinces from API
   */
  async function loadProvinces() {
    // Try main API
    try {
      return await fetchJSON(`${API_MAIN}/provinces.json`);
    } catch (error) {
      console.warn("Main API failed, trying local...", error);
    }

    // Try local API
    try {
      return await fetchJSON(`${API_LOCAL}/provinces.json`);
    } catch (error) {
      console.warn("Local API failed, using fallback data...", error);
    }

    // Fallback seed data
    return [
      { id: "11", name: "Aceh" },
      { id: "12", name: "Sumatera Utara" },
      { id: "13", name: "Sumatera Barat" },
      { id: "14", name: "Riau" },
      { id: "15", name: "Jambi" },
      { id: "16", name: "Sumatera Selatan" },
      { id: "17", name: "Bengkulu" },
      { id: "18", name: "Lampung" },
      { id: "19", name: "Kepulauan Bangka Belitung" },
      { id: "21", name: "Kepulauan Riau" },
      { id: "31", name: "DKI Jakarta" },
      { id: "32", name: "Jawa Barat" },
      { id: "33", name: "Jawa Tengah" },
      { id: "34", name: "DI Yogyakarta" },
      { id: "35", name: "Jawa Timur" },
      { id: "36", name: "Banten" },
      { id: "51", name: "Bali" },
      { id: "52", name: "Nusa Tenggara Barat" },
      { id: "53", name: "Nusa Tenggara Timur" },
      { id: "61", name: "Kalimantan Barat" },
      { id: "62", name: "Kalimantan Tengah" },
      { id: "63", name: "Kalimantan Selatan" },
      { id: "64", name: "Kalimantan Timur" },
      { id: "65", name: "Kalimantan Utara" },
      { id: "71", name: "Sulawesi Utara" },
      { id: "72", name: "Sulawesi Tengah" },
      { id: "73", name: "Sulawesi Selatan" },
      { id: "74", name: "Sulawesi Tenggara" },
      { id: "75", name: "Gorontalo" },
      { id: "76", name: "Sulawesi Barat" },
      { id: "81", name: "Maluku" },
      { id: "82", name: "Maluku Utara" },
      { id: "91", name: "Papua" },
      { id: "92", name: "Papua Barat" }
    ];
  }

  /**
   * Load regencies for a province
   */
  async function loadRegencies(provinceId) {
    // Try main API
    try {
      return await fetchJSON(`${API_MAIN}/regencies/${provinceId}.json`);
    } catch (error) {
      console.warn(`Main API failed for province ${provinceId}`, error);
    }

    // Try local API
    try {
      return await fetchJSON(`${API_LOCAL}/regencies/${provinceId}.json`);
    } catch (error) {
      console.warn(`Local API failed for province ${provinceId}`, error);
    }

    // Fallback seed data for common provinces
    const seedData = {
      "11": [
        { id: "1101", name: "Kab. Aceh Selatan" },
        { id: "1102", name: "Kab. Aceh Tenggara" },
        { id: "1103", name: "Kab. Aceh Timur" },
        { id: "1171", name: "Kota Banda Aceh" },
        { id: "1172", name: "Kota Sabang" },
        { id: "1173", name: "Kota Lhokseumawe" }
      ],
      "31": [
        { id: "3171", name: "Jakarta Pusat" },
        { id: "3172", name: "Jakarta Utara" },
        { id: "3173", name: "Jakarta Barat" },
        { id: "3174", name: "Jakarta Selatan" },
        { id: "3175", name: "Jakarta Timur" }
      ],
      "32": [
        { id: "3201", name: "Kab. Bogor" },
        { id: "3204", name: "Kab. Bandung" },
        { id: "3273", name: "Kota Bandung" },
        { id: "3275", name: "Kota Bekasi" },
        { id: "3276", name: "Kota Depok" },
        { id: "3277", name: "Kota Cimahi" }
      ],
      "33": [
        { id: "3301", name: "Kab. Cilacap" },
        { id: "3302", name: "Kab. Banyumas" },
        { id: "3371", name: "Kota Magelang" },
        { id: "3372", name: "Kota Surakarta" },
        { id: "3373", name: "Kota Salatiga" },
        { id: "3374", name: "Kota Semarang" }
      ],
      "35": [
        { id: "3515", name: "Kab. Sidoarjo" },
        { id: "3525", name: "Kab. Gresik" },
        { id: "3573", name: "Kota Malang" },
        { id: "3578", name: "Kota Surabaya" },
        { id: "3579", name: "Kota Batu" }
      ],
      "51": [
        { id: "5103", name: "Kab. Badung" },
        { id: "5108", name: "Kab. Buleleng" },
        { id: "5171", name: "Kota Denpasar" }
      ]
    };

    return seedData[provinceId] || [];
  }

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  /**
   * Render table with data
   */
  function renderTable(data) {
    const tbody = $("#zonaTableBody");
    const empty = $("#emptyState");
    const tableWrap = $("#tableWrap");

    if (!tbody || !empty || !tableWrap) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
      tableWrap.classList.add("d-none");
      empty.classList.remove("d-none");
      updateResultCount(0);
      return;
    }

    tableWrap.classList.remove("d-none");
    empty.classList.add("d-none");

    data.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-zone", item.zone);
      tr.style.animationDelay = `${index * 0.03}s`;

      // Limit cities to show (max 8 for better UX)
      const citiesToShow = item.cities.slice(0, 8);
      const hasMore = item.cities.length > 8;

      const cityChips = citiesToShow
        .map(c => `<span class="city-chip"><i class="bi bi-geo-alt"></i>${c.name}</span>`)
        .join("");

      const moreChip = hasMore
        ? `<span class="city-chip city-chip-more">+${item.cities.length - 8} lainnya</span>`
        : "";

      tr.innerHTML = `
        <td class="fw-semibold">
          <div class="province-name">${item.prov}</div>
        </td>
        <td>
          <div class="city-chips-wrapper">
            ${cityChips}${moreChip}
          </div>
        </td>
        <td>
          ${zoneBadge(item.zone)}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Update stats
    updateStats(data);
    updateResultCount(data.length);

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== "undefined") {
      const tooltips = $$('[data-bs-toggle="tooltip"]');
      tooltips.forEach(el => new bootstrap.Tooltip(el));
    }
  }

  /**
   * Update statistics
   */
  function updateStats(data) {
    const statProv = $("#statProv");
    const statCities = $("#statCities");
    const statBarat = $("#statBarat");
    const statTimur = $("#statTimur");

    if (statProv) statProv.textContent = data.length;
    if (statCities) {
      const totalCities = data.reduce((sum, item) => sum + item.cities.length, 0);
      statCities.textContent = totalCities;
    }
    if (statBarat) {
      const baratCount = data.filter(x => x.zone === "barat").length;
      statBarat.textContent = baratCount;
    }
    if (statTimur) {
      const timurCount = data.filter(x => x.zone === "timur").length;
      statTimur.textContent = timurCount;
    }
  }

  /**
   * Update result count
   */
  function updateResultCount(count) {
    const resultCount = $("#resultCount");
    if (resultCount) {
      resultCount.textContent = count;
    }
  }

  // ============================================================================
  // FILTER FUNCTIONS
  // ============================================================================
  
  /**
   * Apply filters (search + zone filter)
   */
  function applyFilter() {
    const searchInput = $("#searchInput");
    const activeTab = $(".filter-btn.active");

    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    const zoneFilter = activeTab ? activeTab.getAttribute("data-filter") : "all";

    STATE.filtered = STATE.rows.filter(row => {
      // Zone filter
      const zoneMatch = zoneFilter === "all" || row.zone === zoneFilter;
      if (!zoneMatch) return false;

      // Search filter
      if (!query) return true;

      const provMatch = row.prov.toLowerCase().includes(query);
      const cityMatch = row.cities.some(c => c.name.toLowerCase().includes(query));

      return provMatch || cityMatch;
    });

    renderTable(STATE.filtered);
  }

  /**
   * Set active tab
   */
  function setActiveTab(button) {
    const tabs = $$(".filter-btn");
    tabs.forEach(tab => tab.classList.remove("active"));
    button.classList.add("active");
    applyFilter();
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    const searchInput = $("#searchInput");
    const allTab = $('[data-filter="all"]');

    if (searchInput) searchInput.value = "";
    if (allTab) setActiveTab(allTab);
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  /**
   * Load all data
   */
  async function loadAll() {
    if (STATE.isLoading) return;

    STATE.isLoading = true;
    const tbody = $("#zonaTableBody");

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center py-5">
            <div class="spinner-border text-primary me-2" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2 text-muted">Memuat data provinsi & kab/kota seluruh Indonesia…</div>
          </td>
        </tr>
      `;
    }

    try {
      // Load provinces
      const provinces = await loadProvinces();
      console.log(`Loaded ${provinces.length} provinces`);

      // Load regencies for each province
      const rows = await Promise.all(
        provinces.map(async prov => {
          console.log(`Processing: "${prov.name}"`); // Debug log
          const zone = getZone(prov.name);
          console.log(`  → Zone: ${zone}`); // Debug log
          const cities = await loadRegencies(prov.id);

          // Sort cities alphabetically
          cities.sort((a, b) => a.name.localeCompare(b.name, "id"));

          return {
            prov: prov.name,
            zone,
            cities: cities.map(c => ({ id: c.id, name: c.name }))
          };
        })
      );

      // Sort rows: Barat first, then Timur; then alphabetically
      rows.sort((a, b) => {
        if (a.zone === b.zone) {
          return a.prov.localeCompare(b.prov, "id");
        }
        return a.zone === "barat" ? -1 : 1;
      });

      STATE.rows = rows;
      STATE.filtered = rows;

      renderTable(rows);
      console.log(`Successfully loaded ${rows.length} provinces with cities`);

    } catch (error) {
      console.error("Failed to load data:", error);

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="3" class="text-center py-5 text-danger">
              <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
              <div class="fw-bold mb-2">Gagal memuat data wilayah</div>
              <div class="small text-muted mb-3">
                Terjadi kesalahan saat mengambil data dari server.
              </div>
              <button class="btn btn-primary btn-sm" onclick="location.reload()">
                <i class="bi bi-arrow-clockwise me-1"></i>Muat Ulang
              </button>
            </td>
          </tr>
        `;
      }
    } finally {
      STATE.isLoading = false;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    // Search input
    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", applyFilter);
    }

    // Tab buttons
    const tabs = $$(".filter-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => setActiveTab(tab));
    });

    // Reset buttons
    const btnReset = $("#btnReset");
    const btnResetEmpty = $("#btnResetEmpty");

    if (btnReset) {
      btnReset.addEventListener("click", resetFilters);
    }

    if (btnResetEmpty) {
      btnResetEmpty.addEventListener("click", resetFilters);
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape to reset filters
      if (e.key === "Escape") {
        resetFilters();
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize app
   */
  function init() {
    console.log("Initializing Zona app...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initEventListeners();
        loadAll();
      });
    } else {
      initEventListeners();
      loadAll();
    }
  }

  // Start the app
  init();

})();