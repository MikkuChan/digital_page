// VPN FadzDigital - Frontend JavaScript
// Konfigurasi API
const API_CONFIG = {
    AUTH_URL: 'https://vpn-auth.fadzdigital.dpdns.org', // Ganti dengan URL auth worker Anda
    API_KEY: 'Nm6LzEtVKsggGdk6bWFrqBJilLzpCqyK' // Ganti dengan API key Anda
};

// State management
let currentUser = null;
let sessionToken = null;
let pricingData = null;
let availableProtocols = null;

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Add click to close
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// API functions
async function apiRequest(endpoint, method = 'GET', data = null, requireAuth = false) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': API_CONFIG.API_KEY
        };
        
        if (requireAuth && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }
        
        const config = {
            method: method,
            headers: headers
        };
        
        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_CONFIG.AUTH_URL}${endpoint}`, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.pesan || 'Terjadi kesalahan');
        }
        
        return result;
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication functions
async function register(username, password, whatsapp) {
    const result = await apiRequest('/register', 'POST', {
        username: username,
        password: password,
        whatsapp: whatsapp
    });
    
    return result;
}

async function login(username, password) {
    const result = await apiRequest('/login', 'POST', {
        username: username,
        password: password
    });
    
    if (result.sukses) {
        sessionToken = result.data.session_token;
        currentUser = result.data;
        localStorage.setItem('sessionToken', sessionToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    return result;
}

async function logout() {
    if (sessionToken) {
        try {
            await apiRequest('/logout', 'POST', null, true);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    
    showAuthForms();
    showToast('Berhasil logout', 'success');
}

async function loadPricing() {
    try {
        const result = await apiRequest('/pricing');
        if (result.sukses) {
            pricingData = result.data.pricing;
            availableProtocols = result.data.protocols;
            renderPricingCards();
        }
    } catch (error) {
        console.error('Failed to load pricing:', error);
        showToast('Gagal memuat data harga', 'error');
    }
}

async function purchaseVPN(tipeVPN, serverRegion, protokol, customUsername = null) {
    const result = await apiRequest('/purchase', 'POST', {
        tipe_vpn: tipeVPN,
        server_region: serverRegion,
        protokol: protokol,
        custom_username: customUsername
    }, true);
    
    return result;
}

async function loadUserData() {
    try {
        const result = await apiRequest('/balance', 'GET', null, true);
        if (result.sukses) {
            currentUser = { ...currentUser, ...result.data };
            updateDashboard();
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

async function loadVPNAccounts() {
    try {
        const result = await apiRequest('/vpn-accounts', 'GET', null, true);
        if (result.sukses) {
            renderVPNAccounts(result.data);
        }
    } catch (error) {
        console.error('Failed to load VPN accounts:', error);
    }
}

async function loadTransactionHistory() {
    try {
        const result = await apiRequest('/history', 'GET', null, true);
        if (result.sukses) {
            renderTransactionHistory(result.data);
        }
    } catch (error) {
        console.error('Failed to load transaction history:', error);
    }
}

// UI functions
function showAuthForms() {
    document.getElementById('heroSection').style.display = 'block';
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('navRight').style.display = 'block';
    document.getElementById('userMenu').style.display = 'none';
}

function showDashboard() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navRight').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    
    updateDashboard();
    loadPricing();
    loadVPNAccounts();
    loadTransactionHistory();
}

function updateDashboard() {
    if (currentUser) {
        document.getElementById('userDisplayName').textContent = currentUser.username;
        document.getElementById('userBalance').textContent = formatCurrency(currentUser.saldo);
        document.getElementById('dashboardBalance').textContent = formatCurrency(currentUser.saldo);
        document.getElementById('dashboardAccounts').textContent = currentUser.total_accounts || 0;
    }
}

function renderPricingCards() {
    if (!pricingData) return;
    
    const container = document.getElementById('pricingCards');
    container.innerHTML = '';
    
    const types = [
        { key: 'hp', name: 'HP/Pribadi', desc: 'No Hotspot', icon: 'mobile-alt' },
        { key: 'stb', name: 'STB/Hotspot', desc: 'Bisa Sharing', icon: 'tv' }
    ];
    
    const regions = [
        { key: 'sg', name: 'Singapore', icon: 'globe-asia' },
        { key: 'indo', name: 'Indonesia', icon: 'flag' }
    ];
    
    types.forEach(type => {
        regions.forEach(region => {
            const price = pricingData[type.key][region.key];
            const template = pricingData[type.key].template;
            
            const card = document.createElement('div');
            card.className = 'pricing-card';
            card.innerHTML = `
                <div class="card-header">
                    <i class="fas fa-${type.icon}"></i>
                    <h4>${type.name}</h4>
                    <span class="region-badge">
                        <i class="fas fa-${region.icon}"></i>
                        ${region.name}
                    </span>
                </div>
                <div class="card-body">
                    <div class="price">${formatCurrency(price)}</div>
                    <div class="features">
                        <div class="feature">
                            <i class="fas fa-calendar"></i>
                            <span>${template.exp} hari</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-database"></i>
                            <span>${template.quota} GB</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-users"></i>
                            <span>${template.iplimit} device</span>
                        </div>
                    </div>
                    <div class="protocols">
                        <strong>Protokol:</strong>
                        ${availableProtocols[region.key].map(p => `<span class="protocol-tag">${p.toUpperCase()}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-primary btn-full select-package" 
                        data-type="${type.key}" 
                        data-region="${region.key}">
                    Pilih Paket
                </button>
            `;
            
            container.appendChild(card);
        });
    });
    
    // Add event listeners to select buttons
    document.querySelectorAll('.select-package').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const region = e.target.dataset.region;
            selectPackage(type, region);
        });
    });
}

