// ========== Load API config (json/apicalls.json) ==========
let apiConf = null;
fetch('json/apicalls.json')
  .then(r => r.json())
  .then(j => { apiConf = j; })
  .catch(() => {
    apiConf = null;
    alert('Gagal load API config, cek file json/apicalls.json!');
  });

// ========== DOM
const vpnForm = document.getElementById('vpnForm');
const vpnType = document.getElementById('vpnType');
const vpnUsername = document.getElementById('vpnUsername');
const createBtn = document.getElementById('createBtn');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// ========== Helper showToast
function showToast(msg, isErr) {
  let toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4" +
    (isErr ? " bg-danger" : " bg-success") +
    " text-white shadow-lg";
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1200);
  setTimeout(() => { document.body.removeChild(toast); }, 1750);
}

// ========== Helper show/hide loading di button
function showLoading(btn, loading = true) {
  if (loading) {
    btn.disabled = true;
    btn.classList.add("loading");
    btn.dataset.text = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Proses...`;
  } else {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = btn.dataset.text || btn.innerHTML;
  }
}

// ========== Form submit: call API
vpnForm.addEventListener('submit', function (e) {
  e.preventDefault();

  // Validasi API config ready
  if (!apiConf) {
    showToast("API config error. Hubungi admin.", true);
    return;
  }

  const type = vpnType.value;
  let username = (vpnUsername.value || "").trim();

  // Validasi username
  if (!username.match(/^[a-zA-Z0-9_]+$/)) {
    showToast("Username hanya huruf/angka/underscore, tanpa spasi!", true);
    vpnUsername.focus();
    return;
  }

  showLoading(createBtn, true);

  // Build endpoint + params dari config
  const apiData = apiConf[type];
  if (!apiData || !apiData.endpoint || !apiData.auth) {
    showLoading(createBtn, false);
    showToast("Konfigurasi endpoint belum ada!", true);
    return;
  }
  // Default config: 1 hari, 30GB, 20 IP (ubah sesuai kebutuhan)
  let params = {
    user: username,
    exp: 1,
    quota: 30,
    iplimit: 20,
    auth: apiData.auth
  };

  let url = apiData.endpoint + "?" +
    Object.keys(params).map(k => k + "=" + encodeURIComponent(params[k])).join("&");

  // Untuk SSH, bisa tambahkan password random jika ingin (optional)
  // if (type === "ssh") url += "&pass=" + Math.random().toString(36).substring(2, 8);

  fetch(url)
    .then(r => r.text())
    .then(res => {
      resultOutput.value = res;
      resultSection.style.display = "block";
      showLoading(createBtn, false);
      showToast("Akun berhasil dibuat!");
      setTimeout(() => { resultOutput.scrollIntoView({ behavior: "smooth", block: "center" }); }, 250);
    })
    .catch(err => {
      showLoading(createBtn, false);
      resultOutput.value = "";
      resultSection.style.display = "none";
      showToast("Gagal konek ke server!", true);
    });
});

// ========== Copy button
copyBtn.onclick = function () {
  if (!resultOutput.value) return;
  navigator.clipboard.writeText(resultOutput.value);
  showToast("Hasil berhasil disalin!");
};

// ========== Download button
downloadBtn.onclick = function (e) {
  e.preventDefault();
  if (!resultOutput.value) return;
  let type = vpnType.value;
  let user = (vpnUsername.value || "").trim();
  let ext = (type === "ssh") ? ".txt" : ".conf";
  if (type === "vmess" || type === "vless" || type === "trojan") ext = ".txt"; // link saja
  let fname = `${type}_${user || "akunvpn"}${ext}`;
  const blob = new Blob([resultOutput.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  downloadBtn.setAttribute("download", fname);
  downloadBtn.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
