const API_BASE = "https://apifadz-worker.YOURDOMAIN.workers.dev"; // GANTI ke worker-mu!
const ADMIN_TOKEN_KEY = "fadzdigital_admin_token";

// --- Alert Helper
function showAlert(msg, type="info", target="#adminAlert", timeout=2300) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} fw-bold`;
  alert.innerHTML = msg;
  document.querySelector(target).innerHTML = "";
  document.querySelector(target).appendChild(alert);
  if (timeout) setTimeout(()=>alert.remove(), timeout);
}

// --- Save Token Helper
function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// --- LOGIN FORM HANDLER
document.getElementById("adminLoginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const user = document.getElementById("adminUsername").value.trim();
  const pass = document.getElementById("adminPassword").value.trim();
  if (!user || !pass) return showAlert("Isi username & password!", "danger");
  document.getElementById("loginBtn").disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api-admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });
    const data = await res.json();
    if (data.ok && data.token) {
      saveAdminToken(data.token);
      showAlert("Login berhasil!", "success");
      setTimeout(()=>location.reload(), 900);
    } else {
      showAlert(data.error || "Login gagal!", "danger");
    }
  } catch (err) {
    showAlert("Gagal koneksi!", "danger");
  }
  document.getElementById("loginBtn").disabled = false;
});

// --- LOGOUT HANDLER
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  clearAdminToken();
  showAlert("Logged out!", "success");
  setTimeout(()=>location.reload(), 800);
});

// --- AUTHTOKEN CHECKER
async function checkAdminAuth() {
  const token = getAdminToken();
  if (!token) return false;
  // Optionally, bisa cek ke /api-admin/check atau cukup token statis (ADMIN_TOKEN)
  return true;
}

// --- INIT PANEL (AFTER LOGIN)
async function loadAdminPanel() {
  document.getElementById("adminLoginSection").classList.add("d-none");
  document.getElementById("adminPanelSection").classList.remove("d-none");
  document.getElementById("logoutBtn").classList.remove("d-none");
  // Load user list (default)
  await loadUserTab();
  // Tab switching
  document.querySelectorAll("#adminTab .nav-link").forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll("#adminTab .nav-link").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-tab").forEach(tab => tab.classList.add("d-none"));
      document.getElementById("tab-" + btn.dataset.tab).classList.remove("d-none");
      if (btn.dataset.tab === "user") loadUserTab();
      if (btn.dataset.tab === "server") loadServerTab();
      if (btn.dataset.tab === "varian") loadVarianTab();
      if (btn.dataset.tab === "log") loadLogTab();
    }
  });
}

// ---- ACC USER TAB ----
async function loadUserTab() {
  const el = document.getElementById("tab-user");
  el.innerHTML = `<div class="text-center my-4 text-muted"><i class="bi bi-hourglass-split"></i> Loading user ...</div>`;
  try {
    const res = await fetch(`${API_BASE}/api-admin/list-user`, {
      headers: { Authorization: "Bearer " + getAdminToken() }
    });
    const data = await res.json();
    if (data.ok && data.users) {
      let html = `<h4>User Terdaftar</h4><table class="table table-striped mt-3"><thead>
        <tr><th>Username</th><th>Email</th><th>Status</th><th>Saldo</th><th>Action</th></tr></thead><tbody>`;
      data.users.forEach(u => {
        html += `<tr>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${u.status === "active" ? `<span class="badge bg-success">active</span>` : `<span class="badge bg-warning">pending</span>`}</td>
          <td>Rp ${u.saldo?.toLocaleString()||0}</td>
          <td>${u.status!=="active"?`<button class="btn btn-sm btn-primary accBtn" data-username="${u.username}">ACC</button>`:"-"}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      el.innerHTML = html;
      document.querySelectorAll(".accBtn").forEach(btn => {
        btn.onclick = async function() {
          const username = btn.dataset.username;
          btn.disabled = true;
          await fetch(`${API_BASE}/api-admin/approve-user`, {
            method: "POST",
            headers: {
              Authorization: "Bearer " + getAdminToken(),
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ username })
          });
          showAlert("Akun di-approve!", "success");
          setTimeout(loadUserTab, 700);
        }
      });
    } else {
      el.innerHTML = `<div class="alert alert-danger">Gagal load user!</div>`;
    }
  } catch {
    el.innerHTML = `<div class="alert alert-danger">Error koneksi!</div>`;
  }
}