function selectPackage(type, region) {
    document.getElementById('vpnType').value = type;
    document.getElementById('serverRegion').value = region;
    
    const typeNames = { hp: 'HP/Pribadi', stb: 'STB/Hotspot' };
    const regionNames = { sg: 'Singapore', indo: 'Indonesia' };
    
    document.getElementById('selectedType').textContent = `(${typeNames[type]})`;
    document.getElementById('selectedRegion').textContent = `(${regionNames[region]})`;
    
    // Update protocol options
    const protocolSelect = document.getElementById('vpnProtocol');
    protocolSelect.innerHTML = '<option value="">Pilih protokol...</option>';
    
    if (availableProtocols[region]) {
        availableProtocols[region].forEach(protocol => {
            const option = document.createElement('option');
            option.value = protocol;
            option.textContent = protocol.toUpperCase();
            protocolSelect.appendChild(option);
        });
    }
    
    // Update purchase summary
    updatePurchaseSummary();
    
    // Show purchase form
    document.getElementById('purchaseForm').style.display = 'block';
    document.getElementById('purchaseForm').scrollIntoView({ behavior: 'smooth' });
}

function updatePurchaseSummary() {
    const type = document.getElementById('vpnType').value;
    const region = document.getElementById('serverRegion').value;
    
    if (type && region && pricingData) {
        const price = pricingData[type][region];
        const template = pricingData[type].template;
        
        const summary = document.getElementById('purchaseSummary');
        summary.innerHTML = `
            <div class="summary-header">
                <h4>Ringkasan Pembelian</h4>
            </div>
            <div class="summary-item">
                <span>Masa Aktif:</span>
                <span>${template.exp} hari</span>
            </div>
            <div class="summary-item">
                <span>Quota:</span>
                <span>${template.quota} GB</span>
            </div>
            <div class="summary-item">
                <span>IP Limit:</span>
                <span>${template.iplimit} device</span>
            </div>
            <div class="summary-item total">
                <span>Total Harga:</span>
                <span>${formatCurrency(price)}</span>
            </div>
            <div class="balance-check ${currentUser.saldo < price ? 'insufficient' : 'sufficient'}">
                <span>Saldo Anda:</span>
                <span>${formatCurrency(currentUser.saldo)}</span>
            </div>
        `;
    }
}

