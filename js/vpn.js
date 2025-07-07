// ======= js/vpn.js =======
// Ganti ke domain Worker kamu!
const API_BASE = "https://api-v1.fadzdigital.dpdns.org";
const TOKEN_KEY = "JandaMuda";

// -------- Helper --------
function show(sectionId) {
  ["authSection", "userSection"].forEach(id => {
    document.getElementById(id).style.display = id === sectionId ? "" : "none";
  });
}
function showAlert(el, msg, type = "danger") {
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ""; }, 4200);
}
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }
function loadingBtn(btn, isLoading) {
  btn.disabled = !!isLoading;
  btn.innerHTML = isLoading ? `<span class="spinner-border spinner-border-sm"></span> Memproses...` : btn.dataset.text;
}

// --------- Switch Login/Register ---------
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

// --------- LOGIN ---------
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
      await loadUser();
    } else {
      showAlert(authAlert, data.error || "Login gagal");
    }
  } catch {
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
  loadingBtn(loginForm.loginBtn, false);
});

// --------- REGISTER ---------
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
      setTimeout(() => { 
        switchToLogin.click();
      }, 1800);
    } else {
      showAlert(authAlert, data.error || "Registrasi gagal");
    }
  } catch {
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
  loadingBtn(registerForm.registerBtn, false);
});

// --------- LOGOUT ---------
document.getElementById("logoutBtn").addEventListener("click", async function() {
  let token = getToken();
  if (!token) return;
  try {
    await fetch(API_BASE + "/api/user/logout", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ token }),
    });
  } catch {}
  clearToken();
  show("authSection");
});

