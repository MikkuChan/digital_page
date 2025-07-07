// ------------ Konfigurasi -------------
const API_USER = "https://acc.fadzdigital.dpdns.org";
const API_VPN = "https://apivpn.fadzdigital.dpdns.org/api-vpn"; // endpoint API VPN kamu
// --------------------------------------

// ---- UI Helper
function show(el) { el.style.display = ""; }
function hide(el) { el.style.display = "none"; }
function alertMsg(msg, type = "danger") {
  return `<div class="alert alert-${type} fw-bold py-2 px-3 mb-3">${msg}</div>`;
}

// --- Session
function saveSession(token, username) {
  localStorage.setItem("vpn_token", token);
  localStorage.setItem("vpn_user", username);
}
function clearSession() {
  localStorage.removeItem("vpn_token");
  localStorage.removeItem("vpn_user");
}
function getToken() { return localStorage.getItem("vpn_token") || ""; }
function getUser() { return localStorage.getItem("vpn_user") || ""; }

// --- Auth logic
async function checkLogin() {
  const token = getToken();
  if (!token) return false;
  // Cek token ke Worker user
  try {
    const res = await fetch(`${API_USER}/me?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data && data.ok && data.user) {
      document.getElementById("userWelcome").textContent = `${data.user.username} (${data.user.email})`;
      return true;
    }
  } catch {}
  return false;
}

// --- Auth UI Switch
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authWrap = document.getElementById("authWrap");
const vpnMainWrap = document.getElementById("vpnMainWrap");
const authAlert = document.getElementById("authAlert");
const switchToRegister = document.getElementById("switchToRegister");
const switchToLogin = document.getElementById("switchToLogin");

switchToRegister.onclick = () => {
  hide(loginForm); show(registerForm); hide(switchToRegister); show(switchToLogin);
  document.getElementById("authTitle").textContent = "Daftar Akun";
  authAlert.innerHTML = "";
};
switchToLogin.onclick = () => {
  hide(registerForm); show(loginForm); hide(switchToLogin); show(switchToRegister);
  document.getElementById("authTitle").textContent = "Masuk ke Akun";
  authAlert.innerHTML = "";
};

// --- Register
registerForm.onsubmit = async e => {
  e.preventDefault();
  authAlert.innerHTML = "";
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;
  const email = document.getElementById("regEmail").value.trim();
  if (!username || !password || !email) return authAlert.innerHTML = alertMsg("Isi semua data!", "danger");
  try {
    document.getElementById("regBtn").disabled = true;
    const res = await fetch(`${API_USER}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email })
    });
    const data = await res.json();
    if (data.ok) {
      authAlert.innerHTML = alertMsg("Registrasi sukses, tunggu approve admin!", "success");
      setTimeout(() => { switchToLogin.onclick(); }, 1800);
    } else {
      authAlert.innerHTML = alertMsg(data.error || "Gagal daftar!", "danger");
    }
  } catch {
    authAlert.innerHTML = alertMsg("Gagal koneksi!", "danger");
  }
  document.getElementById("regBtn").disabled = false;
};

// --- Login
loginForm.onsubmit = async e => {
  e.preventDefault();
  authAlert.innerHTML = "";
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!username || !password) return authAlert.innerHTML = alertMsg("Isi semua data!", "danger");
  try {
    document.getElementById("loginBtn").disabled = true;
    const res = await fetch(`${API_USER}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.ok && data.token) {
      saveSession(data.token, username);
      await afterLogin();
    } else {
      authAlert.innerHTML = alertMsg(data.error || "Login gagal!", "danger");
    }
  } catch {
    authAlert.innerHTML = alertMsg("Gagal koneksi!", "danger");
  }
  document.getElementById("loginBtn").disabled = false;
};

// --- Logout
document.getElementById("logoutBtn").onclick = async function() {
  const token = getToken();
  if (token) {
    await fetch(`${API_USER}/logout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
  }
  clearSession();
  window.location.reload();
};

// --- After login
async function afterLogin() {
  show(vpnMainWrap); hide(authWrap); show(document.getElementById("logoutBtn"));
  document.getElementById("vpnResult").innerHTML = "";
  document.getElementById("vpnResultWrap").style.display = "none";
  // Set user
  document.getElementById("userWelcome").textContent = getUser();
  renderFields(serviceSelect.value);
}