function renderVPNAccounts(data) {
    const container = document.getElementById('vpnAccountsList');
    
    if (!data.active_accounts || data.active_accounts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-server"></i>
                <p>Belum ada akun VPN aktif</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    data.active_accounts.forEach(account => {
        const card = document.createElement('div');
        card.className = 'vpn-account-card';
        
        const expiredDate = new Date(account.expired_at);
        const now = new Date();
        const daysLeft = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));
        
        card.innerHTML = `
            <div class="account-header">
                <div class="account-info">
                    <h4>${account.username}</h4>
                    <span class="protocol-badge">${account.protokol.toUpperCase()}</span>
                    <span class="region-badge">${account.server_region.toUpperCase()}</span>
                    <span class="type-badge">${account.tipe_vpn.toUpperCase()}</span>
                </div>
                <div class="account-status ${daysLeft <= 3 ? 'expiring' : 'active'}">
                    ${daysLeft > 0 ? `${daysLeft} hari` : 'Expired'}
                </div>
            </div>
            <div class="account-details">
                <p><strong>Domain:</strong> ${account.domain}</p>
                <p><strong>Dibuat:</strong> ${formatDate(account.created_at)}</p>
                <p><strong>Expired:</strong> ${formatDate(account.expired_at)}</p>
            </div>
            <button class="btn btn-info btn-sm view-config" data-transaction="${account.transaction_id}">
                <i class="fas fa-eye"></i> Lihat Konfigurasi
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners for view config buttons
    document.querySelectorAll('.view-config').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const transactionId = e.target.dataset.transaction;
            await showVPNConfig(transactionId);
        });
    });
}

async function showVPNConfig(transactionId) {
    // This would fetch the detailed config from transaction history
    showToast('Fitur lihat konfigurasi akan segera tersedia', 'info');
}

function renderTransactionHistory(data) {
    const container = document.getElementById('transactionHistory');
    
    if (!data.transactions || data.transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Belum ada riwayat transaksi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    data.transactions.forEach(transaction => {
        const card = document.createElement('div');
        card.className = `transaction-card ${transaction.status}`;
        
        const statusIcon = transaction.status === 'completed' ? 'check-circle' :
                          transaction.status === 'failed' ? 'times-circle' : 'clock';
        
        const statusText = transaction.status === 'completed' ? 'Berhasil' :
                          transaction.status === 'failed' ? 'Gagal' : 'Proses';
        
        card.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-info">
                    <h4>${transaction.vpn_username}</h4>
                    <span class="transaction-id">${transaction.id}</span>
                </div>
                <div class="transaction-status ${transaction.status}">
                    <i class="fas fa-${statusIcon}"></i>
                    ${statusText}
                </div>
            </div>
            <div class="transaction-details">
                <div class="detail-row">
                    <span>Protokol:</span>
                    <span>${transaction.protokol.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span>Server:</span>
                    <span>${transaction.server_region.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span>Harga:</span>
                    <span>${formatCurrency(transaction.harga)}</span>
                </div>
                <div class="detail-row">
                    <span>Tanggal:</span>
                    <span>${formatDate(transaction.created_at)}</span>
                </div>
                ${transaction.refunded ? '<div class="refund-notice">Saldo telah dikembalikan</div>' : ''}
            </div>
            ${transaction.status === 'completed' ? `
                <button class="btn btn-success btn-sm show-result" data-transaction="${transaction.id}">
                    <i class="fas fa-download"></i> Lihat Hasil
                </button>
            ` : ''}
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners for show result buttons
    document.querySelectorAll('.show-result').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const transactionId = e.target.dataset.transaction;
            await showTransactionResult(transactionId);
        });
    });
}

async function showTransactionResult(transactionId) {
    try {
        showLoading();
        
        // Get transaction details (this would be from your API)
        const transaction = currentUser.vpn_accounts.find(acc => acc.transaction_id === transactionId);
        
        if (!transaction) {
            showToast('Data transaksi tidak ditemukan', 'error');
            return;
        }
        
        // For now, we'll simulate the VPN data structure
        const vpnData = {
            status: "success",
            username: transaction.username,
            domain: transaction.domain,
            expired: transaction.expired_at,
            protokol: transaction.protokol,
            // These would come from the actual VPN creation result stored in transaction
            ws_tls: `${transaction.protokol}://example-config-ws-tls`,
            ws_ntls: `${transaction.protokol}://example-config-ws-ntls`,
            grpc: `${transaction.protokol}://example-config-grpc`
        };
        
        showVPNResult(vpnData);
        
    } catch (error) {
        showToast('Gagal memuat hasil transaksi', 'error');
    } finally {
        hideLoading();
    }
}

