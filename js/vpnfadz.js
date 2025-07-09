// vpn-handler.js
const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';
const API_KEY = 'fadz-gateway-2024-premium'; // Ganti dengan API key Anda

// Show/hide password field untuk SSH
document.getElementById('vpnType').addEventListener('change', function() {
  const passwordField = document.getElementById('passwordField');
  if (this.value === 'ssh') {
    passwordField.style.display = 'block';
  } else {
    passwordField.style.display = 'none';
  }
});

// Handle form submission
document.getElementById('vpnForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = {
    type: document.getElementById('vpnType').value,
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    expired: document.getElementById('expired').value,
    quota: document.getElementById('quota').value,
    iplimit: document.getElementById('iplimit').value,
    server: document.getElementById('server').value
  };
  
  // Validasi
  if (!formData.type || !formData.username || !formData.expired || !formData.quota || !formData.iplimit) {
    alert('Mohon lengkapi semua field yang diperlukan!');
    return;
  }
  
  // Cek apakah username sudah ada (opsional - bisa pakai localStorage)
  const existingAccounts = JSON.parse(localStorage.getItem('vpn_accounts') || '[]');
  if (existingAccounts.some(acc => acc.username === formData.username && acc.type === formData.type)) {
    alert('Username sudah digunakan untuk tipe VPN ini!');
    return;
  }
  
  // Show loading
  document.getElementById('vpnForm').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  
  try {
    // Panggil worker gateway
    const result = await createVPNAccount(formData);
    
    if (result.status === 'success') {
      // Simpan ke localStorage untuk tracking
      existingAccounts.push({
        username: formData.username,
        type: formData.type,
        created: new Date().toISOString(),
        expired: result.expired
      });
      localStorage.setItem('vpn_accounts', JSON.stringify(existingAccounts));
      
      // Tampilkan hasil
      showResult(result, formData.type);
      
      // Kirim email konfirmasi (opsional)
      // await sendConfirmationEmail(result);
      
    } else {
      throw new Error(result.message || 'Gagal membuat akun VPN');
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('Terjadi kesalahan: ' + error.message);
    
    // Show form again
    document.getElementById('vpnForm').style.display = 'block';
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
});

// Fungsi untuk memanggil worker gateway
async function createVPNAccount(formData) {
  const endpoint = `/create${formData.type}`;
  
  // Buat URL dengan parameter
  const url = new URL(endpoint, WORKER_URL);
  url.searchParams.set('user', formData.username);
  url.searchParams.set('exp', formData.expired);
  url.searchParams.set('quota', formData.quota);
  url.searchParams.set('iplimit', formData.iplimit);
  
  // Tambahkan password untuk SSH jika ada
  if (formData.type === 'ssh' && formData.password) {
    url.searchParams.set('pass', formData.password);
  }
  
  // Tambahkan server preference jika ada
  if (formData.server) {
    url.searchParams.set('server', formData.server);
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Fungsi untuk menampilkan hasil
function showResult(result, type) {
  const resultDiv = document.getElementById('result');
  
  let configHTML = '';
  
  if (type === 'ssh') {
    configHTML = `
      <div class="config-section">
        <h3>📱 Informasi Login SSH</h3>
        <div class="config-item">
          <strong>Username:</strong> ${result.username}<br>
          <strong>Password:</strong> ${result.password}<br>
          <strong>Domain:</strong> ${result.domain}<br>
          <strong>Login URL:</strong> <code>${result.login_url}</code>
        </div>
        <button onclick="downloadConfig('${result.account_file}')">Download File Konfigurasi</button>
      </div>
    `;
  } else {
    configHTML = `
      <div class="config-section">
        <h3>📱 Konfigurasi ${type.toUpperCase()}</h3>
        <div class="config-item">
          <strong>Username:</strong> ${result.username}<br>
          <strong>UUID:</strong> ${result.uuid}<br>
          <strong>Domain:</strong> ${result.domain}
        </div>
        
        <div class="config-links">
          <h4>Link Konfigurasi:</h4>
          <div class="config-link">
            <strong>WebSocket TLS:</strong><br>
            <textarea readonly onclick="this.select()">${result.ws_tls}</textarea>
            <button onclick="copyToClipboard('${result.ws_tls}')">Copy</button>
          </div>
          
          ${result.ws_ntls ? `
          <div class="config-link">
            <strong>WebSocket Non-TLS:</strong><br>
            <textarea readonly onclick="this.select()">${result.ws_ntls}</textarea>
            <button onclick="copyToClipboard('${result.ws_ntls}')">Copy</button>
          </div>
          ` : ''}
          
          <div class="config-link">
            <strong>gRPC:</strong><br>
            <textarea readonly onclick="this.select()">${result.grpc}</textarea>
            <button onclick="copyToClipboard('${result.grpc}')">Copy</button>
          </div>
        </div>
        
        <button onclick="downloadConfig('${result.config_url}')">Download File Konfigurasi</button>
      </div>
    `;
  }
  
  resultDiv.innerHTML = `
    <div class="success-result">
      <h2>✅ Akun VPN Berhasil Dibuat!</h2>
      
      <div class="account-info">
        <h3>📋 Informasi Akun</h3>
        <p><strong>Tipe:</strong> ${type.toUpperCase()}</p>
        <p><strong>Username:</strong> ${result.username}</p>
        <p><strong>Expired:</strong> ${result.expired}</p>
        <p><strong>Quota:</strong> ${result.quota_gb} GB</p>
        <p><strong>IP Limit:</strong> ${result.ip_limit} device</p>
        <p><strong>Server:</strong> ${result.server_info.nama} (${result.server_info.lokasi})</p>
        <p><strong>Dibuat:</strong> ${result.created}</p>
      </div>
      
      ${configHTML}
      
      <div class="instructions">
        <h3>📖 Cara Penggunaan</h3>
        <ol>
          <li>Download aplikasi ${type === 'ssh' ? 'SSH client (seperti ConnectBot, Termius)' : 'VPN client yang sesuai'}</li>
          <li>Import konfigurasi yang telah disediakan</li>
          <li>Atau copy-paste link konfigurasi ke aplikasi</li>
          <li>Koneksi dan nikmati internet bebas!</li>
        </ol>
      </div>
      
      <div class="support">
        <p>💬 Butuh bantuan? Hubungi support kami di WhatsApp atau Telegram</p>
        <button onclick="location.reload()">Buat Akun Lagi</button>
      </div>
    </div>
  `;
  
  resultDiv.style.display = 'block';
}

// Fungsi utility
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Konfigurasi berhasil dicopy!');
  });
}

function downloadConfig(url) {
  window.open(url, '_blank');
}

// Load daftar server saat halaman dimuat
window.addEventListener('load', async function() {
  try {
    const response = await fetch(`${WORKER_URL}/servers`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (response.ok) {
      const data = await response.json();
      updateServerOptions(data.data.servers);
    }
  } catch (error) {
    console.log('Gagal load server list:', error);
  }
});

function updateServerOptions(servers) {
  const serverSelect = document.getElementById('server');
  
  // Clear existing options except first one
  while (serverSelect.children.length > 1) {
    serverSelect.removeChild(serverSelect.lastChild);
  }
  
  // Add server options
  servers.forEach(server => {
    if (server.status === 'aktif') {
      const option = document.createElement('option');
      option.value = server.id;
      option.textContent = `${server.nama} (${server.lokasi}) - Load: ${server.beban}%`;
      serverSelect.appendChild(option);
    }
  });
}
