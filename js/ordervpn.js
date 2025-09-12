/* ordervpn.js */

const API_BASE = (window.API_BASE || '').replace(/\/+$/, '') || `${location.origin}`;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000;

// ---------- GET ELEMENTS ----------
const formEl      = document.getElementById('orderForm');
const usernameEl  = document.getElementById('username');
const emailEl     = document.getElementById('email');
const protocolEl  = document.getElementById('protocol');
const variantSel  = document.getElementById('variant');
const regionSel   = document.getElementById('region');
const serverSel   = document.getElementById('serverId');
const promoEl     = document.getElementById('promoCode');

// Preview
const usernameFinalPreview = document.getElementById('usernameFinalPreview');
const pricePreview   = document.getElementById('pricePreview');
const detailsPreview = document.getElementById('detailsPreview');

// Status & Hasil
const submitBtn    = document.getElementById('submitBtn');
const waitingBox   = document.getElementById('waitingBox');
const orderIdText  = document.getElementById('orderIdText');
const statusText   = document.getElementById('statusText');
const payLink      = document.getElementById('payLink');
const resultBox    = document.getElementById('resultBox');
const configTextEl = document.getElementById('configText');
const errorBox     = document.getElementById('errorBox');

// Detail Akun
const accUsername  = document.getElementById('accUsername');
const accUUID      = document.getElementById('accUUID');
const accDomain    = document.getElementById('accDomain');
const accQuota     = document.getElementById('accQuota');
const accCreated   = document.getElementById('accCreated');
const accExpired   = document.getElementById('accExpired');
const blkWsTls     = document.getElementById('blk-ws-tls');
const blkWsNtls    = document.getElementById('blk-ws-ntls');
const blkGrpc      = document.getElementById('blk-grpc');
const accWsTls     = document.getElementById('accWsTls');
const accWsNtls    = document.getElementById('accWsNtls');
const accGrpc      = document.getElementById('accGrpc');
const copyAllBtn   = document.getElementById('copyAllBtn');
const downloadBtn  = document.getElementById('downloadConfigBtn');

// ---------- STATE ----------
let CFG = null; // Hasil dari GET /config
let pollTimer = null;

// ---------- UI UTILS ----------
const show = (el) => { if (el) el.style.display = ''; };
const hide = (el) => { if (el) el.style.display = 'none'; };
const setText = (el, t) => { if (el) el.textContent = t ?? ''; };
const htmlEscape = (s) => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function showError(msg) {
    if (!errorBox) return;
    errorBox.innerHTML = `<div class="alert alert-danger">${htmlEscape(msg)}</div>`;
    show(errorBox);
    setLoading(false);
}

function clearError() {
    if (errorBox) {
        errorBox.innerHTML = '';
        hide(errorBox);
    }
}

function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
        ? `<span class="spinner-border spinner-border-sm me-2"></span> Memproses...`
        : `<i class="bi bi-shield-check me-2"></i>Lanjutkan ke Pembayaran`;
}

// ---------- HELPERS ----------
const randomSuffix3 = () => Math.floor(100 + Math.random() * 900).toString();
const baseSanitize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 20);
const buildUsernameFinal = (base) => `${baseSanitize(base)}-${randomSuffix3()}`.slice(0, 24);
const rupiah = (n) => (n || 0).toLocaleString('id-ID');

// ---------- CHAINED DROPDOWN LOGIC ----------

async function initializeForm() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        CFG = await response.json();
        
        variantSel.disabled = false;
        regionSel.disabled = true;
        serverSel.disabled = true;
        
        regionSel.innerHTML = '<option>Pilih Varian Dahulu</option>';
        serverSel.innerHTML = '<option>Pilih Region Dahulu</option>';
        
        updatePreview();
    } catch (error) {
        console.error("Gagal memuat konfigurasi dari API:", error);
        showError("Gagal memuat daftar server. Silakan muat ulang halaman.");
    }
}