// --------- LOAD USER DASHBOARD ---------
async function loadUser() {
  let token = getToken();
  if (!token) { show("authSection"); return; }
  try {
    const res = await fetch(API_BASE + `/api/user/me?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.ok && data.user) {
      show("userSection");
      renderUserDashboard(data.user);
    } else {
      clearToken();
      show("authSection");
      if (data.error) showAlert(authAlert, data.error);
    }
  } catch {
    clearToken();
    show("authSection");
    showAlert(authAlert, "Gagal koneksi ke server.");
  }
}

// --------- Render Dashboard User ---------
function renderUserDashboard(user) {
  // Render profile
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
  // Render menu user, contoh: Topup & Beli VPN
  document.getElementById("vpnUserTools").innerHTML = `
    <div class="mb-3">
      <button class="btn btn-success btn-sm me-2" id="btnTopupSaldo"><i class="bi bi-wallet2 me-1"></i>Topup Saldo</button>
      <button class="btn btn-primary btn-sm" id="btnBeliVPN"><i class="bi bi-shield-lock me-1"></i>Beli VPN</button>
    </div>
    <div id="toolsContent"></div>
    <div id="transaksiLog" class="mt-3"></div>
  `;
  document.getElementById("btnTopupSaldo").onclick = showTopupModal;
  document.getElementById("btnBeliVPN").onclick = showBeliVPN;
  // Load log pembelian user (optional, sesuai backend)
  loadUserTransaksi(user.username);
}

// ---- Topup Modal ----
function showTopupModal() {
  const tools = document.getElementById("toolsContent");
  tools.innerHTML = `
    <div class="card p-3 mb-3 shadow-sm">
      <h5 class="fw-bold mb-3">Topup Saldo</h5>
      <input type="number" id="inputNominal" class="form-control mb-2" placeholder="Nominal Topup (Rp)">
      <button class="btn btn-success w-100" id="submitTopup">Topup Sekarang</button>
      <div id="topupAlert" class="mt-2"></div>
    </div>
  `;
  document.getElementById("submitTopup").onclick = async function(){
    let nominal = Number(document.getElementById("inputNominal").value);
    if (isNaN(nominal) || nominal < 1000) {
      showAlert(document.getElementById("topupAlert"), "Minimal topup Rp 1.000");
      return;
    }
    let token = getToken();
    try {
      const res = await fetch(API_BASE + "/api/user/topup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ token, nominal }),
      });
      const data = await res.json();
      if (data.ok) {
        showAlert(document.getElementById("topupAlert"), "Topup sukses! Saldo: Rp " + data.saldo, "success");
        document.getElementById("saldoUser").textContent = data.saldo;
        // update saldo user juga di local state
        await loadUser();
      } else {
        showAlert(document.getElementById("topupAlert"), data.error || "Topup gagal");
      }
    } catch {
      showAlert(document.getElementById("topupAlert"), "Gagal koneksi ke server.");
    }
  };
}

// ---- Beli VPN ----
async function showBeliVPN() {
  const tools = document.getElementById("toolsContent");
  tools.innerHTML = `<div>Loading server...</div>`;
  let token = getToken();
  try {
    const res = await fetch(API_BASE + "/api/user/server-list");
    const data = await res.json();
    if (!data.ok) return tools.innerHTML = `<div class="text-danger">${data.error||"Gagal load server."}</div>`;
    let list = data.servers || [];
    if (list.length === 0) return tools.innerHTML = `<div class="text-warning">Tidak ada server tersedia.</div>`;
    let html = `
      <div class="card p-3 mb-3 shadow-sm">
        <h5 class="fw-bold mb-3">Beli VPN</h5>
        <label for="serverSelect" class="form-label">Pilih Server</label>
        <select id="serverSelect" class="form-select mb-2">
          ${list.map(s => `<option value="${s.server}">${s.server}</option>`).join("")}
        </select>
        <label for="varianSelect" class="form-label">Pilih Varian</label>
        <select id="varianSelect" class="form-select mb-2"></select>
        <button class="btn btn-primary w-100" id="submitBeliVpn">Beli Sekarang</button>
        <div id="beliVpnAlert" class="mt-2"></div>
        <div id="beliVpnResult" class="mt-3"></div>
      </div>
    `;
    tools.innerHTML = html;
    // Isi varian awal
    function updateVarian() {
      let server = document.getElementById("serverSelect").value;
      let srv = list.find(s => s.server === server);
      let v = srv?.varians || [];
      document.getElementById("varianSelect").innerHTML = v.map(x =>
        `<option value="${x.name}">${x.name} - Exp: ${x.exp} hari, Quota: ${x.quota}GB, IP: ${x.iplimit}, Harga: Rp${x.price}</option>`
      ).join("");
    }
    updateVarian();
    document.getElementById("serverSelect").addEventListener("change", updateVarian);

    document.getElementById("submitBeliVpn").onclick = async function(){
      let server = document.getElementById("serverSelect").value;
      let varian = document.getElementById("varianSelect").value;
      let token = getToken();
      if (!server || !varian) return showAlert(document.getElementById("beliVpnAlert"), "Pilih server/varian");
      let beliBtn = this;
      loadingBtn(beliBtn, true);
      let userBefore = null;
      // Simpan saldo sebelum beli, supaya bisa refund jika error
      try {
        const userData = await fetch(API_BASE + `/api/user/me?token=${encodeURIComponent(token)}`);
        const ud = await userData.json();
        userBefore = ud.user;
      } catch {}

      try {
        const res = await fetch(API_BASE + "/api/user/beli-vpn", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ token, server, varianName: varian }),
        });
        const data = await res.json();
        if (data.ok && data.data) {
          showAlert(document.getElementById("beliVpnAlert"), "Beli VPN sukses!", "success");
          document.getElementById("beliVpnResult").innerHTML =
            `<pre class="small text-wrap" style="font-size:.99em;">${JSON.stringify(data.data, null, 2)}</pre>`;
          // Update saldo tampilan
          await loadUser();
        } else {
          // Refund saldo jika error (otomatis, kalau backend support)
          if (userBefore) {
            // Fetch saldo sekarang
            const afterUser = await fetch(API_BASE + `/api/user/me?token=${encodeURIComponent(token)}`).then(r=>r.json()).then(x=>x.user);
            if (afterUser && afterUser.saldo < userBefore.saldo) {
              // saldo berkurang, refund manual
              await fetch(API_BASE + "/api/user/topup", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ token, nominal: userBefore.saldo - afterUser.saldo }),
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

// ----- Log Transaksi user (Opsional: tampilkan 5 terakhir) -----
async function loadUserTransaksi(username) {
  // Jika backend belum support log per user, skip fungsi ini
  // Cuma UI: edit backend kalau mau
  /*
  try {
    const res = await fetch(API_BASE + `/api/user/log?user=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.ok && data.logs) {
      let html = `<h6 class="fw-bold mb-1">Riwayat Transaksi</h6><ul class="list-group small">`;
      let logs = data.logs.slice(-5).reverse();
      logs.forEach(l => {
        html += `<li class="list-group-item d-flex justify-content-between">${l.tipe} <span class="text-muted">${new Date(l.ts).toLocaleString()}</span></li>`;
      });
      html += `</ul>`;
      document.getElementById("transaksiLog").innerHTML = html;
    }
  } catch {}
  */
}

// --------- AUTOLOAD SAAT MASUK PAGE ---------
window.addEventListener("DOMContentLoaded", () => {
  if (getToken()) loadUser();
  else show("authSection");
});
