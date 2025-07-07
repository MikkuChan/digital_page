// ------- Dynamic field for VPN form --------
const dynamicInputs = document.getElementById('dynamicInputs');
const serviceSelect = document.getElementById('service');

function renderFields(service) {
  let html = '';
  // Render fields sesuai endpoint
  if (/^create/.test(service)) {
    html += `
      <input class="form-control mb-2" type="text" id="user" placeholder="Username" required />
      ${service === "createssh" ? '<input class="form-control mb-2" type="text" id="pass" placeholder="Password (SSH)" required />' : ''}
      <input class="form-control mb-2" type="number" min="1" max="365" id="exp" placeholder="Masa Aktif (hari)" required />
      <input class="form-control mb-2" type="number" min="1" max="100" id="quota" placeholder="Kuota (GB)" required />
      <input class="form-control mb-2" type="number" min="1" max="10" id="iplimit" placeholder="IP Limit" required />
    `;
  }
  else if (/^renew/.test(service)) {
    html += `
      <input class="form-control mb-2" type="text" id="user" placeholder="Username" required />
      <input class="form-control mb-2" type="number" min="1" max="365" id="${service === "renewssh" ? 'days' : 'masaaktif'}" placeholder="Perpanjang (hari)" required />
      ${service !== "renewssh" ? `<input class="form-control mb-2" type="number" min="1" max="100" id="quota" placeholder="Kuota (GB)" required />` : ''}
      ${service !== "renewssh" ? `<input class="form-control mb-2" type="number" min="1" max="10" id="iplimit" placeholder="IP Limit" required />` : ''}
    `;
  }
  else if (/^delete/.test(service)) {
    html += `<input class="form-control mb-2" type="text" id="user" placeholder="Username" required />`;
  }
  else if (service === "backupserver") {
    html += `
      <input class="form-control mb-2" type="email" id="email" placeholder="Email backup (opsional)" />
      <input type="hidden" id="action" value="backup" />
    `;
  }
  else if (service === "restoreserver") {
    html += `
      <input class="form-control mb-2" type="url" id="linkbackup" placeholder="Link file backup (.zip)" required />
      <input type="hidden" id="action" value="restore" />
    `;
  }
  // else cek user/health, no field
  dynamicInputs.innerHTML = html;
}
serviceSelect.addEventListener('change', e => renderFields(e.target.value));
renderFields(serviceSelect.value); // initial

// ------- Submit logic & fetch Worker API -------
document.getElementById('vpnForm').addEventListener('submit', async function(e){
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

  // Endpoint ke Worker kamu:
  const apiUrl = `https://apivpn.fadzdigital.dpdns.org/api-vpn/${service}?${params.toString()}`;
  // UX loading
  document.getElementById('vpnBtn').disabled = true;
  document.getElementById('btnText').textContent = "Memproses...";
  document.getElementById('loadingSpinner').classList.remove('d-none');
  document.getElementById('vpnResult').innerHTML = "";
  document.getElementById('vpnResultWrap').style.display = "none";

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
    document.getElementById('vpnResult').innerHTML = html;
    document.getElementById('vpnResultWrap').style.display = "block";
  } catch (err) {
    document.getElementById('vpnResult').innerHTML = `<div class="alert alert-danger fw-bold">❌ Gagal connect ke API Worker.</div>`;
    document.getElementById('vpnResultWrap').style.display = "block";
  }
  document.getElementById('vpnBtn').disabled = false;
  document.getElementById('btnText').textContent = "Proses";
  document.getElementById('loadingSpinner').classList.add('d-none');
});

// Copy hasil
document.getElementById('copyVpnHasil').onclick = function() {
  let txt = document.getElementById('vpnResult').innerText || "";
  if (txt.trim()) {
    navigator.clipboard.writeText(txt);
    let btn = this;
    let old = btn.innerHTML;
    btn.innerHTML = "<i class='bi bi-clipboard-check'></i>Disalin!";
    setTimeout(() => btn.innerHTML = old, 1400);
  }
};
