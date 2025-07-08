// XL: 62817/62818/62819, 62859, 62877, 62878, 62831, 62832, 62833, 62838
// Axis: 62831, 62832, 62833, 62838
const prefixXL = [
  "817","818","819","859","877","878","831","832","833","838"
];

function formatTo628(num) {
  let s = num.replace(/\D/g,'');
  if (s.startsWith("62")) return s;
  if (s.startsWith("08")) return "62" + s.slice(1);
  if (s.startsWith("8")) return "62" + s;
  if (s.startsWith("628")) return s;
  if (s.startsWith("008")) return "62" + s.slice(2);
  return s;
}

function isXLorAxis(num628) {
  // Check prefix after 62
  let pr = num628.slice(2,5);
  return prefixXL.includes(pr);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  
  // Jika sudah dalam format yang diinginkan, kembalikan langsung
  if (dateStr.includes("pukul")) return dateStr;
  
  try {
    const date = new Date(dateStr);
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  } catch (e) {
    return dateStr;
  }
}

function calculateRemainingDays(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Jika format tanggal sudah dengan "pukul", ekstrak tanggalnya saja
    if (dateStr.includes("pukul")) {
      dateStr = dateStr.split("pukul")[0].trim();
    }
    
    // Parse tanggal Indonesia (16 Juli 2025)
    const months = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    
    if (/\d+\s+[a-zA-Z]+\s+\d{4}/.test(dateStr)) {
      const parts = dateStr.split(/\s+/);
      const day = parseInt(parts[0], 10);
      const monthName = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      if (months[monthName] !== undefined) {
        const expiryDate = new Date(year, months[monthName], day);
        const today = new Date();
        
        // Reset waktu ke 00:00:00 untuk perbandingan yang akurat
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
      }
    }
    
    // Jika bukan format Indonesia, coba format ISO
    const expiryDate = new Date(dateStr);
    const today = new Date();
    
    // Reset waktu ke 00:00:00 untuk perbandingan yang akurat
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (e) {
    console.error("Error calculating days:", e);
    return null;
  }
}

function getStatusClass(days) {
  if (days === null) return "kuota-badge-primary";
  if (days < 0) return "kuota-badge-danger";
  if (days <= 3) return "kuota-badge-warning";
  return "kuota-badge-success";
}

function getStatusText(days) {
  if (days === null) return "Tidak diketahui";
  if (days < 0) return "Kadaluarsa";
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}

function formatPhoneNumber(msisdn) {
  if (!msisdn) return "-";
  
  // Format 628xxx menjadi 08xxx
  if (msisdn.startsWith("62")) {
    return "0" + msisdn.substring(2);
  }
  
  return msisdn;
}

function getProgressBarClass(percentage) {
  if (percentage >= 70) return "progress-high";
  if (percentage >= 30) return "progress-medium";
  return "progress-low";
}

function getBenefitIcon(benefit, type) {
  let iconClass = "bi-wifi";
  
  if (type === "VOICE") iconClass = "bi-telephone";
  if (type === "SMS") iconClass = "bi-chat";
  
  const benefitLower = benefit.toLowerCase();
  if (benefitLower.includes("youtube")) iconClass = "bi-youtube";
  if (benefitLower.includes("tiktok")) iconClass = "bi-tiktok";
  if (benefitLower.includes("instagram")) iconClass = "bi-instagram";
  if (benefitLower.includes("facebook")) iconClass = "bi-facebook";
  if (benefitLower.includes("whatsapp")) iconClass = "bi-whatsapp";
  if (benefitLower.includes("nelp") || benefitLower.includes("telepon")) iconClass = "bi-telephone";
  if (benefitLower.includes("sms") || benefitLower.includes("pesan")) iconClass = "bi-chat";
  if (benefitLower.includes("malam") || benefitLower.includes("midnight")) iconClass = "bi-moon";
  if (benefitLower.includes("game")) iconClass = "bi-controller";
  
  return iconClass;
}