function onVariantChange() {
    const selectedVariant = variantSel.value;

    if (!selectedVariant) {
        regionSel.innerHTML = '<option>Pilih Varian Dahulu</option>';
        serverSel.innerHTML = '<option>Pilih Region Dahulu</option>';
        regionSel.disabled = true;
        serverSel.disabled = true;
        updatePreview();
        return;
    }
    
    const regions = CFG.variants?.[selectedVariant] || {};
    const availableRegions = [];
    if (regions.ID && regions.ID.length > 0) availableRegions.push({ value: 'ID', text: 'Indonesia' });
    if (regions.SG && regions.SG.length > 0) availableRegions.push({ value: 'SG', text: 'Singapore' });
    
    regionSel.innerHTML = ''; 
    if (availableRegions.length > 0) {
        regionSel.innerHTML = '<option value="">-- Pilih Region --</option>';
        availableRegions.forEach(reg => {
            const option = document.createElement('option');
            option.value = reg.value;
            option.textContent = reg.text;
            regionSel.appendChild(option);
        });
        regionSel.disabled = false;
    } else {
        regionSel.innerHTML = '<option>Varian ini tidak tersedia</option>';
        regionSel.disabled = true;
    }
    
    serverSel.innerHTML = '<option>Pilih Region Dahulu</option>';
    serverSel.disabled = true;
    
    updatePreview();
}

function onRegionChange() {
    const selectedVariant = variantSel.value;
    const selectedRegion = regionSel.value;
    
    if (!selectedRegion) {
        serverSel.innerHTML = '<option>Pilih Region Dahulu</option>';
        serverSel.disabled = true;
        updatePreview();
        return;
    }
    
    const servers = CFG.variants?.[selectedVariant]?.[selectedRegion] || [];
    serverSel.innerHTML = '';
    
    if (servers.length > 0) {
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = `${server.label} — Rp ${rupiah(server.price)}`;
            option.dataset.price = server.price;
            option.dataset.label = server.label;
            serverSel.appendChild(option);
        });
        serverSel.disabled = false;
        updatePreview();  
    } else {
        serverSel.innerHTML = '<option>Tidak ada server</option>';
        serverSel.disabled = true;
        updatePreview();
    }
}

function updatePreview() {
    setText(usernameFinalPreview, buildUsernameFinal(usernameEl.value || 'user'));

    const selectedOption = serverSel.options[serverSel.selectedIndex];
    if (serverSel.disabled || !selectedOption || !selectedOption.dataset.price) {
        setText(pricePreview, `Rp 0 / 30 hari`);
        setText(detailsPreview, "Lengkapi pilihan di atas");
        return;
    }
    
    const basePrice = parseInt(selectedOption.dataset.price, 10);
    let finalPrice = basePrice;

    const promoCode = promoEl.value.trim().toLowerCase();
    if (promoCode && CFG.promo?.status === 'online') {
        const validCodes = CFG.promo.codes.map(c => c.toLowerCase());
        if (validCodes.includes(promoCode)) {
            finalPrice = Math.max(0, basePrice - (CFG.promo.discount || 0));
        }
    }
    
    setText(pricePreview, `Rp ${rupiah(finalPrice)} / 30 hari`);
    const regionLabel = regionSel.options[regionSel.selectedIndex]?.text || '';
    const variantLabel = variantSel.options[variantSel.selectedIndex]?.text || '';
    setText(detailsPreview, `${variantLabel} • ${regionLabel} • ${selectedOption.dataset.label}`);
}

// ---------- Submit, Poll, Show Result ----------
async function handleSubmit(event) {
    event.preventDefault();
    clearError();
    hide(resultBox);
    hide(waitingBox);

    const username = baseSanitize(usernameEl.value || '');
    if (!username) return showError('Username wajib diisi.');
    
    const email = (emailEl.value || '').trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Format email tidak valid.');

    if (!serverSel.value || serverSel.disabled || serverSel.options[serverSel.selectedIndex]?.disabled) {
        return showError('Varian, Region, dan Server harus dipilih.');
    }

    const payload = {
        variant: variantSel.value,
        region: regionSel.value,
        serverId: serverSel.value,
        promoCode: promoEl.value.trim(),
        protocol: protocolEl.value,
        username,
        usernameFinal: usernameFinalPreview.textContent,
        email
    };

    setLoading(true);
    try {
        const response = await fetch(`${API_BASE}/pay/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        setLoading(false);

        if (!response.ok) {
            return showError(data?.message || 'Gagal membuat invoice.');
        }

        const { orderId, paymentUrl } = data;
        localStorage.setItem('fdz_last_order', orderId);
        setText(orderIdText, orderId);
        statusText.textContent = 'Menunggu pembayaran...';
        statusText.className = 'badge bg-warning text-dark';
        payLink.href = paymentUrl;
        show(waitingBox);
        window.open(paymentUrl, '_blank', 'noopener');
        pollStatus(orderId);
    } catch (error) {
        setLoading(false);
        showError('Gagal terhubung ke API. Periksa koneksi Anda.');
        console.error("Submit error:", error);
    }
}

async function pollStatus(orderId) {
    const startTime = Date.now();
    stopPoll();

    const tick = async () => {
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
            statusText.textContent = 'Timeout. Silakan buka halaman pembayaran lagi.';
            statusText.className = 'badge bg-secondary';
            stopPoll();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/pay/status?orderId=${encodeURIComponent(orderId)}`);
            const data = await response.json();
            
            if (!response.ok) {
                statusText.textContent = 'Order tidak ditemukan / error.';
                statusText.className = 'badge bg-danger';
                stopPoll();
                return;
            }

            const status = (data.status || '').toUpperCase();
            if (status === 'PAID') {
                statusText.textContent = 'Pembayaran diterima ✔';
                statusText.className = 'badge bg-success';
                showResultConfig(data);
                stopPoll();
            } else if (status === 'FAILED') {
                statusText.textContent = 'Pembayaran gagal ✖';
                statusText.className = 'badge bg-danger';
                stopPoll();
            } else {
                statusText.textContent = 'Menunggu pembayaran...';
                statusText.className = 'badge bg-warning text-dark';
            }
        } catch (error) {
            console.warn("Polling error (akan dicoba lagi):", error);
        }
    };

    await tick();
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);
}

