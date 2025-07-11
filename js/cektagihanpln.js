document.addEventListener('DOMContentLoaded', function() {
    // Elemen-elemen UI
    const loadingOverlay = document.getElementById('loadingOverlay');
    const cekTagihanForm = document.getElementById('cekTagihanForm');
    const customerIdInput = document.getElementById('customerId');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    const resultContainer = document.getElementById('resultContainer');
    const resultCustomerId = document.getElementById('resultCustomerId');
    
    // Format angka ke Rupiah
    const formatRupiah = (angka) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(angka);
    };
    
    // Format tanggal ke format Indonesia
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const options = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    // Validasi input
    const validateInput = (customerId) => {
        if (!customerId) {
            return {
                valid: false,
                message: "Silakan masukkan ID Pelanggan atau Nomor Meter PLN."
            };
        }
        
        if (!/^\d+$/.test(customerId)) {
            return {
                valid: false,
                message: "ID Pelanggan hanya boleh berisi angka."
            };
        }
        
        if (customerId.length < 10 || customerId.length > 13) {
            return {
                valid: false,
                message: "ID Pelanggan harus terdiri dari 10-13 digit angka."
            };
        }
        
        return { valid: true };
    };
    
    // Menampilkan pesan error
    const showError = (message) => {
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        resultContainer.style.display = 'none';
    };
    
    // Menyembunyikan pesan error
    const hideError = () => {
        errorContainer.style.display = 'none';
    };
    
    // Menampilkan loading
    const showLoading = () => {
        loadingIndicator.style.display = 'flex';
    };
    
    // Menyembunyikan loading
    const hideLoading = () => {
        loadingIndicator.style.display = 'none';
    };
    
    // Mengambil data dari API
    const fetchBillingData = async (customerId) => {
        showLoading();
        hideError();
        
        try {
            // URL API worker dengan penambahan timestamp untuk menghindari cache
            const apiUrl = `https://cekpln.vpnfadzdigital.dpdns.org/api-pln/billing?customerId=${customerId}&t=${Date.now()}`;
            
            console.log('Mengakses:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            // Debugging response
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMsg = errorData?.message || await response.text() || 'Error tidak diketahui';
                throw new Error(`[${response.status}] ${errorMsg}`);
            }
            
            const data = await response.json();
            console.log('Data diterima:', data);
            
            if (data.status !== "success") {
                throw new Error(data.message || "Response API tidak valid");
            }
            
            displayBillingData(data.data);
            return true;
            
        } catch (error) {
            console.error('Fetch error:', error);
            showError(formatErrorMessage(error.message));
            return false;
        } finally {
            hideLoading();
        }
    };
    
    // Format pesan error untuk ditampilkan ke user
    const formatErrorMessage = (error) => {
        if (error.includes('[403]')) {
            return "Akses ditolak. Pastikan domain ini diizinkan mengakses API.";
        }
        if (error.includes('[404]')) {
            return "Data tidak ditemukan. Periksa kembali ID Pelanggan.";
        }
        if (error.includes('Failed to fetch')) {
            return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
        }
        return error || "Terjadi kesalahan tidak terduga. Silakan coba lagi.";
    };
    
    // Menampilkan data tagihan
    const displayBillingData = (data) => {
        try {
            if (!data || !data.customer || !data.billing) {
                throw new Error("Format data tidak valid");
            }
            
            // Data pelanggan
            document.getElementById('customerName').textContent = data.customer.name || '-';
            document.getElementById('customerId_display').textContent = data.customer.id || '-';
            document.getElementById('powerRate').textContent = data.customer.powerRate || '-';
            document.getElementById('customerAddress').textContent = data.customer.address || '-';
            resultCustomerId.textContent = data.customer.id || '-';
            
            // Data tagihan
            document.getElementById('billPeriod').textContent = data.billing.period || '-';
            document.getElementById('referenceNo').textContent = data.billing.invoiceNumber || '-';
            document.getElementById('billAmount').textContent = formatRupiah(data.billing.amount || 0);
            document.getElementById('dueDate').textContent = formatDate(data.billing.dueDate);
            
            // Status tagihan
            const billStatus = document.getElementById('billStatus');
            billStatus.textContent = data.billing.status || '-';
            if (data.billing.status === "BELUM DIBAYAR") {
                billStatus.classList.add('text-danger');
                billStatus.classList.remove('text-success');
            } else if (data.billing.status === "LUNAS") {
                billStatus.classList.add('text-success');
                billStatus.classList.remove('text-danger');
            }
            
            // Tampilkan hasil
            resultContainer.style.display = 'block';
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } catch (error) {
            console.error('Display error:', error);
            showError("Gagal memproses data tagihan. Format tidak valid.");
        }
    };
    
    // Event Listeners
    cekTagihanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = customerIdInput.value.trim();
        const validation = validateInput(customerId);
        
        if (!validation.valid) {
            showError(validation.message);
            return;
        }
        
        await fetchBillingData(customerId);
    });
    
    customerIdInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value.length > 0) {
            hideError();
        }
    });
    
    // Tombol aksi
    document.getElementById('payNowBtn').addEventListener('click', () => {
        alert('Untuk pembayaran, silakan gunakan aplikasi pembayaran resmi PLN atau mitra pembayaran terdaftar.');
    });
    
    document.getElementById('printBtn').addEventListener('click', () => {
        window.print();
    });
    
    document.getElementById('checkAnotherBtn').addEventListener('click', () => {
        customerIdInput.value = '';
        resultContainer.style.display = 'none';
        hideError();
        customerIdInput.focus();
    });
    
    // Theme switcher
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    document.documentElement.className = currentTheme + '-mode';
    themeToggle.innerHTML = currentTheme === 'dark' 
        ? '<i class="bi bi-sun-fill"></i>' 
        : '<i class="bi bi-moon-fill"></i>';
    
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.className.includes('light') ? 'dark' : 'light';
        document.documentElement.className = newTheme + '-mode';
        themeToggle.innerHTML = newTheme === 'dark' 
            ? '<i class="bi bi-sun-fill"></i>' 
            : '<i class="bi bi-moon-fill"></i>';
        localStorage.setItem('theme', newTheme);
    });
    
    // Hilangkan overlay loading
    window.addEventListener('load', () => {
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 600);
        }, 400);
    });
});
