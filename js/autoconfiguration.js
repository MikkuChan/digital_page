// --- Config Preset Data (bisa diganti load ajax/fetch ke file json) ---
fetch('json/configpreset.json').then(r => r.json()).then(data => { configPresets = data; loadProviders(); });


// --- Helper: Update akun VPN sesuai preset ---
function updateAccountByPreset(vpnAccount, preset) {
  let server = preset.server?.type === 'ubah' ? preset.server.value : null;
  let servernameType = preset.servername?.type || 'tetap';
  let servernameVal = preset.servername?.value || '';
  let hostType = preset.host?.type || 'tetap';
  let hostVal = preset.host?.value || '';

  if (vpnAccount.startsWith('vmess://')) {
    const base64 = vpnAccount.split('vmess://')[1];
    if (!base64) throw new Error('Format vmess tidak valid!');
    const decoded = atob(base64);
    const json = JSON.parse(decoded);
    if (server) json.add = server;
    if (servernameType === 'ubah') {
      json.sni = servernameVal;
      json.servername = servernameVal;
    } else if (servernameType === 'menambah') {
      let asal = json.sni || json.servername || '';
      if (asal) {
        json.sni = `${servernameVal}.${asal}`;
        json.servername = `${servernameVal}.${asal}`;
      }
    }
    if (hostType === 'ubah') {
      json.host = hostVal;
    } else if (hostType === 'menambah') {
      if (json.host) json.host = `${hostVal}.${json.host}`;
      if (json.wsHeaders && json.wsHeaders.Host) {
        json.wsHeaders.Host = `${hostVal}.${json.wsHeaders.Host}`;
      }
    }
    return 'vmess://' + btoa(JSON.stringify(json));
  } else if (vpnAccount.startsWith('vless://') || vpnAccount.startsWith('trojan://')) {
    let account = vpnAccount;
    if (server) {
      account = account.replace(/@([^:]+):/, `@${server}:`);
    }
    if (servernameType === 'ubah') {
      if (/([?&])sni=([^&]*)/.test(account)) {
        account = account.replace(/([?&])sni=([^&]*)/, `$1sni=${servernameVal}`);
      } else {
        account += (account.includes('?') ? '&' : '?') + 'sni=' + servernameVal;
      }
    } else if (servernameType === 'menambah') {
      account = account.replace(/([?&])sni=([^&]*)/, (m, g1, sni) => `${g1}sni=${servernameVal}.${sni}`);
    }
    if (hostType === 'ubah') {
      if (/([?&])host=([^&]*)/.test(account)) {
        account = account.replace(/([?&])host=([^&]*)/, `$1host=${hostVal}`);
      } else {
        account += (account.includes('?') ? '&' : '?') + 'host=' + hostVal;
      }
    } else if (hostType === 'menambah') {
      account = account.replace(/([?&])host=([^&]*)/, (m, g1, host) => `${g1}host=${hostVal}.${host}`);
    }
    return account;
  }
  throw new Error('Format akun VPN tidak dikenali!');
}

// --- DOM Elements ---
const providerSelect = document.getElementById('providerSelect');
const presetSelect = document.getElementById('presetSelect');
const autoconfigForm = document.getElementById('autoconfigForm');
const vpnAccountInput = document.getElementById('vpnAccount');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// --- Populate Provider Select ---
function loadProviders() {
  providerSelect.innerHTML = '';
  configPresets.forEach((p, idx) => {
    providerSelect.innerHTML += `<option value="${p.provider}">${p.provider}</option>`;
  });
  loadPresetsForProvider();
}

// --- Populate Preset Select sesuai provider terpilih ---
function loadPresetsForProvider() {
  const providerName = providerSelect.value;
  const prov = configPresets.find(p => p.provider === providerName);
  presetSelect.innerHTML = '';
  if (prov && prov.presets.length > 0) {
    prov.presets.forEach(opt => {
      presetSelect.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
    });
    presetSelect.disabled = false;
  } else {
    presetSelect.innerHTML = `<option value="">(Belum ada preset)</option>`;
    presetSelect.disabled = true;
  }
}

// --- Handle change provider ---
providerSelect.addEventListener('change', loadPresetsForProvider);

// --- Show toast simple ---
function showToast(msg) {
  let toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4 bg-success text-white shadow-lg";
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1200);
  setTimeout(() => { document.body.removeChild(toast); }, 1750);
}

// --- Form submit: Generate Result ---
autoconfigForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const provider = providerSelect.value;
  const presetVal = presetSelect.value;
  if (!provider || !presetVal) {
    showToast("Pilih provider & preset dulu!");
    return;
  }
  const prov = configPresets.find(p => p.provider === provider);
  const preset = prov && prov.presets.find(p => p.value === presetVal);
  if (!preset) {
    showToast("Preset tidak ditemukan!");
    return;
  }
  const rawInput = vpnAccountInput.value.trim();
  if (!rawInput) {
    showToast("Masukkan akun VPN-mu!");
    return;
  }
  const lines = rawInput.split('\n').map(l => l.trim()).filter(Boolean);
  let result = '';
  let errors = [];
  lines.forEach((line, i) => {
    try {
      const res = updateAccountByPreset(line, preset);
      result += res + '\n';
    } catch (e) {
      errors.push(`Baris ${i+1}: ${e.message}`);
    }
  });
  resultOutput.textContent = (result.trim() ? result : '') + (errors.length ? ("\n\n[Error]\n" + errors.join('\n')) : "");
  resultSection.style.display = "block";
});

// --- Copy button ---
copyBtn.onclick = function() {
  if (!resultOutput.textContent.trim()) return;
  navigator.clipboard.writeText(resultOutput.textContent);
  showToast("Hasil konfigurasi berhasil disalin!");
};

// --- Download button ---
downloadBtn.onclick = function(e) {
  e.preventDefault();
  if (!resultOutput.textContent.trim()) return;
  let filename = "autoconfig.txt";
  const blob = new Blob([resultOutput.textContent], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  this.href = url;
  this.setAttribute("download", filename);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

// --- Inisialisasi pertama kali ---
loadProviders();
