// js/bug.js — render daftar bug & copy YAML

// ====== DATA BUG ======
const BUGS = [
  // ---------- BUG BIZ ----------
  {
    group: "BIZ",
    name: "BIZ-1-TIMUR-BARAT",
    zones: ["timur", "barat"],
    server: "ava.game.naver.com",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "ava.game.naver.com.wijaya2.vpnluxury.web.id",
    network: "ws",
    path: "/trojan-ws",
    host: "ava.game.naver.com.wijaya2.vpnluxury.web.id",
    udp: true
  },
  {
    group: "BIZ",
    name: "BIZ-2-TIMUR",
    zones: ["timur"],
    server: "104.18.213.235",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "ava.game.naver.com.wijaya2.vpnluxury.web.id",
    network: "ws",
    path: "/trojan-ws",
    host: "ava.game.naver.com.wijaya2.vpnluxury.web.id",
    udp: true
  },
  {
    group: "BIZ",
    name: "BIZ-3-TIMUR-BARAT",
    zones: ["timur", "barat"],
    server: "collection.linefriends.com",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "collection.linefriends.com.wijaya2.vpnluxury.web.id",
    network: "ws",
    path: "/trojan-ws",
    host: "collection.linefriends.com.wijaya2.vpnluxury.web.id",
    udp: true
  },

  // ---------- BUG XCVIP ----------
  {
    group: "XCVIP",
    name: "XCVIP-1-TIMUR",
    zones: ["timur"],
    server: "104.17.3.81",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "wijaya2.vpnluxury.web.id",
    network: "ws",
    path: "/trojan-ws",
    host: "wijaya2.vpnluxury.web.id",
    udp: true
  },
  {
    group: "XCVIP",
    name: "XCVIP-2-TIMUR-BARAT",
    zones: ["timur", "barat"],
    server: "support.zoom.us",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "support.zoom.us.wijaya2.vpnluxury.web.id",
    network: "ws",
    path: "/trojan-ws",
    host: "support.zoom.us.wijaya2.vpnluxury.web.id",
    udp: true
  },
  {
    group: "XCVIP",
    name: "XCVIP-3-BARAT",
    zones: ["barat"],
    server: "wijaya2.vpnluxury.web.id",
    port: 443,
    type: "trojan",
    password: "0199e3d8-5df5-7106-6be0-78c593167854",
    sni: "live.iflix.com",
    network: "ws",
    path: "/trojan-ws",
    host: "wijaya2.vpnluxury.web.id",
    udp: true
  }
];

// ====== HELPERS ======
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

function toYAML(node){
  const lines = [
    `- name: ${node.name}`,
    `  server: ${node.server}`,
    `  port: ${node.port}`,
    `  type: ${node.type}`,
    `  password: ${node.password}`,
    `  skip-cert-verify: true`,
    `  sni: ${node.sni}`,
    `  network: ${node.network}`,
    `  ws-opts:`,
    `    path: ${node.path}`,
    `    headers:`,
    `      Host: ${node.host}`,
    `  udp: ${node.udp ? "true" : "false"}`
  ];
  return lines.join("\n");
}
const listToYAML = list => list.map(toYAML).join("\n\n");
const zoneBadges = zones => {
  const hasBarat = zones.includes("barat");
  const hasTimur = zones.includes("timur");
  let html = "";
  if (hasBarat) html += `<span class="badge-zone badge-barat">Barat</span>`;
  if (hasTimur) html += ` <span class="badge-zone badge-timur">Timur</span>`;
  return html;
};

function createCard(node){
  const card = document.createElement("article");
  card.className = "bug-card";
  card.innerHTML = `
    <div class="d-flex align-items-start justify-content-between">
      <div>
        <div class="bug-title">${node.name}</div>
        <div class="mt-1">${zoneBadges(node.zones)}</div>
      </div>
      <span class="badge rounded-pill text-bg-light border fw-semibold">${node.group}</span>
    </div>

    <div class="meta-list">
      <div class="meta-item"><i class="bi bi-hdd-network"></i> Server: <code>${node.server}</code></div>
      <div class="meta-item"><i class="bi bi-shield-lock"></i> SNI: <code>${node.sni}</code></div>
      <div class="meta-item"><i class="bi bi-diagram-3"></i> Host: <code>${node.host}</code></div>
      <div class="meta-item"><i class="bi bi-slash-square"></i> Path: <code>${node.path}</code></div>
    </div>

    <div class="mt-1 d-flex flex-wrap gap-2">
      <button class="btn btn-sm btn-outline-primary copy-yaml"><i class="bi bi-clipboard-check me-1"></i>Copy YAML</button>
      <button class="btn btn-sm btn-outline-secondary copy-server"><i class="bi bi-clipboard me-1"></i>Server</button>
      <button class="btn btn-sm btn-outline-secondary copy-sni"><i class="bi bi-clipboard me-1"></i>SNI</button>
    </div>
  `;

  $(".copy-yaml", card).addEventListener("click", () => copyText(toYAML(node)));
  $(".copy-server", card).addEventListener("click", () => copyText(node.server));
  $(".copy-sni", card).addEventListener("click", () => copyText(node.sni));

  return card;
}

function copyText(text){
  navigator.clipboard.writeText(text).then(()=>{
    const toastEl = $("#copyToast");
    if (toastEl) new bootstrap.Toast(toastEl, { delay: 1200 }).show();
  });
}

// ====== RENDER & FILTER ======
const STATE = { filtered: BUGS.slice() };

function renderList(list){
  const wrap = $("#bugList");
  const empty = $("#emptyState");
  wrap.innerHTML = "";
  if (!list.length) { empty.classList.remove("d-none"); return; }
  empty.classList.add("d-none");
  list.forEach(item => wrap.appendChild(createCard(item)));
}

function applyFilter(){
  const q = $("#searchInput").value.trim().toLowerCase();
  const tab = $(".btn-tab.active")?.getAttribute("data-filter") || "all";

  let filtered = BUGS.filter(b => {
    if (tab === "BIZ"   && b.group !== "BIZ") return false;
    if (tab === "XCVIP" && b.group !== "XCVIP") return false;
    if (tab === "barat" && !b.zones.includes("barat")) return false;
    if (tab === "timur" && !b.zones.includes("timur")) return false;

    const hay = `${b.name} ${b.group} ${b.server} ${b.sni} ${b.host} ${b.zones.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });

  STATE.filtered = filtered;
  renderList(filtered);
}

function setActiveTab(btn){
  $$(".btn-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}

document.addEventListener("DOMContentLoaded", () => {
  renderList(BUGS);

  $("#searchInput").addEventListener("input", applyFilter);
  $$(".btn-tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn)));

  $("#btnReset").addEventListener("click", () => {
    $("#searchInput").value = "";
    setActiveTab($('[data-filter="all"]'));
  });

  const btnResetEmpty = $("#btnResetEmpty");
  if (btnResetEmpty) btnResetEmpty.addEventListener("click", () => {
    $("#searchInput").value = "";
    setActiveTab($('[data-filter="all"]'));
  });

  $("#btnCopyAll").addEventListener("click", () => {
    const text = listToYAML(STATE.filtered.length ? STATE.filtered : BUGS);
    copyText(text);
  });
});
