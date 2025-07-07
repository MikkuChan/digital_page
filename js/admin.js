// js/admin.js
const API_BASE = "https://api-v1.fadzdigital.dpdns.org";
const ADMIN_TOKEN_KEY = "fadzdigital_admin_token";

// --- UTILS ---
function showNotif(msg, type = "success") {
  const c = document.createElement("div");
  c.className = `alert alert-${type} fade show position-fixed`;
  c.style = "top: 90px; right: 20px; min-width: 240px; z-index: 1999; box-shadow:0 8px 32px #0001";
  c.innerHTML = msg;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 3000);
}

// --- LOGIN HANDLER ---
const loginSection = document.getElementById("adminLoginSection");
const panelSection = document.getElementById("adminPanelSection");
const loginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("adminLoginError");
const logoutBtn = document.getElementById("adminLogoutBtn");

function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}
function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// --- ON LOAD, CEK LOGIN ---
if (getAdminToken()) {
  showPanel();
} else {
  showLogin();
}

function showLogin() {
  loginSection.style.display = "";
  panelSection.style.display = "none";
}
function showPanel() {
  loginSection.style.display = "none";
  panelSection.style.display = "";
  loadUserList();
  loadServerList();
  loadLog();
}

// --- LOGIN FORM SUBMIT ---
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  loginError.classList.add("d-none");
  loginForm.querySelector("button").disabled = true;
  const username = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value.trim();
  try {
    const res = await fetch(API_BASE + "/api-admin/list-user", {
      headers: {
        Authorization: "Bearer " + btoa(username + ":" + password + ":pinggulnya")
      }
    });
    if (res.status === 403) throw new Error("Username/password salah.");
    if (!res.ok) throw new Error("Gagal login admin.");
    // --- LOGIN: worker cuma cek token, manual cek user/pw di sini ---
    // Dapat token: encode base64(username:password:pinggulnya)
    saveAdminToken(btoa(username + ":" + password + ":pinggulnya"));
    showPanel();
    showNotif("Berhasil login sebagai admin!");
    loginForm.reset();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove("d-none");
  }
  loginForm.querySelector("button").disabled = false;
};

// --- LOGOUT ---
logoutBtn.onclick = () => {
  clearAdminToken();
  showLogin();
  showNotif("Logout admin.", "info");
};

// --- NAV TABS HANDLER ---
document.querySelectorAll("#adminTabs .nav-link").forEach(btn => {
  btn.onclick = function () {
    document.querySelectorAll("#adminTabs .nav-link").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    const tab = this.dataset.tab;
    document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.add("d-none"));
    document.getElementById("tab-" + tab).classList.remove("d-none");
    if (tab === "user") loadUserList();
    if (tab === "server") loadServerList();
    if (tab === "log") loadLog();
  }
});