function renderKuotaResult(data) {
  const msisdn = formatPhoneNumber(data.data.msisdn);
  const operator = data.data.operator || "-";
  const status4G = data.data.status_4G || "-";
  const dukcapilStatus = data.data.dukcapil_status || "-";
  const cardAge = data.data.card_age || "-";
  const activePeriod = formatDate(data.data.active_period);
  const gracePeriod = formatDate(data.data.grace_period);
  
  const activeDaysLeft = calculateRemainingDays(data.data.active_period);
  const activeStatusClass = getStatusClass(activeDaysLeft);
  const activeStatusText = getStatusText(activeDaysLeft);
  
  let html = `
    <div class="kuota-info-card animate__animated animate__fadeIn">
      <div class="kuota-header">
        <div>
          <h4 class="mb-1 fw-bold" style="color:#0f172a">${msisdn}</h4>
          <div class="d-flex flex-wrap gap-1 mt-2">
            <span class="kuota-badge kuota-badge-primary">
              <i class="bi bi-sim me-1"></i>${operator}
            </span>
            <span class="kuota-badge kuota-badge-primary">
              <i class="bi bi-reception-4 me-1"></i>${status4G}
            </span>
            <span class="kuota-badge kuota-badge-primary">
              <i class="bi bi-person-vcard me-1"></i>NIK: ${dukcapilStatus}
            </span>
          </div>
        </div>
        <div>
          <span class="kuota-badge ${activeStatusClass}">
            <i class="bi bi-calendar-check me-1"></i>${activeStatusText}
          </span>
        </div>
      </div>
      
      <div class="row g-3 mt-1">
        <div class="col-md-4">
          <div class="kuota-detail-item">
            <div class="kuota-detail-label">Usia Kartu</div>
            <div class="kuota-detail-value">${cardAge}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="kuota-detail-item">
            <div class="kuota-detail-label">Masa Aktif</div>
            <div class="kuota-detail-value">${activePeriod}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="kuota-detail-item">
            <div class="kuota-detail-label">Masa Tenggang</div>
            <div class="kuota-detail-value">${gracePeriod}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  if (Array.isArray(data.data.quotas) && data.data.quotas.length > 0) {
    html += `<h5 class="mb-3 fw-bold" style="color:#0f172a">Paket Aktif</h5>`;
    
    data.data.quotas.forEach((package, packageIndex) => {
      const expiryDate = package.expiry_date || "-";
      const expiryDaysLeft = calculateRemainingDays(expiryDate);
      const expiryStatusClass = getStatusClass(expiryDaysLeft);
      const expiryStatusText = getStatusText(expiryDaysLeft);
      
      html += `
        <div class="kuota-package animate__animated animate__fadeIn" style="animation-delay: ${packageIndex * 0.1}s">
          <div class="kuota-package-name">${package.name}</div>
          <div class="kuota-package-expiry">
            <i class="bi bi-clock me-2"></i>
            <span>Berlaku sampai: ${expiryDate}</span>
            <span class="kuota-badge ${expiryStatusClass} ms-2">${expiryStatusText}</span>
          </div>
      `;
      
      if (Array.isArray(package.details) && package.details.length > 0) {
        html += `<div class="mt-3">`;
        
        package.details.forEach(detail => {
          const benefit = detail.benefit || "-";
          const totalQuota = detail.total_quota || "-";
          const remainingQuota = detail.remaining_quota || "-";
          
          // Parse persentase
          let usedPercentage = 0;
          let remainingPercentage = 100;
          
          try {
            usedPercentage = parseFloat(detail.used_percentage) || 0;
            remainingPercentage = parseFloat(detail.remaining_percentage) || 100;
            
            // Normalize percentage to be between 0-100
            if (remainingPercentage > 100) remainingPercentage = 100;
            if (remainingPercentage < 0) remainingPercentage = 0;
          } catch (e) {
            console.error("Error parsing percentage:", e);
          }
          
          const iconClass = getBenefitIcon(benefit, detail.type);
          const progressBarClass = getProgressBarClass(remainingPercentage);
          
          html += `
            <div class="kuota-detail-item">
              <div class="kuota-benefit-type">
                <div class="kuota-benefit-icon">
                  <i class="bi ${iconClass}"></i>
                </div>
                <div class="kuota-benefit-name">${benefit}</div>
              </div>
              <div class="kuota-benefit-value">
                <div class="kuota-benefit-quota">${remainingQuota}</div>
                <div class="kuota-benefit-total">dari ${totalQuota}</div>
              </div>
              <div class="kuota-progress-container mt-2 w-100">
                <div class="kuota-progress-bar ${progressBarClass}" style="width: ${remainingPercentage}%"></div>
              </div>
            </div>
          `;
        });
        
        html += `</div>`;
      } else {
        html += `
          <div class="mt-3 text-center text-muted">
            <i class="bi bi-info-circle me-2"></i>Tidak ada detail kuota tersedia
          </div>
        `;
      }
      
      html += `</div>`;
    });
  } else {
    html += `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>Tidak ada paket aktif yang ditemukan</p>
      </div>
    `;
  }
  
  return html;
}

function showToast(msg) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }
  
  let t = document.createElement('div');
  t.textContent = msg;
  t.className = "toast-notification";
  document.body.appendChild(t);
  
  // Trigger reflow to enable transition
  t.offsetHeight;
  
  // Show toast
  t.classList.add('show');
  
  setTimeout(() => { 
    t.classList.remove('show'); 
  }, 2000);
  
  setTimeout(() => { 
    if (document.body.contains(t)) {
      document.body.removeChild(t); 
    }
  }, 2500);
}

function showLoadingState() {
  const hasil = document.getElementById('hasil');
  hasil.innerHTML = `
    <div class="text-center py-4">
      <div class="loading-spinner mb-3"></div>
      <p class="text-primary mb-0">Mengecek kuota XL/Axis...</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function() {
  const cekForm = document.getElementById('cekForm');
  const msisdnInput = document.getElementById('msisdn');
  const hasil = document.getElementById('hasil');
  const hasilwrap = document.getElementById('hasilwrap');
  const copyHasil = document.getElementById('copyHasil');
  const refreshHasil = document.getElementById('refreshHasil');
  
  // Add focus class to form container
  msisdnInput.addEventListener('focus', function() {
    cekForm.classList.add('form-focused');
  });
  
  msisdnInput.addEventListener('blur', function() {
    cekForm.classList.remove('form-focused');
  });
  
  // Handle form submission
  cekForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let msisdnValue = msisdnInput.value.trim();
    hasil.innerHTML = "";
    hasilwrap.style.display = "none";
    
    // Format & validasi input
    let msisdn = formatTo628(msisdnValue);
    if (!/^(62)(8\d{8,13})$/.test(msisdn)) {