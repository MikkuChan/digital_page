document.addEventListener('DOMContentLoaded', function () {
  // Konfigurasi API
  const CONFIG = {
    API_BASE_URL: 'https://otp.fadzdigital.dpdns.org'
  };

  // State Management
  const loginState = {
    step: 1,
    phoneNumber: '',
    authId: '',
    accessToken: '',
    countdownTimer: null,
    countdownValue: 60
  };

  const quotaState = {
    step: 1,
    phoneNumber: '',
    authId: '',
    accessToken: '',
    countdownTimer: null,
    countdownValue: 60,
    hasActiveSession: false
  };

  // DOM Elements - Login
  const loginElements = {
    step1: document.getElementById('loginStep1'),
    step2: document.getElementById('loginStep2'),
    step3: document.getElementById('loginStep3'),
    phoneInput: document.getElementById('loginPhoneInput'),
    phoneDisplay: document.getElementById('loginPhoneDisplay'),
    phoneResult: document.getElementById('loginPhoneResult'),
    otpInput: document.getElementById('loginOtpInput'),
    countdown: document.getElementById('loginCountdown'),
    accessToken: document.getElementById('loginAccessToken'),
    requestOtpBtn: document.getElementById('loginRequestOtpBtn'),
    verifyBtn: document.getElementById('loginVerifyBtn'),
    resendBtn: document.getElementById('loginResendBtn'),
    backBtn: document.getElementById('loginBackBtn'),
    againBtn: document.getElementById('loginAgainBtn')
  };

  // DOM Elements - Quota
  const quotaElements = {
    step1: document.getElementById('quotaStep1'),
    step2: document.getElementById('quotaStep2'),
    step3: document.getElementById('quotaStep3'),
    phoneInput: document.getElementById('quotaPhoneInput'),
    phoneDisplay: document.getElementById('quotaPhoneDisplay'),
    phoneResult: document.getElementById('quotaPhoneResult'),
    otpInput: document.getElementById('quotaOtpInput'),
    countdown: document.getElementById('quotaCountdown'),
    results: document.getElementById('quotaResults'),
    checkBtn: document.getElementById('quotaCheckBtn'),
    verifyBtn: document.getElementById('quotaVerifyBtn'),
    resendBtn: document.getElementById('quotaResendBtn'),
    backBtn: document.getElementById('quotaBackBtn'),
    checkAgainBtn: document.getElementById('quotaCheckAgainBtn')
  };

  const alertContainer = document.getElementById('alertContainer');

  // Utility Functions
  function validatePhoneNumber(phone) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // Convert to 08xxxx format
    if (phone.startsWith('62')) {
      // 628xxxx → 08xxxx
      phone = '0' + phone.substring(2);
    } else if (!phone.startsWith('0')) {
      // 8xxxx → 08xxxx
      phone = '0' + phone;
    }
    
    // Validation dengan format 08xxxx
    const xlAxisPrefixes = ['0817', '0818', '0819', '0859', '0877', '0878'];
    const isXLAxis = xlAxisPrefixes.some(prefix => phone.startsWith(prefix));
    
    // Check length (11-13 digits dengan leading 0)
    const isValidLength = phone.length >= 11 && phone.length <= 13;
    
    return {
      isValid: isXLAxis && isValidLength,
      formatted: phone,
      message: !isXLAxis ? 'Nomor harus XL/Axis (dimulai 0817, 0818, 0819, 0859, 0877, 0878)' : 
               !isValidLength ? 'Panjang nomor tidak valid' : ''
    };
  }

  // Fungsi format nomor HP untuk display
  function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // Convert untuk display (+62 format)
    if (phone.startsWith('0')) {
      // 08xxxx → +628xxxx (untuk display)
      return `+62${phone.substring(1)}`;
    } else if (!phone.startsWith('62')) {
      // 8xxxx → +628xxxx
      return `+62${phone}`;
    } else {
      // 628xxxx → +628xxxx
      return `+${phone}`;
    }
  }

  function showAlert(message, type = 'info', duration = 5000) {
    const alertId = 'alert-' + Date.now();
    const alertHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
        <strong>${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</strong>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto remove after duration
    setTimeout(() => {
      const alertElement = document.getElementById(alertId);
      if (alertElement) {
        const bsAlert = new bootstrap.Alert(alertElement);
        bsAlert.close();
      }
    }, duration);
  }

  function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (loading) {
      btnText.classList.add('d-none');
      btnLoading.classList.remove('d-none');
      button.disabled = true;
    } else {
      btnText.classList.remove('d-none');
      btnLoading.classList.add('d-none');
      button.disabled = false;
    }
  }

  // Step Management Functions
  function showLoginStep(stepNumber) {
    loginElements.step1.classList.add('d-none');
    loginElements.step2.classList.add('d-none');
    loginElements.step3.classList.add('d-none');
    
    switch (stepNumber) {
      case 1:
        loginElements.step1.classList.remove('d-none');
        loginElements.phoneInput.focus();
        break;
      case 2:
        loginElements.step2.classList.remove('d-none');
        loginElements.otpInput.focus();
        break;
      case 3:
        loginElements.step3.classList.remove('d-none');
        break;
    }
    
    loginState.step = stepNumber;
  }

  function showQuotaStep(stepNumber) {
    quotaElements.step1.classList.add('d-none');
    quotaElements.step2.classList.add('d-none');
    quotaElements.step3.classList.add('d-none');
    
    switch (stepNumber) {
      case 1:
        quotaElements.step1.classList.remove('d-none');
        quotaElements.phoneInput.focus();
        break;
      case 2:
        quotaElements.step2.classList.remove('d-none');
        quotaElements.otpInput.focus();
        break;
      case 3:
        quotaElements.step3.classList.remove('d-none');
        break;
    }
    
    quotaState.step = stepNumber;
  }

  function startCountdown(type) {
    const state = type === 'login' ? loginState : quotaState;
    const elements = type === 'login' ? loginElements : quotaElements;
    
    state.countdownValue = 60;
    elements.countdown.textContent = state.countdownValue;
    elements.resendBtn.disabled = true;
    
    state.countdownTimer = setInterval(() => {
      state.countdownValue--;
      elements.countdown.textContent = state.countdownValue;
      
      if (state.countdownValue <= 0) {
        clearInterval(state.countdownTimer);
        elements.resendBtn.disabled = false;
        elements.countdown.textContent = '0';
      }
    }, 1000);
  }

  // API Functions
  async function checkActiveSession(phoneNumber) {
    try {
      const queryParams = new URLSearchParams({
        no_hp: phoneNumber
      });

      const response = await fetch(`${CONFIG.API_BASE_URL}/v2/cek_sesi_login?${queryParams}`, {
        method: 'GET'
      });

      const data = await response.json();
      
      console.log('📡 Response cek sesi login:', data);
      
      // Penyesuaian: Cek jika ada latest_access_token (dari backend update)
      // Jika ada, gunakan sebagai access token yang ada (sesi aktif)
      if (data.status === true && data.latest_access_token) {
        console.log('✅ Sesi aktif ditemukan! Menggunakan access token terbaru:', data.latest_access_token);
        return {
          success: true,
          accessToken: data.latest_access_token,
          message: data.message || 'Sesi login aktif ditemukan'
        };
      } else if (data.status === true && Array.isArray(data.data) && data.data.length > 0) {
        // Fallback jika backend belum diupdate: Ambil access_token dari item pertama (terbaru)
        const latestAccessToken = data.data[0].access_token;
        console.log('✅ Sesi aktif ditemukan (fallback)! Menggunakan access token terbaru:', latestAccessToken);
        return {
          success: true,
          accessToken: latestAccessToken,
          message: data.message || 'Sesi login aktif ditemukan'
        };
      } else {
        console.log('❌ Tidak ada sesi aktif atau response tidak valid');
        return {
          success: false,
          message: data.message || 'Tidak ada sesi login aktif'
        };
      }
    } catch (error) {
      console.error('❌ Error saat cek sesi login:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat cek sesi login'
      };
    }
  }

  async function requestOTP(phoneNumber) {
    try {
      const formData = new FormData();
      formData.append('no_hp', phoneNumber);
      formData.append('metode', 'OTP');

      const response = await fetch(`${CONFIG.API_BASE_URL}/v2/get_otp`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.status) {
        return {
          success: true,
          authId: data.data.auth_id,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Gagal mengirim OTP'
        };
      }
    } catch (error) {
      console.error('Error saat request OTP:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan koneksi. Silakan hubungi ADMIN.'
      };
    }
  }

  async function verifyOTP(phoneNumber, authId, otpCode) {
    try {
      const formData = new FormData();
      formData.append('no_hp', phoneNumber);
      formData.append('metode', 'OTP');
      formData.append('auth_id', authId);
      formData.append('kode_otp', otpCode);

      const response = await fetch(`${CONFIG.API_BASE_URL}/v2/login_sms`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.status) {
        return {
          success: true,
          accessToken: data.data.access_token,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Kode OTP salah atau expired'
        };
      }
    } catch (error) {
      console.error('Error saat verifikasi OTP:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan koneksi. Silakan hubungi ADMIN.'
      };
    }
  }

  async function getQuotaDetails(accessToken) {
    try {
      const queryParams = new URLSearchParams({
        access_token: accessToken
      });

      const response = await fetch(`${CONFIG.API_BASE_URL}/v2/detail_paket?${queryParams}`, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.status) {
        return {
          success: true,
          data: data.data,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Gagal mengambil data kuota'
        };
      }
    } catch (error) {
      console.error('Error saat mengambil detail kuota:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat mengambil data kuota'
      };
    }
  }

  function displayQuotaResults(quotaData) {
    // Process real data
    const phoneNumber = quotaData.msisdn || quotaState.phoneNumber;
    const quotas = quotaData.quotas || [];
    
    // Calculate total quota
    let totalQuota = 0;
    let remainingQuota = 0;
    
    const processedPackages = quotas.map(pkg => {
      let packageQuota = 0;
      let packageRemaining = 0;
      
      if (pkg.benefits && pkg.benefits.length > 0) {
        pkg.benefits.forEach(benefit => {
          if (benefit.quota && benefit.remaining_quota) {
            // Parse quota values (remove GB/MB and convert to GB)
            const quotaValue = parseFloat(benefit.quota.replace(/[^\d.]/g, ''));
            const remainingValue = parseFloat(benefit.remaining_quota.replace(/[^\d.]/g, ''));
            
            if (benefit.quota.includes('MB')) {
              packageQuota += quotaValue / 1024; // Convert MB to GB
              packageRemaining += remainingValue / 1024;
            } else {
              packageQuota += quotaValue;
              packageRemaining += remainingValue;
            }
          }
        });
      }
      
      totalQuota += packageQuota;
      remainingQuota += packageRemaining;
      
      return {
        name: pkg.name,
        expiry: pkg.expired_at,
        benefits: pkg.benefits || [],
        totalQuota: packageQuota,
        remainingQuota: packageRemaining
      };
    });

    // Format quota display
    const formatQuota = (value) => {
      if (value >= 1) {
        return `${value.toFixed(1)} GB`;
      } else {
        return `${(value * 1024).toFixed(0)} MB`;
      }
    };

    const resultsHTML = `
      <div class="quota-summary mb-3">
        <div class="row g-2">
          <div class="col-6">
            <div class="quota-item" style="border-left: 4px solid #3b82f6;">
              <div class="quota-value">${formatQuota(totalQuota)}</div>
              <div class="quota-label">Total</div>
            </div>
          </div>
          <div class="col-6">
            <div class="quota-item" style="border-left: 4px solid #10b981;">
              <div class="quota-value">${formatQuota(remainingQuota)}</div>
              <div class="quota-label">Sisa</div>
            </div>
          </div>
        </div>
        <div class="row g-2 mt-2">
          <div class="col-12">
            <div class="quota-item" style="border-left: 4px solid #f59e0b;">
              <div class="quota-value">${formatQuota(totalQuota - remainingQuota)}</div>
              <div class="quota-label">Terpakai</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="quota-details">
        <h6 class="fw-bold mb-2">
          <i class="bi bi-list-ul me-2"></i>Detail Paket (${processedPackages.length})
        </h6>
        ${processedPackages.length > 0 ? processedPackages.map(pkg => `
          <div class="mb-3 p-3 bg-white rounded border" style="border-left: 3px solid #10b981 !important;">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="flex-grow-1">
                <div class="fw-semibold text-dark">${pkg.name}</div>
                <small class="text-muted">
                  <i class="bi bi-calendar-event me-1"></i>
                  Exp: ${pkg.expiry}
                </small>
              </div>
              ${pkg.totalQuota > 0 ? `
                <div class="text-end">
                  <div class="fw-bold text-success">${formatQuota(pkg.remainingQuota)}</div>
                  <small class="text-muted">dari ${formatQuota(pkg.totalQuota)}</small>
                </div>
              ` : `
                <div class="text-end">
                  <span class="badge bg-success">Unlimited</span>
                </div>
              `}
            </div>
            ${pkg.benefits.length > 0 ? `
              <div class="border-top pt-2 mt-2" style="border-color: rgba(16,185,129,0.2) !important;">
                ${pkg.benefits.map(benefit => `
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small text-muted">${benefit.name}</span>
                    <span class="small fw-semibold text-success">
                      ${benefit.remaining_quota} / ${benefit.quota}
                    </span>
                  </div>
                  <div class="progress mb-2" style="height: 3px;">
                    <div class="progress-bar bg-success" 
                         style="width: ${(parseFloat(benefit.remaining_quota.replace(/[^\d.]/g, '')) / parseFloat(benefit.quota.replace(/[^\d.]/g, '')) * 100) || 0}%">
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('') : `
          <div class="text-center text-muted py-3">
            <i class="bi bi-exclamation-circle me-2"></i>
            Tidak ada paket aktif ditemukan
          </div>
        `}
      </div>
      
      <div class="mt-3 pt-3 border-top" style="border-color: rgba(16,185,129,0.2) !important;">
        <div class="alert alert-info mb-2">
          <small>
            <i class="bi bi-info-circle me-1"></i>
            <strong>Info:</strong> ${quotaData.text || 'Data kuota real-time dari server operator.'}
          </small>
        </div>
        <small class="text-muted">
          <i class="bi bi-clock me-1"></i>
          Terakhir diperbarui: ${new Date().toLocaleString('id-ID')}
        </small>
      </div>
    `;

    quotaElements.results.innerHTML = resultsHTML;
  }

  // Event Handlers - Login
  loginElements.phoneInput.addEventListener('input', function() {
    // Format input (remove non-digits and limit length)
    let value = this.value.replace(/\D/g, '');
    if (value.length > 13) value = value.substring(0, 13);
    this.value = value;
  });

  loginElements.otpInput.addEventListener('input', function() {
    // Only allow digits and limit to 6 characters
    let value = this.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    this.value = value;
  });

  loginElements.requestOtpBtn.addEventListener('click', async function() {
    const phoneValue = loginElements.phoneInput.value.trim();
    
    if (!phoneValue) {
      showAlert('Masukkan nomor HP terlebih dahulu', 'warning');
      loginElements.phoneInput.focus();
      return;
    }

    const validation = validatePhoneNumber(phoneValue);
    
    if (!validation.isValid) {
      showAlert(validation.message, 'warning');
      loginElements.phoneInput.focus();
      return;
    }

    loginState.phoneNumber = validation.formatted;
    setButtonLoading(this, true);
    
    const result = await requestOTP(loginState.phoneNumber);
    
    setButtonLoading(this, false);
    
    if (result.success) {
      loginState.authId = result.authId;
      loginElements.phoneDisplay.textContent = formatPhoneNumber(loginState.phoneNumber);
      showAlert(result.message, 'success');
      showLoginStep(2);
      startCountdown('login');
    } else {
      showAlert('Gagal mengirim OTP: ' + result.message, 'danger');
    }
  });

  loginElements.verifyBtn.addEventListener('click', async function() {
    const otpCode = loginElements.otpInput.value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
      showAlert('Masukkan kode OTP 6 digit', 'warning');
      loginElements.otpInput.focus();
      return;
    }

    setButtonLoading(this, true);
    
    const result = await verifyOTP(loginState.phoneNumber, loginState.authId, otpCode);
    
    setButtonLoading(this, false);
    
    if (result.success) {
      showAlert('Login berhasil!', 'success');
      loginState.accessToken = result.accessToken;
      loginElements.phoneResult.textContent = formatPhoneNumber(loginState.phoneNumber);
      loginElements.accessToken.textContent = result.accessToken;
      showLoginStep(3);
      
      // Clear countdown
      if (loginState.countdownTimer) {
        clearInterval(loginState.countdownTimer);
      }
    } else {
      showAlert(result.message, 'danger');
      loginElements.otpInput.value = '';
      loginElements.otpInput.focus();
    }
  });

  loginElements.resendBtn.addEventListener('click', async function() {
    setButtonLoading(this, true);
    
    const result = await requestOTP(loginState.phoneNumber);
    
    setButtonLoading(this, false);
    
    if (result.success) {
      loginState.authId = result.authId;
      showAlert('Kode OTP baru telah dikirim', 'success');
      startCountdown('login');
      loginElements.otpInput.value = '';
      loginElements.otpInput.focus();
    } else {
      showAlert(result.message, 'danger');
    }
  });

  loginElements.backBtn.addEventListener('click', function() {
    showLoginStep(1);
    loginElements.phoneInput.value = '';
    loginElements.otpInput.value = '';
    
    if (loginState.countdownTimer) {
      clearInterval(loginState.countdownTimer);
    }
  });

  loginElements.againBtn.addEventListener('click', function() {
    showLoginStep(1);
    loginElements.phoneInput.value = '';
    loginElements.otpInput.value = '';
    loginState.phoneNumber = '';
    loginState.authId = '';
    
    if (loginState.countdownTimer) {
      clearInterval(loginState.countdownTimer);
    }
  });

  // Event Handlers - Quota
  quotaElements.phoneInput.addEventListener('input', function() {
    // Format input (remove non-digits and limit length)
    let value = this.value.replace(/\D/g, '');
    if (value.length > 13) value = value.substring(0, 13);
    this.value = value;
  });

  quotaElements.otpInput.addEventListener('input', function() {
    // Only allow digits and limit to 6 characters
    let value = this.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    this.value = value;
  });

  // Fungsi utama untuk submit nomor HP - Cek sesi login dulu, gunakan access token jika ada
  quotaElements.checkBtn.addEventListener('click', async function() {
    const phoneValue = quotaElements.phoneInput.value.trim();
    
    if (!phoneValue) {
      showAlert('Masukkan nomor HP terlebih dahulu', 'warning');
      quotaElements.phoneInput.focus();
      return;
    }

    const validation = validatePhoneNumber(phoneValue);
    
    if (!validation.isValid) {
      showAlert(validation.message, 'warning');
      quotaElements.phoneInput.focus();
      return;
    }

    quotaState.phoneNumber = validation.formatted;
    setButtonLoading(this, true);
    
    // STEP 1: Cek sesi login dulu
    console.log('🔍 Mengecek sesi login aktif...');
    showAlert('Mengecek sesi login...', 'info', 3000);
    
    const sessionCheck = await checkActiveSession(quotaState.phoneNumber);
    
    if (sessionCheck.success) {
      // Sesi aktif ditemukan - Gunakan access token yang ada dan ambil data kuota
      console.log('✅ Sesi aktif ditemukan! Menggunakan access token yang ada...');
      quotaState.accessToken = sessionCheck.accessToken;
      quotaState.hasActiveSession = true;
      
      showAlert('Sesi login aktif ditemukan! Mengambil data kuota...', 'success');
      
      const quotaResult = await getQuotaDetails(quotaState.accessToken);
      
      setButtonLoading(this, false);
      
      if (quotaResult.success) {
        quotaElements.phoneResult.textContent = formatPhoneNumber(quotaState.phoneNumber);
        displayQuotaResults(quotaResult.data);
        showQuotaStep(3);
        showAlert('Data kuota berhasil dimuat menggunakan sesi aktif!', 'success');
      } else {
        // Access token bermasalah
        showAlert('❌ Access token bermasalah: ' + quotaResult.message + '. Silakan get OTP ulang untuk login baru.', 'warning', 8000);
        quotaElements.phoneInput.value = '';
        quotaElements.phoneInput.focus();
      }
      
    } else {
      // Tidak ada sesi aktif - Lanjut ke proses OTP
      console.log('❌ Tidak ada sesi aktif, lanjut ke proses OTP...');
      quotaState.hasActiveSession = false;
      
      showAlert('Tidak ada sesi aktif, mengirim kode OTP...', 'info');
      
      const otpResult = await requestOTP(quotaState.phoneNumber);
      
      setButtonLoading(this, false);
      
      if (otpResult.success) {
        quotaState.authId = otpResult.authId;
        quotaElements.phoneDisplay.textContent = formatPhoneNumber(quotaState.phoneNumber);
        showAlert(otpResult.message, 'success');
        showQuotaStep(2);
        startCountdown('quota');
      } else {
        showAlert('Gagal mengirim OTP: ' + otpResult.message, 'danger');
      }
    }
  });

  quotaElements.verifyBtn.addEventListener('click', async function() {
    const otpCode = quotaElements.otpInput.value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
      showAlert('Masukkan kode OTP 6 digit', 'warning');
      quotaElements.otpInput.focus();
      return;
    }

    setButtonLoading(this, true);
    
    const result = await verifyOTP(quotaState.phoneNumber, quotaState.authId, otpCode);
    
    if (result.success) {
      showAlert('OTP berhasil diverifikasi! Mengambil data kuota...', 'success');
      quotaState.accessToken = result.accessToken;
      
      const quotaResult = await getQuotaDetails(quotaState.accessToken);
      
      setButtonLoading(this, false);
      
      if (quotaResult.success) {
        quotaElements.phoneResult.textContent = formatPhoneNumber(quotaState.phoneNumber);
        displayQuotaResults(quotaResult.data);
        showQuotaStep(3);
        showAlert('Data kuota berhasil dimuat!', 'success');
        
        // Clear countdown
        if (quotaState.countdownTimer) {
          clearInterval(quotaState.countdownTimer);
        }
      } else {
        // Access token bermasalah setelah login baru
        showAlert('❌ Gagal mengambil data kuota: ' + quotaResult.message + '. Access token mungkin bermasalah, coba lagi.', 'warning', 8000);
        showQuotaStep(1);
        quotaElements.phoneInput.value = '';
      }
    } else {
      setButtonLoading(this, false);
      showAlert(result.message, 'danger');
      quotaElements.otpInput.value = '';
      quotaElements.otpInput.focus();
    }
  });

  quotaElements.resendBtn.addEventListener('click', async function() {
    setButtonLoading(this, true);
    
    const result = await requestOTP(quotaState.phoneNumber);
    
    setButtonLoading(this, false);
    
    if (result.success) {
      quotaState.authId = result.authId;
      showAlert('Kode OTP baru telah dikirim', 'success');
      startCountdown('quota');
      quotaElements.otpInput.value = '';
      quotaElements.otpInput.focus();
    } else {
      showAlert(result.message, 'danger');
    }
  });

  quotaElements.backBtn.addEventListener('click', function() {
    showQuotaStep(1);
    quotaElements.phoneInput.value = '';
    quotaElements.otpInput.value = '';
    
    if (quotaState.countdownTimer) {
      clearInterval(quotaState.countdownTimer);
    }
  });

  quotaElements.checkAgainBtn.addEventListener('click', function() {
    showQuotaStep(1);
    quotaElements.phoneInput.value = '';
    quotaElements.otpInput.value = '';
    quotaState.phoneNumber = '';
    quotaState.authId = '';
    
    if (quotaState.countdownTimer) {
      clearInterval(quotaState.countdownTimer);
    }
  });

  // Enter key handlers - Login
  loginElements.phoneInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginElements.requestOtpBtn.click();
    }
  });

  loginElements.otpInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginElements.verifyBtn.click();
    }
  });

  // Enter key handlers - Quota
  quotaElements.phoneInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      quotaElements.checkBtn.click();
    }
  });

  quotaElements.otpInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      quotaElements.verifyBtn.click();
    }
  });

  // Initialize - Show initial steps
  showLoginStep(1);
  showQuotaStep(1);
  
  // Console log untuk debugging
  console.log('🔒 FadzApi Gateway: Dual Column - Login OTP & Cek Kuota terpisah!');
  console.log('📱 Kolom Kiri: Login OTP saja');
  console.log('📊 Kolom Kanan: Cek Kuota dengan smart session');
});