// ---- MANAGE SERVER TAB ----
async function loadServerTab() {
  const el = document.getElementById("tab-server");
  el.innerHTML = `<div class="text-center my-4 text-muted"><i class="bi bi-hourglass-split"></i> Loading server ...</div>`;
  try {
    const res = await fetch(`${API_BASE}/api-admin/list-server`, {
      headers: { Authorization: "Bearer " + getAdminToken() }
    });
    const data = await res.json();
    if (data.ok && data.servers) {
      let html = `<h4>Server List</h4>
        <table class="table mt-2"><thead><tr><th>Server</th><th>Base URL</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
      data.servers.forEach(s => {
        html += `<tr>
          <td>${s.server}</td>
          <td>${s.base_url}</td>
          <td>${s.status==="active"?'<span class="badge bg-success">active</span>':'<span class="badge bg-secondary">nonaktif</span>'}</td>
          <td><button class="btn btn-danger btn-sm delServerBtn" data-server="${s.server}"><i class="bi bi-trash"></i></button></td>
        </tr>`;
      });
      html += `</tbody></table>
        <h5 class="mt-4 mb-2">Tambah Server Baru</h5>
        <form id="addServerForm" class="row g-2 align-items-end">
          <div class="col-md-3"><input class="form-control" name="server" placeholder="ID Server" required></div>
          <div class="col-md-4"><input class="form-control" name="base_url" placeholder="Base URL" required></div>
          <div class="col-md-3"><input class="form-control" name="authkey" placeholder="Authkey" required></div>
          <div class="col-md-2"><button type="submit" class="btn btn-primary w-100">Tambah</button></div>
        </form>`;
      el.innerHTML = html;
      document.getElementById("addServerForm")?.addEventListener("submit", async e=>{
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.status = "active";
        await fetch(`${API_BASE}/api-admin/add-server`, {
          method: "POST",
          headers: { Authorization: "Bearer " + getAdminToken(), "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        showAlert("Server ditambah", "success");
        setTimeout(loadServerTab, 700);
      });
      document.querySelectorAll(".delServerBtn").forEach(btn=>{
        btn.onclick = async function(){
          if(confirm("Yakin hapus server ini?")) {
            await fetch(`${API_BASE}/api-admin/delete-server`, {
              method: "POST",
              headers: { Authorization: "Bearer " + getAdminToken(), "Content-Type": "application/json" },
              body: JSON.stringify({ server: btn.dataset.server })
            });
            showAlert("Server dihapus!", "success");
            setTimeout(loadServerTab, 700);
          }
        }
      });
    } else {
      el.innerHTML = `<div class="alert alert-danger">Gagal load server!</div>`;
    }
  } catch {
    el.innerHTML = `<div class="alert alert-danger">Error koneksi!</div>`;
  }
}

// ---- VARIAN TAB ----
async function loadVarianTab() {
  const el = document.getElementById("tab-varian");
  el.innerHTML = `<div class="text-center my-4 text-muted"><i class="bi bi-hourglass-split"></i> Loading ...</div>`;
  // Pilih server
  try {
    const res = await fetch(`${API_BASE}/api-admin/list-server`, {
      headers: { Authorization: "Bearer " + getAdminToken() }
    });
    const data = await res.json();
    if (data.ok && data.servers) {
      let html = `<h5>Pilih Server:</h5><select id="varianServerSelect" class="form-select mb-3" style="max-width:330px;">`;
      data.servers.forEach(s=>{
        html += `<option value="${s.server}">${s.server}</option>`;
      });
      html += `</select>
        <div id="varianListWrap"></div>
        <button class="btn btn-success my-2" id="addVarianBtn"><i class="bi bi-plus-lg"></i> Tambah Varian</button>
        <div id="addEditVarianFormWrap"></div>`;
      el.innerHTML = html;
      // --- on change
      document.getElementById("varianServerSelect").onchange = ()=>loadVarianList();
      document.getElementById("addVarianBtn").onclick = ()=>showAddEditVarianForm();
      loadVarianList();
    } else {
      el.innerHTML = `<div class="alert alert-danger">Gagal load server!</div>`;
    }
  } catch {
    el.innerHTML = `<div class="alert alert-danger">Error koneksi!</div>`;
  }
}

async function loadVarianList() {
  const server = document.getElementById("varianServerSelect").value;
  const res = await fetch(`${API_BASE}/api-admin/list-server`, {
    headers: { Authorization: "Bearer " + getAdminToken() }
  });
  const data = await res.json();
  let s = data.servers.find(x=>x.server===server);
  let listHtml = `<h6>Varian pada server: <b>${server}</b></h6>`;
  if (!s || !Array.isArray(s.varians) || !s.varians.length) {
    listHtml += `<div class="alert alert-warning">Belum ada varian</div>`;
  } else {
    listHtml += `<table class="table table-bordered"><thead><tr>
      <th>Nama</th><th>Exp</th><th>Quota</th><th>IP</th><th>Harga</th><th>Keterangan</th><th>Action</th></tr></thead><tbody>`;
    s.varians.forEach(v=>{
      listHtml += `<tr>
        <td>${v.name}</td>
        <td>${v.exp} hari</td>
        <td>${v.quota}GB</td>
        <td>${v.iplimit}</td>
        <td>Rp ${v.price?.toLocaleString()||0}</td>
        <td>${v.desc||''}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="showAddEditVarianForm('${v.name}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteVarian('${v.name}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
    listHtml += `</tbody></table>`;
  }
  document.getElementById("varianListWrap").innerHTML = listHtml;
}

window.showAddEditVarianForm = function(varianName="") {
  const server = document.getElementById("varianServerSelect").value;
  fetch(`${API_BASE}/api-admin/list-server`, {
    headers: { Authorization: "Bearer " + getAdminToken() }
  })
  .then(res=>res.json())
  .then(data=>{
    let s = data.servers.find(x=>x.server===server);
    let v = (s.varians||[]).find(x=>x.name===varianName) || {};
    let html = `<form id="addEditVarianForm" class="row g-2 align-items-end border rounded p-3 mb-3">
      <div class="col-md-2"><input class="form-control" name="name" value="${v.name||''}" placeholder="Nama" required></div>
      <div class="col-md-2"><input class="form-control" name="exp" type="number" value="${v.exp||30}" placeholder="Exp (hari)" required></div>
      <div class="col-md-2"><input class="form-control" name="quota" type="number" value="${v.quota||10}" placeholder="Quota (GB)" required></div>
      <div class="col-md-1"><input class="form-control" name="iplimit" type="number" value="${v.iplimit||1}" placeholder="IP" required></div>
      <div class="col-md-2"><input class="form-control" name="price" type="number" value="${v.price||0}" placeholder="Harga" required></div>
      <div class="col-md-3"><input class="form-control" name="desc" value="${v.desc||''}" placeholder="Keterangan"></div>
      <div class="col-12 mt-2">
        <button class="btn btn-primary">${varianName?"Update":"Tambah"}</button>
        <button type="button" class="btn btn-link" onclick="this.closest('form').remove()">Batal</button>
      </div>
    </form>`;
    document.getElementById("addEditVarianFormWrap").innerHTML = html;
    document.getElementById("addEditVarianForm").onsubmit = async function(e) {
      e.preventDefault();
      const fd = new FormData(this);
      const varian = Object.fromEntries(fd.entries());
      varian.exp = Number(varian.exp);
      varian.quota = Number(varian.quota);
      varian.iplimit = Number(varian.iplimit);
      varian.price = Number(varian.price);
      await fetch(`${API_BASE}/api-admin/save-varian`, {
        method: "POST",
        headers: { Authorization: "Bearer " + getAdminToken(), "Content-Type": "application/json" },
        body: JSON.stringify({ server, varian })
      });
      showAlert("Varian disimpan", "success");
      setTimeout(loadVarianList, 600);
      this.remove();
    }
  });
}

window.deleteVarian = function(varianName) {
  const server = document.getElementById("varianServerSelect").value;
  if(confirm("Yakin hapus varian ini?")) {
    fetch(`${API_BASE}/api-admin/delete-varian`, {
      method: "POST",
      headers: { Authorization: "Bearer " + getAdminToken(), "Content-Type": "application/json" },
      body: JSON.stringify({ server, name: varianName })
    }).then(()=> {
      showAlert("Varian dihapus!", "success");
      setTimeout(loadVarianList, 700);
    });
  }
}

// ---- LOG TAB ----
async function loadLogTab() {
  const el = document.getElementById("tab-log");
  el.innerHTML = `<div class="text-center my-4 text-muted"><i class="bi bi-hourglass-split"></i> Loading log ...</div>`;
  try {
    const today = (new Date()).toISOString().slice(0,10);
    const res = await fetch(`${API_BASE}/api-admin/log?hari=${today}`, {
      headers: { Authorization: "Bearer " + getAdminToken() }
    });
    const data = await res.json();
    let html = `<h5>Pendapatan hari ini: <span class="text-success">Rp ${data.pendapatan?.toLocaleString()||0}</span></h5>`;
    html += `<h6 class="mt-4">Log Transaksi</h6>
      <table class="table"><thead><tr>
      <th>Tanggal</th><th>User</th><th>Server</th><th>Varian</th><th>Harga</th><th>Tipe</th></tr></thead><tbody>`;
    (data.logs||[]).sort((a,b)=>b.ts-a.ts).forEach(l=>{
      const tgl = (new Date(l.ts)).toLocaleString("id-ID");
      html += `<tr>
        <td>${tgl}</td>
        <td>${l.username}</td>
        <td>${l.server||''}</td>
        <td>${l.varian||''}</td>
        <td>Rp ${l.harga?.toLocaleString()||0}</td>
        <td>${l.tipe}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    el.innerHTML = html;
  } catch {
    el.innerHTML = `<div class="alert alert-danger">Gagal load log!</div>`;
  }
}

// --- AUTO LOGIN (PERSIST SESSION)
(async function(){
  if (await checkAdminAuth()) {
    loadAdminPanel();
  } else {
    document.getElementById("adminLoginSection").classList.remove("d-none");
    document.getElementById("adminPanelSection").classList.add("d-none");
    document.getElementById("logoutBtn").classList.add("d-none");
  }
})();
