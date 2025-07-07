// ======= js/vpn.js - Fadzdigital v3 (Bearer Base64) =======
const API_BASE = "https://api-v1.fadzdigital.dpdns.org";
const TOKEN_KEY = "JandaMuda";
let usernameGlobal = null; // Untuk bearer token base64

// Helper
function show(sectionId) {
  ["authSection", "userSection"].forEach(id => {
    document.getElementById(id).style.display = id === sectionId ? "" : "none";
  });
}
function showAlert(el, msg, type = "danger") {
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ""; }, 4000);
}
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }
function loadingBtn(btn, isLoading) {
  btn.disabled = !!isLoading;
  btn.innerHTML = isLoading ? `<span class="spinner-border spinner-border-sm"></span> Memproses...` : btn.dataset.text;
}
function getBearer() {
  if (!usernameGlobal) return "";
  const token = getToken();
  return "Bearer " + btoa(`${usernameGlobal}:${token}`);
}

// Switch Login/Register
const switchToReg = document.getElementById("switchToReg");
const switchToLogin = document.getElementById("switchToLogin");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authTitle = document.getElementById("authTitle");
const authAlert = document.getElementById("authAlert");

switchToReg.addEventListener("click", e => {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "";
  switchToReg.style.display = "none";
  switchToLogin.style.display = "";
  authTitle.textContent = "Registrasi User";
  authAlert.innerHTML = "";
});
switchToLogin.addEventListener("click", e => {
  e.preventDefault();
  loginForm.style.display = "";
  registerForm.style.display = "none";
  switchToReg.style.display = "";
  switchToLogin.style.display = "none";
  authTitle.textContent = "Login User";
  authAlert.innerHTML = "";
});

// LOGIN
loginForm.addEventListener("submit", async function(e){
  e.preventDefault();
  loadingBtn(loginForm.loginBtn, true);
  authAlert.innerHTML = "";
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    const res = await fetch(API_BASE + "/api/user/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.ok && data.token) {
      setToken(data.token);
      usernameGlobal = username;
      await loadUser();
    } else {
      showAlert(authAlert, data.error || "Login gagal");
    }
  } catch {
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
  loadingBtn(loginForm.loginBtn, false);
});

// REGISTER
registerForm.addEventListener("submit", async function(e){
  e.preventDefault();
  loadingBtn(registerForm.registerBtn, true);
  authAlert.innerHTML = "";
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  try {
    const res = await fetch(API_BASE + "/api/user/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, password, email }),
    });
    const data = await res.json();
    if (data.ok) {
      showAlert(authAlert, "Registrasi sukses! Tunggu ACC admin.", "success");
      setTimeout(() => { switchToLogin.click(); }, 1800);
    } else {
      showAlert(authAlert, data.error || "Registrasi gagal");
    }
  } catch {
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
  loadingBtn(registerForm.registerBtn, false);
});

// LOGOUT
document.getElementById("logoutBtn").addEventListener("click", async function() {
  let token = getToken();
  if (!token) return;
  try {
    await fetch(API_BASE + "/api/user/logout", {
      method: "POST",
      headers: {"Content-Type": "application/json", "Authorization": getBearer()},
      body: JSON.stringify({ token }),
    });
  } catch {}
  clearToken();
  usernameGlobal = null;
  show("authSection");
});

