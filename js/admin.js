// js/admin.js
const API_BASE = "https://api-v1.fadzdigital.dpdns.org"; // Ganti ke domain worker kamu
const ADMIN_TOKEN_KEY = "pinggulnya";

function showAlert(msg, type="success") {
  const el = document.getElementById("adminAlert");
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type} fw-bold">${msg}</div>`;
  setTimeout(()=>el.innerHTML = '', 3000);
}

function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}
function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  location.reload();
}

// --- LOGIN ADMIN ---
document.getElementById("adminLoginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const user = document.getElementById("adminUsername").value.trim();
  const pass = document.getElementById("adminPassword").value.trim();
  if (!user || !pass) return showAlert("Isi semua data", "danger");
  try {
    const res = await fetch(`${API_BASE}/api-admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });
    const data = await res.json();
    if (data.ok && data.token) {
      saveAdminToken(data.token);
      location.reload();
    } else {
      showAlert(data.error || "Gagal login", "danger");
    }
  } catch (e) {
    showAlert("Gagal konek server", "danger");
  }
});

// --- Cek status login ---
window.addEventListener("DOMContentLoaded", async () => {
  if (!getAdminToken()) {
    document.getElementById("adminLoginSection").style.display = "";
    document.getElementById("adminPanelSection").style.display = "none";
    return;
  }
  document.getElementById("adminLoginSection").style.display = "none";
  document.getElementById("adminPanelSection").style.display = "";
  await loadAdminTabs();
});

// --- Ganti tab admin (bootstrap pills) ---
document.querySelectorAll('#adminTabs .nav-link').forEach(el => {
  el.addEventListener("click", function() {
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.style.display = "none");
    document.getElementById(this.dataset.panel).style.display = "";
  });
});

// -------- USER MANAGEMENT --------
async function loadUserList() {
  const res = await fetch(`${API_BASE}/api-admin/list-user`, {
    headers: { Authorization: "Bearer " + getAdminToken() }
  });
  const data = await res.json();
  const tbody = document.getElementById("adminUserTableBody");
  tbody.innerHTML = "";
  for (const u of data.users) {
    let badge = u.status === "active"
      ? `<span class="badge bg-success">Active</span>`
      : `<span class="badge bg-secondary">Pending</span>`;
    tbody.innerHTML += `<tr>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${badge}</td>
      <td>Rp ${u.saldo?.toLocaleString()}</td>
      <td>
        ${u.status !== "active"
          ? `<button class="btn btn-success btn-sm me-1" onclick="approveUser('${u.username}')"><i class="bi bi-check2-circle"></i> Approve</button>` : ""
        }
        <button class="btn btn-info btn-sm me-1" onclick="topupUser('${u.username}')"><i class="bi bi-plus-circle"></i> Topup</button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteUser('${u.username}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }
}

async function approveUser(username) {
  if (!confirm(`Approve ${username}?`)) return;
  const res = await fetch(`${API_BASE}/api-admin/approve-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  if (data.ok) showAlert("Akun di-approve!");
  else showAlert(data.error, "danger");
  await loadUserList();
}

async function topupUser(username) {
  const nominal = prompt("Nominal topup saldo untuk " + username);
  if (!nominal || isNaN(nominal)) return;
  const res = await fetch(`${API_BASE}/api-admin/topup-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ username, nominal: Number(nominal) })
  });
  const data = await res.json();
  if (data.ok) showAlert("Saldo berhasil ditambah!");
  else showAlert(data.error, "danger");
  await loadUserList();
}

async function deleteUser(username) {
  if (!confirm(`Hapus user ${username}?`)) return;
  const res = await fetch(`${API_BASE}/api-admin/delete-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  if (data.ok) showAlert("User dihapus!");
  else showAlert(data.error, "danger");
  await loadUserList();
}

// -------- SERVER & VARIAN MANAGEMENT --------
let editingServer = null;
let editingVarian = null;

async function loadServerList() {
  const res = await fetch(`${API_BASE}/api-admin/list-server`, {
    headers: { Authorization: "Bearer " + getAdminToken() }
  });
  const data = await res.json();
  const tbody = document.getElementById("serverTableBody");
  tbody.innerHTML = "";
  for (const s of data.servers) {
    tbody.innerHTML += `<tr>
      <td>${s.server}</td>
      <td>${s.base_url}</td>
      <td><span class="badge ${s.status === "active" ? "bg-success" : "bg-secondary"}">${s.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm me-1" onclick="showVarianModal('${s.server}')"><i class="bi bi-list"></i> Varian</button>
        <button class="btn btn-warning btn-sm me-1" onclick="showEditServerModal('${s.server}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteServer('${s.server}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }
}

async function showEditServerModal(server) {
  editingServer = null;
  let s = null;
  if (server) {
    const res = await fetch(`${API_BASE}/api-admin/list-server`, { headers: { Authorization: "Bearer " + getAdminToken() }});
    const data = await res.json();
    s = data.servers.find(x=>x.server===server);
    editingServer = s;
  }
  document.getElementById("serverModalTitle").textContent = s ? "Edit Server" : "Tambah Server";
  document.getElementById("serverNameInput").value = s?.server || "";
  document.getElementById("serverBaseUrlInput").value = s?.base_url || "";
  document.getElementById("serverStatusInput").value = s?.status || "active";
  document.getElementById("serverAuthkeyInput").value = s?.authkey || "";
  new bootstrap.Modal(document.getElementById("serverModal")).show();
}

async function saveServer() {
  const server = document.getElementById("serverNameInput").value.trim();
  const base_url = document.getElementById("serverBaseUrlInput").value.trim();
  const status = document.getElementById("serverStatusInput").value;
  const authkey = document.getElementById("serverAuthkeyInput").value.trim();
  if (!server || !base_url || !authkey) return showAlert("Lengkapi data", "danger");
  const res = await fetch(`${API_BASE}/api-admin/add-server`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ server, base_url, status, authkey })
  });
  const data = await res.json();
  if (data.ok) showAlert("Server disimpan!");
  else showAlert(data.error, "danger");
  bootstrap.Modal.getInstance(document.getElementById("serverModal")).hide();
  await loadServerList();
}