function showVPNResult(vpnData) {
    const modal = document.getElementById('vpnResultModal');
    const content = document.getElementById('vpnResultContent');
    
    let configHTML = '';
    
    if (vpnData.protokol === 'ssh') {
        configHTML = `
            <div class="config-section">
                <h4><i class="fas fa-terminal"></i> Informasi SSH</h4>
                <div class="config-details">
                    <div class="detail-item">
                        <label>Username:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.username}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.username}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>Domain:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.domain}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.domain}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>Password:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.password || 'Lihat di file konfigurasi'}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.password || ''}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        configHTML = `
            <div class="config-section">
                <h4><i class="fas fa-shield-alt"></i> Konfigurasi ${vpnData.protokol.toUpperCase()}</h4>
                <div class="config-details">
                    <div class="detail-item">
                        <label>Username:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.username}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.username}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>UUID:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.uuid || 'N/A'}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.uuid || ''}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>Domain:</label>
                        <div class="copy-field">
                            <input type="text" value="${vpnData.domain}" readonly>
                            <button class="btn-copy" onclick="copyToClipboard('${vpnData.domain}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="config-links">
                <h4><i class="fas fa-link"></i> Link Konfigurasi</h4>
                
                <div class="config-link-item">
                    <label><i class="fas fa-lock"></i> WebSocket TLS:</label>
                    <div class="copy-field">
                        <textarea readonly>${vpnData.ws_tls || 'Tidak tersedia'}</textarea>
                        <button class="btn-copy" onclick="copyToClipboard('${vpnData.ws_tls || ''}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                
                ${vpnData.ws_ntls ? `
                <div class="config-link-item">
                    <label><i class="fas fa-unlock"></i> WebSocket Non-TLS:</label>
                    <div class="copy-field">
                        <textarea readonly>${vpnData.ws_ntls}</textarea>
                        <button class="btn-copy" onclick="copyToClipboard('${vpnData.ws_ntls}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                ` : ''}
                
                ${vpnData.grpc ? `
                <div class="config-link-item">
                    <label><i class="fas fa-server"></i> gRPC:</label>
                    <div class="copy-field">
                        <textarea readonly>${vpnData.grpc}</textarea>
                        <button class="btn-copy" onclick="copyToClipboard('${vpnData.grpc}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    content.innerHTML = `
        <div class="result-header">
            <div class="account-summary">
                <h3>${vpnData.username}</h3>
                <div class="summary-badges">
                    <span class="badge protocol">${vpnData.protokol.toUpperCase()}</span>
                    <span class="badge domain">${vpnData.domain}</span>
                    <span class="badge expiry">Expired: ${formatDate(vpnData.expired)}</span>
                </div>
            </div>
        </div>
        
        ${configHTML}
        
        <div class="instructions">
            <h4><i class="fas fa-info-circle"></i> Cara Penggunaan</h4>
            <ol>
                <li>Download aplikasi VPN client yang sesuai dengan protokol</li>
                <li>Copy paste link konfigurasi ke aplikasi</li>
                <li>Atau import file konfigurasi jika tersedia</li>
                <li>Koneksi dan nikmati internet bebas!</li>
            </ol>
        </div>
        
        <div class="download-section">
            <h4><i class="fas fa-download"></i> Download File</h4>
            ${vpnData.config_url ? `
                <a href="${vpnData.config_url}" target="_blank" class="btn btn-success">
                    <i class="fas fa-download"></i> Download Config File
                </a>
            ` : '<p>File konfigurasi tidak tersedia</p>'}
        </div>
    `;
    
    modal.style.display = 'block';
}

function copyToClipboard(text) {
    if (!text) {
        showToast('Tidak ada data untuk dicopy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Berhasil dicopy ke clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Gagal copy ke clipboard', 'error');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const storedToken = localStorage.getItem('sessionToken');
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedToken && storedUser) {
        sessionToken = storedToken;
        currentUser = JSON.parse(storedUser);
        showDashboard();
    }
    
    // Auth form toggles
    document.getElementById('loginShowBtn').addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authContainer').style.display = 'block';
    });
    
    document.getElementById('registerShowBtn').addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('authContainer').style.display = 'block';
    });
    
    document.getElementById('showRegisterForm').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    });
    
    document.getElementById('showLoginForm').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    // Login form
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            showToast('Username dan password harus diisi', 'warning');
            return;
        }
        
        try {
            showLoading();
            const result = await login(username, password);
            
            if (result.sukses) {
                showToast('Login berhasil!', 'success');
                showDashboard();
            } else {
                showToast(result.pesan, 'error');
            }
        } catch (error) {
            showToast(error.message || 'Gagal login', 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Register form
    document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const whatsapp = document.getElementById('registerWhatsapp').value;
        
        if (!username || !password || !whatsapp) {
            showToast('Semua field harus diisi', 'warning');
            return;
        }
        
        try {
            showLoading();
            const result = await register(username, password, whatsapp);
            
            if (result.sukses) {
                showToast('Registrasi berhasil! Tunggu konfirmasi admin.', 'success');
                // Clear form
                document.getElementById('registerFormElement').reset();
                // Show login form
                document.getElementById('registerForm').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
            } else {
                showToast(result.pesan, 'error');
            }
        } catch (error) {
            showToast(error.message || 'Gagal registrasi', 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Purchase form
    document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tipeVPN = document.getElementById('vpnType').value;
        const serverRegion = document.getElementById('serverRegion').value;
        const protokol = document.getElementById('vpnProtocol').value;
        const customUsername = document.getElementById('customUsername').value || null;
        
        if (!tipeVPN || !serverRegion || !protokol) {
            showToast('Semua field harus diisi', 'warning');
            return;
        }
        
        // Check balance
        const price = pricingData[tipeVPN][serverRegion];
        if (currentUser.saldo < price) {
            showToast('Saldo tidak cukup. Silakan topup terlebih dahulu.', 'warning');
            return;
        }
        
        try {
            showLoading();
            const result = await purchaseVPN(tipeVPN, serverRegion, protokol, customUsername);
            
            if (result.sukses) {
                showToast('Akun VPN berhasil dibuat!', 'success');
                
                // Show result
                showVPNResult(result.data.vpn_data);
                
                // Refresh dashboard
                await loadUserData();
                await loadVPNAccounts();
                await loadTransactionHistory();
                
                // Reset form
                document.getElementById('purchaseForm').style.display = 'none';
                document.getElementById('purchaseForm').reset();
            } else {
                showToast(result.pesan, 'error');
            }
        } catch (error) {
            showToast(error.message || 'Gagal membuat akun VPN', 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Cancel purchase
    document.getElementById('cancelPurchase').addEventListener('click', () => {
        document.getElementById('purchaseForm').style.display = 'none';
        document.getElementById('purchaseForm').reset();
    });
    
    // Protocol change handler
    document.getElementById('vpnProtocol').addEventListener('change', () => {
        updatePurchaseSummary();
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Modal close
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('vpnResultModal').style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('vpnResultModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});
// Global functions for copy buttons
window.copyToClipboard = copyToClipboard;