// LOAD USER DASHBOARD
async function loadUser() {
  let token = getToken();
  if (!token) { show("authSection"); return; }
  try {
    const res = await fetch(API_BASE + `/api/user/me`, {
      headers: { "Authorization": getBearer() }
    });
    const data = await res.json();
    if (data.ok && data.user) {
      usernameGlobal = data.user.username;
      show("userSection");
      renderUserDashboard(data.user);
    } else {
      clearToken();
      usernameGlobal = null;
      show("authSection");
      if (data.error) showAlert(authAlert, data.error);
    }
  } catch {
    clearToken();
    usernameGlobal = null;
    show("authSection");
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
}

// RENDER DASHBOARD USER
function renderUserDashboard(user) {
  // Profile
  const userProfile = document.getElementById("userProfile");
  userProfile.innerHTML = `
    <div class="d-flex align-items-center mb-2">
      <div class="flex-grow-1">
        <div class="fw-bold" style="font-size:1.22em;">👤 ${user.username}</div>
        <div class="text-muted">${user.email||""}</div>
        <span class="badge bg-primary mt-1">Saldo: <span id="saldoUser">${user.saldo||0}</span></span>
      </div>
    </div>
    <div class="small mt-2" style="color:#10b981;">
      Status: <span class="fw-bold">${user.status === "active" ? "Aktif" : "Menunggu ACC Admin"}</span>
    </div>
  `;
  // Tools
  document.getElementById("vpnUserTools").innerHTML = `
    <div class="mb-3">
      <button class="btn btn-primary btn-sm" id="btnBeliVPN"><i class="bi bi-shield-lock me-1"></i>Beli VPN</button>
    </div>
    <div id="toolsContent"></div>
    <div id="transaksiLog" class="mt-3"></div>
  `;
  document.getElementById("btnBeliVPN").onclick = showBeliVPN;
  loadUserTransaksi(user.username);
}

// BELI VPN
async function showBeliVPN() {
  const tools = document.getElementById("toolsContent");
  tools.innerHTML = `<div>Loading server...</div>`;
  let token = getToken();
  try {
    const res = await fetch(API_BASE + "/api/user/server-list", {
      headers: { "Authorization": getBearer() }
    });
    const data = await res.json();
    if (!data.ok) return tools.innerHTML = `<div class="text-danger">${data.error||"Gagal load server."}</div>`;
    let list = data.servers || [];
    if (list.length === 0) return tools.innerHTML = `<div class="text-warning">Tidak ada server tersedia.</div>`;

    let html = `
      <div class="card p-3 mb-3 shadow-sm">
        <h5 class="fw-bold mb-3">Beli VPN</h5>
        <label class="form-label">Pilih Server</label>
        <select id="serverSelect" class="form-select mb-2">
          ${list.map(s => `<option value="${s.server}">${s.server}</option>`).join("")}
        </select>
        <label class="form-label">Pilih Varian</label>
        <select id="varianSelect" class="form-select mb-2"></select>
        <label class="form-label">Pilih Protokol</label>
        <select id="protokolSelect" class="form-select mb-2">
          <option value="vmess">VMess</option>
          <option value="vless">VLESS</option>
          <option value="trojan">Trojan</option>
          <option value="ssh">SSH</option>
        </select>
        <div id="formUserInput" class="mb-2"></div>
        <button class="btn btn-primary w-100" id="submitBeliVpn" data-text="Beli Sekarang">Beli Sekarang</button>
        <div id="beliVpnAlert" class="mt-2"></div>
        <div id="beliVpnResult" class="mt-3"></div>
      </div>
    `;
    tools.innerHTML = html;

    function updateVarian() {
      let server = document.getElementById("serverSelect").value;
      let srv = list.find(s => s.server === server);
      let v = srv?.varians || [];
      document.getElementById("varianSelect").innerHTML = v.map(x =>
        `<option value="${x.name}">${x.name} - Desc: ${x.desc||""} - Harga: Rp${x.price?.toLocaleString()}</option>`
      ).join("");
    }
    updateVarian();
    document.getElementById("serverSelect").addEventListener("change", updateVarian);

    function renderUserInput() {
      const protokol = document.getElementById("protokolSelect").value;
      let html = `
        <label class="form-label">Username</label>
        <input type="text" class="form-control mb-2" id="inputVpnUsername" placeholder="Username" required>
      `;
      if (protokol === "ssh") {
        html += `
          <label class="form-label">Password SSH</label>
          <input type="text" class="form-control mb-2" id="inputVpnPassword" placeholder="Password SSH" required>
        `;
      }
      document.getElementById("formUserInput").innerHTML = html;
    }
    renderUserInput();
    document.getElementById("protokolSelect").addEventListener("change", renderUserInput);

    document.getElementById("submitBeliVpn").onclick = async function(){
      let server = document.getElementById("serverSelect").value;
      let varian = document.getElementById("varianSelect").value;
      let protokol = document.getElementById("protokolSelect").value;
      let username = document.getElementById("inputVpnUsername").value.trim();
      let password = protokol === "ssh" ? document.getElementById("inputVpnPassword").value.trim() : undefined;
      if (!server || !varian || !protokol || !username || (protokol === "ssh" && !password)) {
        return showAlert(document.getElementById("beliVpnAlert"), "Lengkapi semua input!");
      }

      let beliBtn = this;
      loadingBtn(beliBtn, true);
      let userBefore = null;
      try {
        const userData = await fetch(API_BASE + `/api/user/me`, {headers:{"Authorization": getBearer()}});
        const ud = await userData.json();
        userBefore = ud.user;
      } catch {}

      try {
        let payload = { token: getToken(), server, varianName: varian, protokol, username };
        if (protokol === "ssh") payload.password = password;
        const res = await fetch(API_BASE + "/api/user/beli-vpn", {
          method: "POST",
          headers: {"Content-Type": "application/json", "Authorization": getBearer()},
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok && data.data) {
          showAlert(document.getElementById("beliVpnAlert"), "Beli VPN sukses!", "success");
          document.getElementById("beliVpnResult").innerHTML = formatVpnResult(protokol, data.data);
          await loadUser();
        } else {
          if (userBefore) {
            const afterUser = await fetch(API_BASE + `/api/user/me`, {headers:{"Authorization": getBearer()}})
              .then(r=>r.json()).then(x=>x.user);
            if (afterUser && afterUser.saldo < userBefore.saldo) {
              await fetch(API_BASE + "/api/user/topup", {
                method: "POST",
                headers: {"Content-Type": "application/json", "Authorization": getBearer()},
                body: JSON.stringify({ token: getToken(), nominal: userBefore.saldo - afterUser.saldo }),
              });
            }
          }
          showAlert(document.getElementById("beliVpnAlert"), data.error || "Gagal beli VPN");
          await loadUser();
        }
      } catch {
        showAlert(document.getElementById("beliVpnAlert"), "Gagal koneksi ke server.");
      }
      loadingBtn(beliBtn, false);
    };
  } catch {
    tools.innerHTML = `<div class="text-danger">Gagal koneksi ke server.</div>`;
  }
}

// FORMAT OUTPUT VPN RESULT
function formatVpnResult(protokol, data) {
  function copyBtn(val) {
    return `<button type="button" class="btn btn-outline-secondary btn-sm ms-2" onclick="navigator.clipboard.writeText('${val.replace(/'/g,"\\'")}')"><i class="bi bi-clipboard"></i> Copy</button>`;
  }
  let html = '';
  if (["vmess", "vless", "trojan"].includes(protokol)) {
    html = `
      <div class="mb-2"><b>Username:</b> ${data.username||""}</div>
      <div class="mb-2"><b>UUID:</b> ${data.uuid||""}</div>
      <div class="mb-2"><b>Domain:</b> ${data.domain||""}</div>
      <div class="mb-2"><b>Limit Quota:</b> ${data.quota_gb||""} GB</div>
      <div class="mb-2"><b>Masa Aktif:</b> ${data.expired||""}</div>
      <div class="mb-2"><b>Created:</b> ${data.created||""}</div>
      <div class="mb-2"><b>IP Limit:</b> ${data.ip_limit||""}</div>
      ${protokol==="vmess" ? `
        <div class="mb-2"><b>VMess WS TLS:</b> <code class="text-break">${data.ws_tls||""}</code> ${copyBtn(data.ws_tls||"")}</div>
        <div class="mb-2"><b>VMess WS Non-TLS:</b> <code class="text-break">${data.ws_ntls||""}</code> ${copyBtn(data.ws_ntls||"")}</div>
        <div class="mb-2"><b>VMess gRPC:</b> <code class="text-break">${data.grpc||""}</code> ${copyBtn(data.grpc||"")}</div>
      ` : protokol==="vless" ? `
        <div class="mb-2"><b>VLESS WS TLS:</b> <code class="text-break">${data.ws_tls||""}</code> ${copyBtn(data.ws_tls||"")}</div>
        <div class="mb-2"><b>VLESS WS Non-TLS:</b> <code class="text-break">${data.ws_ntls||""}</code> ${copyBtn(data.ws_ntls||"")}</div>
        <div class="mb-2"><b>VLESS gRPC:</b> <code class="text-break">${data.grpc||""}</code> ${copyBtn(data.grpc||"")}</div>
      ` : protokol==="trojan" ? `
        <div class="mb-2"><b>Trojan WS TLS:</b> <code class="text-break">${data.ws_tls||""}</code> ${copyBtn(data.ws_tls||"")}</div>
        <div class="mb-2"><b>Trojan gRPC:</b> <code class="text-break">${data.grpc||""}</code> ${copyBtn(data.grpc||"")}</div>
        <div class="mb-2"><b>Config File:</b> <a href="${data.config_url||'#'}" target="_blank">${data.config_url||""}</a></div>
      ` : ""}
    `;
  } else if (protokol === "ssh") {
    html = `
      <div class="mb-2"><b>Username:</b> ${data.username||""}</div>
      <div class="mb-2"><b>Password:</b> ${data.password||""}</div>
      <div class="mb-2"><b>Domain:</b> ${data.domain||""}</div>
      <div class="mb-2"><b>Limit Quota:</b> ${data.quota_gb||""} GB</div>
      <div class="mb-2"><b>Masa Aktif:</b> ${data.expired||""}</div>
      <div class="mb-2"><b>Created:</b> ${data.created||""}</div>
      <div class="mb-2"><b>IP Limit:</b> ${data.ip_limit||""}</div>
      <div class="mb-2"><b>Login URL:</b> <code class="text-break">${data.login_url||""}</code> ${copyBtn(data.login_url||"")}</div>
      <div class="mb-2"><b>Config File:</b> <a href="${data.account_file||'#'}" target="_blank">${data.account_file||""}</a></div>
    `;
  }
  return `<div class="card p-3 mt-2">${html}</div>`;
}

// OPTIONAL: Transaksi log
function loadUserTransaksi(username) {
  // Opsional: fetch & tampilkan log transaksi user
}

// Autoload saat masuk page
window.addEventListener("DOMContentLoaded", () => {
  if (getToken()) loadUser();
  else show("authSection");
});