// --- API CALLER ---
async function callApi(path, opts = {}) {
  const headers = opts.headers || {};
  headers.Authorization = "Bearer " + getAdminToken();
  if (opts.json) {
    opts.body = JSON.stringify(opts.json);
    headers["Content-Type"] = "application/json";
    delete opts.json;
  }
  opts.headers = headers;
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) {
    let msg = "Error API";
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ====================
// 1. USER MANAGEMENT
// ====================
async function loadUserList() {
  const tbody = document.querySelector("#adminUserTable tbody");
  tbody.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Loading...</td></tr>";
  try {
    const { users } = await callApi("/api-admin/list-user");
    if (!users.length) {
      tbody.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Tidak ada user.</td></tr>";
      return;
    }
    tbody.innerHTML = "";
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.status === "active" ? "<span class='badge bg-success'>active</span>" : "<span class='badge bg-warning text-dark'>pending</span>"}</td>
        <td>Rp ${u.saldo?.toLocaleString() || 0}</td>
        <td>
          ${u.status !== "active"
            ? `<button class="btn btn-success btn-sm" data-approve="${u.username}"><i class="bi bi-check-circle"></i> Approve</button>`
            : "<span class='text-muted'>-</span>"
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-approve]").forEach(btn => {
      btn.onclick = async function () {
        btn.disabled = true;
        try {
          await callApi("/api-admin/approve-user", {
            method: "POST",
            json: { username: btn.dataset.approve }
          });
          showNotif("User di-approve!");
          loadUserList();
        } catch (e) {
          showNotif(e.message, "danger");
        }
        btn.disabled = false;
      };
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan='5' class='text-center text-danger'>${e.message}</td></tr>`;
  }
}

// ====================
// 2. SERVER MANAGEMENT
// ====================
async function loadServerList() {
  const wrap = document.getElementById("adminServerList");
  wrap.innerHTML = "<div class='text-center text-muted'>Loading...</div>";
  try {
    const { servers } = await callApi("/api-admin/list-server");
    if (!servers.length) {
      wrap.innerHTML = "<div class='text-center text-muted'>Belum ada server terdaftar.</div>";
      return;
    }
    wrap.innerHTML = "";
    servers.forEach(s => {
      const card = document.createElement("div");
      card.className = "admin-server-card shadow-sm p-3 mb-3";
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <span class="fw-bold fs-5">${s.server}</span>
            <span class="badge ${s.status === "active" ? "bg-success" : "bg-secondary"} ms-2">${s.status}</span>
          </div>
          <div>
            <button class="btn btn-primary btn-sm me-1" data-edit-server="${s.server}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-danger btn-sm" data-delete-server="${s.server}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <div class="mb-1"><b>API:</b> <span class="text-muted">${s.base_url}</span></div>
        <div class="mb-2"><b>Auth Key:</b> <span class="text-muted">${s.authkey}</span></div>
        <div>
          <b>Varian:</b>
          <button class="btn btn-success btn-sm ms-2" data-add-varian="${s.server}"><i class="bi bi-plus-circle"></i> Tambah Varian</button>
          <ul class="list-group mt-2">
            ${s.varians && s.varians.length
              ? s.varians.map(v =>
                `<li class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <b>${v.name}</b> &bull; <span class="text-muted">${v.desc || ""}</span>
                    <br><small>Exp: ${v.exp} hari, Quota: ${v.quota}GB, IP: ${v.iplimit}, Harga: Rp${v.price?.toLocaleString()}</small>
                  </div>
                  <span>
                    <button class="btn btn-primary btn-sm me-1" data-edit-varian='${JSON.stringify({ ...v, server: s.server })}'><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-danger btn-sm" data-delete-varian='${JSON.stringify({ server: s.server, name: v.name })}'><i class="bi bi-trash"></i></button>
                  </span>
                </li>`).join("")
              : "<li class='list-group-item text-muted'>Belum ada varian.</li>"
            }
          </ul>
        </div>
      `;
      wrap.appendChild(card);
    });

    // Edit & delete server
    wrap.querySelectorAll("[data-edit-server]").forEach(btn => {
      btn.onclick = () => openServerModal("edit", servers.find(s => s.server === btn.dataset.editServer));
    });
    wrap.querySelectorAll("[data-delete-server]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Hapus server ini?")) return;
        btn.disabled = true;
        try {
          await callApi("/api-admin/delete-server", {
            method: "POST",
            json: { server: btn.dataset.deleteServer }
          });
          showNotif("Server dihapus!");
          loadServerList();
        } catch (e) {
          showNotif(e.message, "danger");
        }
        btn.disabled = false;
      };
    });
    // Add varian
    wrap.querySelectorAll("[data-add-varian]").forEach(btn => {
      btn.onclick = () => openVarianModal("add", { server: btn.dataset.addVarian });
    });
    // Edit & delete varian
    wrap.querySelectorAll("[data-edit-varian]").forEach(btn => {
      btn.onclick = () => openVarianModal("edit", JSON.parse(btn.dataset.editVarian));
    });
    wrap.querySelectorAll("[data-delete-varian]").forEach(btn => {
      btn.onclick = async () => {
        const data = JSON.parse(btn.dataset.deleteVarian);
        if (!confirm("Hapus varian '" + data.name + "'?")) return;
        btn.disabled = true;
        try {
          await callApi("/api-admin/delete-varian", {
            method: "POST",
            json: { server: data.server, name: data.name }
          });
          showNotif("Varian dihapus!");
          loadServerList();
        } catch (e) {
          showNotif(e.message, "danger");
        }
        btn.disabled = false;
      };
    });
  } catch (e) {
    wrap.innerHTML = `<div class='text-danger text-center'>${e.message}</div>`;
  }
}