async function deleteServer(server) {
  if (!confirm(`Hapus server ${server}?`)) return;
  const res = await fetch(`${API_BASE}/api-admin/delete-server`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ server })
  });
  const data = await res.json();
  if (data.ok) showAlert("Server dihapus!");
  else showAlert(data.error, "danger");
  await loadServerList();
}

async function showVarianModal(server) {
  // Load varian per server
  editingServer = server;
  const res = await fetch(`${API_BASE}/api-admin/list-server`, { headers: { Authorization: "Bearer " + getAdminToken() }});
  const data = await res.json();
  const s = data.servers.find(x=>x.server===server);
  document.getElementById("varianServerName").textContent = server;
  const tbody = document.getElementById("varianTableBody");
  tbody.innerHTML = "";
  for (const v of (s.varians || [])) {
    tbody.innerHTML += `<tr>
      <td>${v.name}</td>
      <td>${v.exp} hari</td>
      <td>${v.quota} GB</td>
      <td>${v.iplimit}</td>
      <td>Rp ${v.price?.toLocaleString()}</td>
      <td>${v.description||""}</td>
      <td>
        <button class="btn btn-warning btn-sm me-1" onclick="showEditVarianModal('${v.name}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteVarian('${v.name}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }
  new bootstrap.Modal(document.getElementById("varianModal")).show();
}

async function showEditVarianModal(varianName) {
  editingVarian = null;
  let s = await fetch(`${API_BASE}/api-admin/list-server`, { headers: { Authorization: "Bearer " + getAdminToken() }})
    .then(r=>r.json()).then(d=>d.servers.find(x=>x.server===editingServer));
  let v = s.varians.find(x=>x.name===varianName);
  editingVarian = v;
  document.getElementById("varianNameInput").value = v?.name || "";
  document.getElementById("varianExpInput").value = v?.exp || "";
  document.getElementById("varianQuotaInput").value = v?.quota || "";
  document.getElementById("varianIplimitInput").value = v?.iplimit || "";
  document.getElementById("varianPriceInput").value = v?.price || "";
  document.getElementById("varianDescInput").value = v?.description || "";
  new bootstrap.Modal(document.getElementById("varianEditModal")).show();
}

async function saveVarian() {
  let s = await fetch(`${API_BASE}/api-admin/list-server`, { headers: { Authorization: "Bearer " + getAdminToken() }})
    .then(r=>r.json()).then(d=>d.servers.find(x=>x.server===editingServer));
  let varians = s.varians || [];
  const name = document.getElementById("varianNameInput").value.trim();
  const exp = +document.getElementById("varianExpInput").value;
  const quota = +document.getElementById("varianQuotaInput").value;
  const iplimit = +document.getElementById("varianIplimitInput").value;
  const price = +document.getElementById("varianPriceInput").value;
  const description = document.getElementById("varianDescInput").value.trim();
  if (!name || !exp || !quota || !iplimit || !price) return showAlert("Isi lengkap data varian", "danger");
  // Edit jika ada, kalau tidak, tambah
  let idx = varians.findIndex(v=>v.name===name);
  const newVarian = { name, exp, quota, iplimit, price, description };
  if (idx >= 0) varians[idx] = newVarian;
  else varians.push(newVarian);
  // Save ke server
  await fetch(`${API_BASE}/api-admin/save-varian`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ server: editingServer, varian: newVarian })
  });
  bootstrap.Modal.getInstance(document.getElementById("varianEditModal")).hide();
  await showVarianModal(editingServer);
}

async function deleteVarian(name) {
  if (!confirm(`Hapus varian ${name}?`)) return;
  await fetch(`${API_BASE}/api-admin/delete-varian`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getAdminToken() },
    body: JSON.stringify({ server: editingServer, name })
  });
  await showVarianModal(editingServer);
}

// --------- LOG & PENDAPATAN ---------
async function loadLogList() {
  const hari = new Date().toISOString().slice(0,10);
  const res = await fetch(`${API_BASE}/api-admin/log?hari=${hari}`, {
    headers: { Authorization: "Bearer " + getAdminToken() }
  });
  const data = await res.json();
  document.getElementById("pendapatanHariIni").textContent = "Rp " + (data.pendapatan?.toLocaleString() || "0");
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";
  for (const l of data.logs.sort((a,b)=>b.ts-a.ts)) {
    tbody.innerHTML += `<tr>
      <td>${l.tipe}</td>
      <td>${l.username}</td>
      <td>${l.server}</td>
      <td>${l.varian}</td>
      <td>Rp ${l.harga?.toLocaleString()}</td>
      <td>${new Date(l.ts).toLocaleString("id-ID")}</td>
    </tr>`;
  }
}

// --- Load All Tabs After Login ---
async function loadAdminTabs() {
  await loadUserList();
  await loadServerList();
  await loadLogList();
}

// --- Logout btn
document.getElementById("adminLogoutBtn")?.addEventListener("click", logoutAdmin);

// -- Save server & varian btn
document.getElementById("serverSaveBtn")?.addEventListener("click", saveServer);
document.getElementById("varianSaveBtn")?.addEventListener("click", saveVarian);
