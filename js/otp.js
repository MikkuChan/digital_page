document.addEventListener('DOMContentLoaded', function () {
  const CONFIG = {
    API_BASE_URL: 'https://otp.fadzdigital.dpdns.org'
  };

  // DOM Elements
  const elements = {
    // Step 1
    step1Card: document.getElementById('step1Card'),
    phoneInput: document.getElementById('phoneInput'),
    requestOtpBtn: document.getElementById('requestOtpBtn'),
    
    // Step 2
    step2Card: document.getElementById('step2Card'),
    phoneDisplay: document.getElementById('phoneDisplay'),
    otpCodeInput: document.getElementById('otpCodeInput'),
    verifyOtpBtn: document.getElementById('verifyOtpBtn'),
    resendOtpBtn: document.getElementById('resendOtpBtn'),
    backToStep1: document.getElementById('backToStep1'),
    countdown: document.getElementById('countdown'),
    
    // Step 3
    step3Card: document.getElementById('step3Card'),
    phoneDisplayResult: document.getElementById('phoneDisplayResult'),
    quotaResults: document.getElementById('quotaResults'),
    checkAgainBtn: document.getElementById('checkAgainBtn'),
    
    // Alert
    alertContainer: document.getElementById('alertContainer')
  };

  // State
  let currentState = {
    step: 1,
    phoneNumber: '',
    authId: '',
    accessToken: '',
    countdownTimer: null,
    countdownValue: 60,
    hasActiveSession: false
  };

  // ✅ FIXED VALIDATION FUNCTION
  function validatePhoneNumber(phone) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // Convert to 08xxxx format (yang dibutuhkan API Hesda)
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

  // ✅ FIXED DISPLAY FUNCTION  
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
    
    elements.alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
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

  function showStep(stepNumber) {
    // Hide all steps
    elements.step1Card.classList.add('d-none');
    elements.step2Card.classList.add('d-none');
    elements.step3Card.classList.add('d-none');
    
    // Show current step
    switch (stepNumber) {
      case 1:
        elements.step1Card.classList.remove('d-none');
        elements.phoneInput.focus();
        break;
      case 2:
        elements.step2Card.classList.remove('d-none');
        elements.otpCodeInput.focus();
        break;
      case 3:
        elements.step3Card.classList.remove('d-none');
        break;
    }
    
    currentState.step = stepNumber;
  }

  function startCountdown() {
    currentState.countdownValue = 60;
    elements.countdown.textContent = currentState.countdownValue;
    elements.resendOtpBtn.disabled = true;
    
    currentState.countdownTimer = setInterval(() => {
      currentState.countdownValue--;
      elements.countdown.textContent = currentState.countdownValue;
      
      if (currentState.countdownValue <= 0) {
        clearInterval(currentState.countdownTimer);
        elements.resendOtpBtn.disabled = false;
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
      
      if (data.status) {
        return {
          success: true,
          accessToken: data.data.access_token,
          message: data.message
        };
      } else {
        return {
          success: false,
          message: data.message || 'Tidak ada sesi login aktif'
        };
      }
    } catch (error) {
      console.error('Error checking session:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat cek sesi login'
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
      console.error('Error getting quota details:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat mengambil data kuota'
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
      console.error('Error requesting OTP:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan koneksi. Pastikan server gateway berjalan.'
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
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan koneksi. Pastikan server gateway berjalan.'
      };
    }
  }

  function displayQuotaResults(quotaData) {
    // Process real data dari API
    const phoneNumber = quotaData.msisdn || currentState.phoneNumber;
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
      <div class="quota-summary mb-4">
        <div class="row g-3">
          <div class="col-6">
            <div class="quota-item total">
              <div class="quota-value">${formatQuota(totalQuota)}</div>
              <div class="quota-label">Total Kuota</div>
            </div>
          </div>
          <div class="col-6">
            <div class="quota-item remaining">
              <div class="quota-value">${formatQuota(remainingQuota)}</div>
              <div class="quota-label">Sisa Kuota</div>
            </div>
          </div>
        </div>
        <div class="row g-3 mt-2">
          <div class="col-12">
            <div class="quota-item usage">
              <div class="quota-value">${formatQuota(totalQuota - remainingQuota)}</div>
              <div class="quota-label">Kuota Terpakai</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="quota-details">
        <h6 class="fw-bold mb-3">
          <i class="bi bi-list-ul me-2"></i>Detail Paket (${processedPackages.length} paket)
        </h6>
        ${processedPackages.length > 0 ? processedPackages.map(pkg => `
          <div class="quota-package">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="flex-grow-1">
                <div class="package-name">${pkg.name}</div>
                <div class="package-expiry">
                  <small class="text-muted">
                    <i class="bi bi-calendar-event me-1"></i>
                    Exp: ${pkg.expiry}
                  </small>
                </div>
              </div>
              ${pkg.totalQuota > 0 ? `
                <div class="package-quota-summary text-end">
                  <div class="package-quota">${formatQuota(pkg.remainingQuota)}</div>
                  <small class="text-muted">dari ${formatQuota(pkg.totalQuota)}</small>
                </div>
              ` : `
                <div class="package-unlimited">
                  <span class="badge bg-success">Unlimited</span>
                </div>
              `}
            </div>
            ${pkg.benefits.length > 0 ? `
              <div class="package-benefits">
                ${pkg.benefits.map(benefit => `
                  <div class="benefit-item">
                    <div class="d-flex justify-content-between">
                      <span class="benefit-name">${benefit.name}</span>
                      <span class="benefit-quota">
                        ${benefit.remaining_quota} / ${benefit.quota}
                      </span>
                    </div>
                    <div class="benefit-progress">
                      <div class="progress" style="height: 4px;">
                        <div class="progress-bar bg-success" 
                             style="width: ${(parseFloat(benefit.remaining_quota) / parseFloat(benefit.quota) * 100) || 0}%">
                        </div>
                      </div>
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
      
      <div class="quota-info mt-4">
        <div class="alert alert-info">
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

    elements.quotaResults.innerHTML = resultsHTML;
  }

  // Event Handlers
  elements.phoneInput.addEventListener('input', function() {
    // Format input (remove non-digits and limit length)
    let value = this.value.replace(/\D/g, '');
    if (value.length > 13) value = value.substring(0, 13);
    this.value = value;
  });

  elements.otpCodeInput.addEventListener('input', function() {
    // Only allow digits and limit to 6 characters
    let value = this.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    this.value = value;
  });

  elements.requestOtpBtn.addEventListener('click', async function() {
    const phoneValue = elements.phoneInput.value.trim();
    
    if (!phoneValue) {
      showAlert('Masukkan nomor HP terlebih dahulu', 'warning');
      elements.phoneInput.focus();
      return;
    }

    const validation = validatePhoneNumber(phoneValue);
    
    if (!validation.isValid) {
      showAlert(validation.message, 'warning');
      elements.phoneInput.focus();
      return;
    }

    currentState.phoneNumber = validation.formatted;
    
    setButtonLoading(this, true);
    
    // First, check if there's an active session
    console.log('Checking for active session...');
    const sessionCheck = await checkActiveSession(currentState.phoneNumber);
    
    if (sessionCheck.success) {
      // Active session found! Skip OTP and go directly to quota
      console.log('Active session found! Skipping OTP...');
      currentState.accessToken = sessionCheck.accessToken;
      currentState.hasActiveSession = true;
      
      showAlert('Sesi login aktif ditemukan! Mengambil data kuota...', 'success');
      
      // Get quota data directly
      const quotaResult = await getQuotaDetails(currentState.accessToken);
      
      setButtonLoading(this, false);
      
      if (quotaResult.success) {
        elements.phoneDisplayResult.textContent = formatPhoneNumber(currentState.phoneNumber);
        displayQuotaResults(quotaResult.data);
        showStep(3);
        showAlert('Data kuota berhasil dimuat!', 'success');
      } else {
        showAlert('Gagal mengambil data kuota: ' + quotaResult.message, 'danger');
        // Fall back to OTP if quota fetch fails
        proceedWithOTP();
      }
    } else {
      // No active session, proceed with OTP
      console.log('No active session found, proceeding with OTP...');
      currentState.hasActiveSession = false;
      proceedWithOTP();
    }
    
    async function proceedWithOTP() {
      const result = await requestOTP(currentState.phoneNumber);
      
      setButtonLoading(elements.requestOtpBtn, false);
      
      if (result.success) {
        currentState.authId = result.authId;
        elements.phoneDisplay.textContent = formatPhoneNumber(currentState.phoneNumber);
        showAlert(result.message, 'success');
        showStep(2);
        startCountdown();
      } else {
        showAlert(result.message, 'danger');
      }
    }
  });

  elements.verifyOtpBtn.addEventListener('click', async function() {
    const otpCode = elements.otpCodeInput.value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
      showAlert('Masukkan kode OTP 6 digit', 'warning');
      elements.otpCodeInput.focus();
      return;
    }

    setButtonLoading(this, true);
    
    const result = await verifyOTP(currentState.phoneNumber, currentState.authId, otpCode);
    
    if (result.success) {
      showAlert('OTP berhasil diverifikasi! Mengambil data kuota...', 'success');
      currentState.accessToken = result.accessToken;
      
      // Get real quota data
      const quotaResult = await getQuotaDetails(currentState.accessToken);
      
      setButtonLoading(this, false);
      
      if (quotaResult.success) {
        elements.phoneDisplayResult.textContent = formatPhoneNumber(currentState.phoneNumber);
        displayQuotaResults(quotaResult.data);
        showStep(3);
        showAlert('Data kuota berhasil dimuat!', 'success');
        
        // Clear countdown
        if (currentState.countdownTimer) {
          clearInterval(currentState.countdownTimer);
        }
      } else {
        showAlert('OTP berhasil, tapi gagal mengambil data kuota: ' + quotaResult.message, 'warning');
        // Still show success step but with error message
        elements.phoneDisplayResult.textContent = formatPhoneNumber(currentState.phoneNumber);
        elements.quotaResults.innerHTML = `
          <div class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
            <h5 class="mt-3">Gagal Mengambil Data Kuota</h5>
            <p>Login berhasil, tapi terjadi kesalahan saat mengambil data kuota.</p>
            <p class="small text-muted">${quotaResult.message}</p>
          </div>
        `;
        showStep(3);
        
        if (currentState.countdownTimer) {
          clearInterval(currentState.countdownTimer);
        }
      }
    } else {
      setButtonLoading(this, false);
      showAlert(result.message, 'danger');
      elements.otpCodeInput.value = '';
      elements.otpCodeInput.focus();
    }
  });

  elements.resendOtpBtn.addEventListener('click', async function() {
    setButtonLoading(this, true);
    
    const result = await requestOTP(currentState.phoneNumber);
    
    setButtonLoading(this, false);
    
    if (result.success) {
      currentState.authId = result.authId;
      showAlert('Kode OTP baru telah dikirim', 'success');
      startCountdown();
      elements.otpCodeInput.value = '';
      elements.otpCodeInput.focus();
    } else {
      showAlert(result.message, 'danger');
    }
  });

  elements.backToStep1.addEventListener('click', function() {
    showStep(1);
    elements.phoneInput.value = '';
    elements.otpCodeInput.value = '';
    
    if (currentState.countdownTimer) {
      clearInterval(currentState.countdownTimer);
    }
  });

  elements.checkAgainBtn.addEventListener('click', function() {
    showStep(1);
    elements.phoneInput.value = '';
    elements.otpCodeInput.value = '';
    currentState.phoneNumber = '';
    currentState.authId = '';
    
    if (currentState.countdownTimer) {
      clearInterval(currentState.countdownTimer);
    }
  });

  // Enter key handlers
  elements.phoneInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      elements.requestOtpBtn.click();
    }
  });

  elements.otpCodeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      elements.verifyOtpBtn.click();
    }
  });

  // Initialize
  showStep(1);
  
  // Show configuration warning if using default values
  if (CONFIG.API_BASE_URL.includes('your-vps-ip')) {
    console.warn('⚠️ Jangan lupa ganti CONFIG.API_BASE_URL di js/otp.js dengan URL FadzApi Gateway yang sebenarnya!');
    showAlert('⚠️ Configuration belum diupdate. Cek console untuk details.', 'warning', 10000);
  }
  
  console.log('🔒 FadzApi Gateway: Kredensial disimpan aman di server, tidak di frontend!');
});