// --- SERVER MODAL (Tambah/Edit) ---
const serverModal = new bootstrap.Modal(document.getElementById("serverModal"));
document.getElementById("addServerBtn").onclick = () => openServerModal("add");
function openServerModal(mode, data = {}) {
  document.getElementById("serverFormMode").value = mode;
  document.getElementById("serverModalLabel").textContent = mode === "add" ? "Tambah Server" : "Edit Server";
  document.getElementById("serverName").value = data.server || "";
  document.getElementById("serverName").readOnly = mode !== "add";
  document.getElementById("serverBaseUrl").value = data.base_url || "";
  document.getElementById("serverAuthKey").value = data.authkey || "";
  document.getElementById("serverStatus").value = data.status || "active";
  serverModal.show();
}
document.getElementById("serverForm").onsubmit = async function (e) {
  e.preventDefault();
  const mode = document.getElementById("serverFormMode").value;
  const server = document.getElementById("serverName").value.trim();
  const base_url = document.getElementById("serverBaseUrl").value.trim();
  const authkey = document.getElementById("serverAuthKey").value.trim();
  const status = document.getElementById("serverStatus").value;
  if (!server || !base_url || !authkey) return showNotif("Semua field wajib diisi", "danger");
  try {
    await callApi("/api-admin/" + (mode === "add" ? "add-server" : "add-server"), {
      method: "POST",
      json: { server, base_url, authkey, status }
    });
    showNotif((mode === "add" ? "Tambah" : "Update") + " server sukses!");
    loadServerList();
    serverModal.hide();
  } catch (e) {
    showNotif(e.message, "danger");
  }
};

// --- VARIAN MODAL (Tambah/Edit) ---
const varianModal = new bootstrap.Modal(document.getElementById("varianModal"));
function openVarianModal(mode, data = {}) {
  document.getElementById("varianModalLabel").textContent = mode === "add" ? "Tambah Varian" : "Edit Varian";
  document.getElementById("varianServerName").value = data.server || "";
  document.getElementById("varianName").value = data.name || "";
  document.getElementById("varianName").readOnly = mode !== "add";
  document.getElementById("varianExp").value = data.exp || "";
  document.getElementById("varianQuota").value = data.quota || "";
  document.getElementById("varianIpLimit").value = data.iplimit || "";
  document.getElementById("varianPrice").value = data.price || "";
  document.getElementById("varianDesc").value = data.desc || "";
  varianModal.show();
}
document.getElementById("varianForm").onsubmit = async function (e) {
  e.preventDefault();
  const server = document.getElementById("varianServerName").value;
  const name = document.getElementById("varianName").value.trim();
  const exp = +document.getElementById("varianExp").value;
  const quota = +document.getElementById("varianQuota").value;
  const iplimit = +document.getElementById("varianIpLimit").value;
  const price = +document.getElementById("varianPrice").value;
  const desc = document.getElementById("varianDesc").value;
  if (!server || !name || !exp || !quota || !iplimit || !price) return showNotif("Semua field wajib diisi!", "danger");
  try {
    await callApi("/api-admin/save-varian", {
      method: "POST",
      json: { server, varian: { name, exp, quota, iplimit, price, desc } }
    });
    showNotif("Varian disimpan!");
    loadServerList();
    varianModal.hide();
  } catch (e) {
    showNotif(e.message, "danger");
  }
};

// ====================
// 3. LOG / PENDAPATAN
// ====================
async function loadLog() {
  const logTable = document.getElementById("logTable").querySelector("tbody");
  const dateInput = document.getElementById("logDate");
  const pendapatanEl = document.getElementById("pendapatanHariIni");
  logTable.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Loading...</td></tr>";
  let hari = dateInput.value || (new Date().toISOString().slice(0, 10));
  try {
    const { logs, pendapatan } = await callApi("/api-admin/log?hari=" + hari);
    pendapatanEl.textContent = "Rp " + (pendapatan || 0).toLocaleString();
    if (!logs.length) {
      logTable.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Belum ada log.</td></tr>";
      return;
    }
    // sort terbaru
    logs.sort((a, b) => b.ts - a.ts);
    logTable.innerHTML = "";
    logs.forEach(log => {
      const dt = new Date(log.ts);
      logTable.innerHTML += `
        <tr>
          <td>${dt.toLocaleString("id-ID")}</td>
          <td>${log.username}</td>
          <td>${log.server}</td>
          <td>${log.varian}</td>
          <td>Rp ${(log.harga||0).toLocaleString()}</td>
          <td>${log.tipe}</td>
        </tr>`;
    });
  } catch (e) {
    logTable.innerHTML = `<tr><td colspan='6' class='text-center text-danger'>${e.message}</td></tr>`;
  }
}
document.getElementById("logDate").onchange = loadLog;