function stopPoll() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function showResultConfig(data) {
    hide(waitingBox);
    show(resultBox);
    const account = data.accountFields;
    const rawConfig = (data.accountConfig || '').trim();

    if (account && account.username) {
        hide(configTextEl);
        setText(accUsername, account.username);
        setText(accUUID, account.uuid);
        setText(accDomain, account.domain);
        setText(accQuota, `${account.quota_gb || '?'} GB`);
        setText(accCreated, account.created);
        setText(accExpired, account.expired);
        account.ws_tls ? (setText(accWsTls, account.ws_tls), show(blkWsTls)) : hide(blkWsTls);
        account.ws_ntls ? (setText(accWsNtls, account.ws_ntls), show(blkWsNtls)) : hide(blkWsNtls);
        account.grpc ? (setText(accGrpc, account.grpc), show(blkGrpc)) : hide(blkGrpc);
        setupActions(data);
    } else {
        show(configTextEl);
        configTextEl.value = rawConfig || 'Akun berhasil dibuat. Jika detail tidak muncul, hubungi admin.';
        setupActions(data);
    }
}

function buildTextDump(data) {
    if (data.accountFields && data.accountFields.username) {
        const p = data.accountFields;
        const lines = [
            '=== FADZDIGITAL VPN ACCOUNT ===',
            `Username : ${p.username || ''}`,
            `UUID     : ${p.uuid || ''}`,
            `Domain   : ${p.domain || ''}`,
            `Quota    : ${p.quota_gb || '?'} GB`,
            `Created  : ${p.created || ''}`,
            `Expired  : ${p.expired || ''}`,
            '',
            p.ws_tls ? `[WS TLS]\n${p.ws_tls}\n` : '',
            p.ws_ntls ? `[WS Non-TLS]\n${p.ws_ntls}\n` : '',
            p.grpc ? `[gRPC]\n${p.grpc}\n` : '',
            'Simpan file ini untuk impor konfigurasi.'
        ];
        return lines.filter(Boolean).join('\n');
    }
    return data.accountConfig || '';
}

function setupActions(data) {
    const textContent = buildTextDump(data);
    
    copyAllBtn.onclick = async () => {
        await navigator.clipboard.writeText(textContent);
        const originalText = copyAllBtn.innerHTML;
        copyAllBtn.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
        setTimeout(() => copyAllBtn.innerHTML = originalText, 1500);
    };

    downloadBtn.onclick = () => {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.orderId || 'vpn-account'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
}

// ---------- Event Listeners ----------
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    const lastOrder = localStorage.getItem('fdz_last_order');
    if (lastOrder) {
        setText(orderIdText, lastOrder);
        statusText.textContent = 'Memeriksa status terakhir...';
        statusText.className = 'badge bg-info';
        show(waitingBox);
        pollStatus(lastOrder);
    }
});

formEl.addEventListener('submit', handleSubmit);
variantSel.addEventListener('change', onVariantChange);
regionSel.addEventListener('change', onRegionChange);
serverSel.addEventListener('change', updatePreview);
promoEl.addEventListener('input', updatePreview);
usernameEl.addEventListener('input', updatePreview);

document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.cfg-copy');
    if (copyBtn) {
        const targetId = copyBtn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            await navigator.clipboard.writeText(targetEl.textContent);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `<i class="bi bi-check-lg"></i>`;
            setTimeout(() => copyBtn.innerHTML = originalText, 1500);
        }
    }
});