// ---- VPN form field dinamis
const dynamicInputs = document.getElementById('dynamicInputs');
const serviceSelect = document.getElementById('service');
function renderFields(service) {
  let html = '';
  if (/^create/.test(service)) {
    html += `
      <input class="form-control mb-2" type="text" id="user" placeholder="Username" required />
      ${service === "createssh" ? '<input class="form-control mb-2" type="text" id="pass" placeholder="Password (SSH)" required />' : ''}
      <input class="form-control mb-2" type="number" min="1" max="365" id="exp" placeholder="Masa Aktif (hari)" required />
      <input class="form-control mb-2" type="number" min="1" max="100" id="quota" placeholder="Kuota (GB)" required />
      <input class="form-control mb-2" type="number" min="1" max="10" id="iplimit" placeholder="IP Limit" required />
    `;
  } else if (/^renew/.test(service)) {
    html += `
      <input class="form-control mb-2" type="text" id="user" placeholder="Username" required />
      <input class="form-control mb-2" type="number" min="1" max="365" id="${service === "renewssh" ? 'days' : 'masaaktif'}" placeholder="Perpanjang (hari)" required />
      ${service !== "renewssh" ? `<input class="form-control mb-2" type="number" min="1" max="100" id="quota" placeholder="Kuota (GB)" required />` : ''}
      ${service !== "renewssh" ? `<input class="form-control mb-2" type="number" min="1" max="10" id="iplimit" placeholder="IP Limit" required />` : ''}
    `;
  } else if (/^delete/.test(service)) {
    html += `<input class="form-control mb-2" type="text" id="user" placeholder="Username" required />`;
  } else if (service === "backupserver") {
    html += `
      <input class="form-control mb-2" type="email" id="email" placeholder="Email backup (opsional)" />
      <input type="hidden" id="action" value="backup" />
    `;
  } else if (service === "restoreserver") {
    html += `
      <input class="form-control mb-2" type="url" id="linkbackup" placeholder="Link file backup (.zip)" required />
      <input type="hidden" id="action" value="restore" />
    `;
  }
  dynamicInputs.innerHTML = html;
}
serviceSelect && serviceSelect.addEventListener('change', e => renderFields(e.target.value));

// ----------- Submit logic VPN -----------
const vpnForm = document.getElementById('vpnForm');
if (vpnForm) {
  vpnForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const service = serviceSelect.value;
    let params = new URLSearchParams();
    // Build param sesuai endpoint
    if (/^create/.test(service)) {
      params.set('user', document.getElementById('user').value.trim());
      if (service === "createssh") params.set('pass', document.getElementById('pass').value.trim());
      params.set('exp', document.getElementById('exp').value.trim());
      params.set('quota', document.getElementById('quota').value.trim());
      params.set('iplimit', document.getElementById('iplimit').value.trim());
    }
    else if (/^renew/.test(service)) {
      params.set('user', document.getElementById('user').value.trim());
      if (service === "renewssh") params.set('days', document.getElementById('days').value.trim());
      else {
        params.set('masaaktif', document.getElementById('masaaktif').value.trim());
        params.set('quota', document.getElementById('quota').value.trim());
        params.set('iplimit', document.getElementById('iplimit').value.trim());
      }
    }
    else if (/^delete/.test(service)) {
      params.set('user', document.getElementById('user').value.trim());
    }
    else if (service === "backupserver") {
      params.set('action', 'backup');
      const email = document.getElementById('email').value.trim();
      if (email) params.set('email', email);
    }
    else if (service === "restoreserver") {
      params.set('action', 'restore');
      params.set('linkbackup', document.getElementById('linkbackup').value.trim());
    }
    // Endpoint ke Worker VPN kamu:
    const apiUrl = `${API_VPN}/${service}?${params.toString()}`;
    // UX loading
    document.getElementById("vpnBtn").disabled = true;
    document.getElementById("btnText").textContent = "Memproses...";
    document.getElementById("loadingSpinner").classList.remove('d-none');
    document.getElementById("vpnResult").innerHTML = "";
    document.getElementById("vpnResultWrap").style.display = "none";
    try {
      const res = await fetch(apiUrl);
      let data;
      try { data = await res.json(); } catch { data = { status: "error", message: "Bukan respon JSON valid!" }; }
      let html = "";
      if (data.status === "success") {
        html += `<div class="alert alert-success fw-bold"><i class="bi bi-check-circle me-2"></i>${data.message||"Berhasil!"}</div>`;
        html += `<pre>${JSON.stringify(data.data||data, null, 2)}</pre>`;
      } else {
        html += `<div class="alert alert-danger fw-bold"><i class="bi bi-x-circle me-2"></i>${data.message||"Terjadi error."}</div>`;
        if (data.example) html += `<div class="alert alert-info small mt-2">Contoh: ${data.example}</div>`;
        if (data.data) html += `<pre>${JSON.stringify(data.data, null, 2)}</pre>`;
      }
      document.getElementById("vpnResult").innerHTML = html;
      document.getElementById("vpnResultWrap").style.display = "block";
    } catch (err) {
      document.getElementById("vpnResult").innerHTML = `<div class="alert alert-danger fw-bold">❌ Gagal connect ke API Worker.</div>`;
      document.getElementById("vpnResultWrap").style.display = "block";
    }
    document.getElementById("vpnBtn").disabled = false;
    document.getElementById("btnText").textContent = "Proses";
    document.getElementById("loadingSpinner").classList.add('d-none');
  });
  // Copy hasil
  document.getElementById('copyVpnHasil').onclick = function() {
    let txt = document.getElementById('vpnResult').innerText || "";
    if (txt.trim()) {
      navigator.clipboard.writeText(txt);
      let btn = this, old = btn.innerHTML;
      btn.innerHTML = "<i class='bi bi-clipboard-check'></i>Disalin!";
      setTimeout(() => btn.innerHTML = old, 1400);
    }
  };
}

// ------ Autologin logic saat load page ------
window.addEventListener("DOMContentLoaded", async function() {
  if (await checkLogin()) {
    hide(authWrap); show(vpnMainWrap); show(document.getElementById("logoutBtn"));
    renderFields(serviceSelect.value);
  } else {
    show(authWrap); hide(vpnMainWrap);
    hide(document.getElementById("logoutBtn"));
  }
});
