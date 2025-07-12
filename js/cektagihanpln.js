// URL Worker API PLN
const API_URL = "https://cekpln.fadzdigital.dpdns.org/api-pln";

document.addEventListener('DOMContentLoaded', function() {
  // Element references
  const cekTagihanForm = document.getElementById('cekTagihanForm');
  const customerIdInput = document.getElementById('customerId');
  const cekBtn = document.getElementById('cekBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorContainer = document.getElementById('errorContainer');
  const errorMessage = document.getElementById('errorMessage');
  const resultContainer = document.getElementById('resultContainer');
  const checkAnotherBtn = document.getElementById('checkAnotherBtn');
  const payNowBtn = document.getElementById('payNowBtn');
  const printBtn = document.getElementById('printBtn');
  
  // Theme toggle functionality
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      document.documentElement.classList.toggle('dark-mode');
      document.documentElement.classList.toggle('light-mode');
      
      const isDarkMode = document.documentElement.classList.contains('dark-mode');
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      
      themeToggle.innerHTML = isDarkMode 
        ? '<i class="bi bi-sun-fill"></i>' 
        : '<i class="bi bi-moon-fill"></i>';
    });
    
    // Set initial theme based on localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
      themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
      themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
    }
  }
  
  // Form submission handler
  cekTagihanForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const customerId = customerIdInput.value.trim();
    
    // Validate customer ID
    if (!/^\d{10,13}$/.test(customerId)) {
      showError('ID Pelanggan/Nomor Meter harus terdiri dari 10-13 digit angka.');
      return;
    }
    
    // Check billing
    cekTagihan(customerId);
  });
  
  // Validate input (numbers only)
  customerIdInput.addEventListener('input', function(event) {
    // Only allow digits
    event.target.value = event.target.value.replace(/\D/g, '');
    
    // Limit to 13 digits
    if (event.target.value.length > 13) {
      event.target.value = event.target.value.slice(0, 13);
    }
  });
  
  // Handle other buttons
  if (checkAnotherBtn) {
    checkAnotherBtn.addEventListener('click', function() {
      resetForm();
    });
  }
  
  if (payNowBtn) {
    payNowBtn.addEventListener('click', function() {
      const customerId = document.getElementById('customerId_display').textContent;
      const amount = document.getElementById('billAmount').textContent;
      alert(`Fitur pembayaran untuk tagihan ${customerId} sebesar ${amount} akan segera tersedia.`);
    });
  }
  
  if (printBtn) {
    printBtn.addEventListener('click', function() {
      printTagihan();
    });
  }
  
  // Check billing function
  async function cekTagihan(customerId) {
    showLoading();
    
    try {
      const endpoint = `inquiry`;
      const url = `${API_URL}/${endpoint}?customer_id=${customerId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://vpn.fadzdigital.dpdns.org' // Sesuai dengan ALLOWED_ORIGIN di worker
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Akses ditolak. Domain tidak diizinkan mengakses API.');
        } else if (response.status === 404) {
          throw new Error('ID Pelanggan tidak ditemukan. Periksa kembali nomor yang Anda masukkan.');
        } else {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        displayTagihan(data.data, customerId);
      } else {
        throw new Error(data.message || 'Gagal mendapatkan data tagihan.');
      }
      
    } catch (error) {
      console.error('API Error:', error);
      showError(error.message);
    } finally {
      hideLoading();
    }
  }
  
  // Display billing result
  function displayTagihan(data, customerId) {
    // Set customer data
    document.getElementById('resultCustomerId').textContent = customerId;
    document.getElementById('customerName').textContent = data.customer_name || '-';
    document.getElementById('customerId_display').textContent = customerId;
    document.getElementById('powerRate').textContent = `${data.tariff || '-'} / ${data.power || '-'} VA`;
    document.getElementById('customerAddress').textContent = data.address || '-';
    
    // Set billing data
    document.getElementById('billPeriod').textContent = formatBillPeriod(data.bill_period);
    
    const billStatus = document.getElementById('billStatus');
    billStatus.textContent = data.status === 'PAID' ? 'Sudah Dibayar' : 'Belum Dibayar';
    billStatus.className = `stat-value ${data.status === 'UNPAID' ? 'danger' : 'success'}`;
    
    document.getElementById('dueDate').textContent = formatDate(data.due_date);
    document.getElementById('referenceNo').textContent = data.reference_id || '-';
    document.getElementById('billAmount').textContent = formatCurrency(data.bill_amount);
    
    // Show/hide elements
    cekTagihanForm.style.display = 'none';
    resultContainer.style.display = 'block';
    
    // Set pay button state
    if (payNowBtn) {
      if (data.status === 'UNPAID') {
        payNowBtn.disabled = false;
        payNowBtn.innerHTML = '<i class="bi bi-credit-card me-2"></i> Bayar Sekarang';
        payNowBtn.className = 'btn btn-success flex-grow-1';
      } else {
        payNowBtn.disabled = true;
        payNowBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i> Sudah Dibayar';
        payNowBtn.className = 'btn btn-secondary flex-grow-1';
      }
    }
  }
  
  // Reset form
  function resetForm() {
    cekTagihanForm.reset();
    cekTagihanForm.style.display = 'block';
    resultContainer.style.display = 'none';
    errorContainer.style.display = 'none';
  }
  
  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  }
  
  // Show loading indicator
  function showLoading() {
    loadingIndicator.style.display = 'flex';
    cekBtn.disabled = true;
    errorContainer.style.display = 'none';
  }
  
  // Hide loading indicator
  function hideLoading() {
    loadingIndicator.style.display = 'none';
    cekBtn.disabled = false;
  }
  
  // Format billing period
  function formatBillPeriod(period) {
    if (!period) return '-';
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    try {
      // Format: YYYY-MM
      const [year, month] = period.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    } catch (e) {
      return period;
    }
  }
  
  // Format date
  function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
  
  // Format currency
  function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '-';
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
  
  // Print billing details
  function printTagihan() {
    const customerName = document.getElementById('customerName').textContent;
    const customerId = document.getElementById('customerId_display').textContent;
    const powerRate = document.getElementById('powerRate').textContent;
    const address = document.getElementById('customerAddress').textContent;
    const period = document.getElementById('billPeriod').textContent;
    const status = document.getElementById('billStatus').textContent;
    const dueDate = document.getElementById('dueDate').textContent;
    const referenceNo = document.getElementById('referenceNo').textContent;
    const amount = document.getElementById('billAmount').textContent;
    
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Bukti Cek Tagihan PLN - ${customerId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #005bea;
          }
          .logo {
            font-weight: bold;
            font-size: 24px;
            color: #005bea;
          }
          .title {
            font-size: 18px;
            border-left: 4px solid #005bea;
            padding-left: 10px;
            margin: 25px 0 15px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .info-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
          }
          .info-table tr td:first-child {
            font-weight: bold;
            width: 40%;
            color: #555;
          }
          .amount-box {
            text-align: center;
            margin: 25px 0;
            padding: 10px;
            border: 2px dashed #005bea;
            border-radius: 8px;
          }
          .amount-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .amount-value {
            font-size: 26px;
            font-weight: bold;
            color: #005bea;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
          }
          .status-paid {
            background-color: #d1fae5;
            color: #047857;
          }
          .status-unpaid {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 14px;
            color: #666;
          }
          .timestamp {
            font-size: 12px;
            color: #999;
            margin-top: 10px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(0, 91, 234, 0.04);
            z-index: -1;
            font-weight: bold;
          }
          .print-btn {
            background-color: #005bea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            margin: 20px auto;
            display: block;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">FADZDIGITAL</div>
        
        <div class="header">
          <div class="logo">fadzdigital</div>
          <div>Bukti Cek Tagihan Listrik PLN</div>
        </div>
        
        <div class="title">Data Pelanggan</div>
        <table class="info-table">
          <tr>
            <td>Nama Pelanggan</td>
            <td>${customerName}</td>
          </tr>
          <tr>
            <td>ID Pelanggan/Meter</td>
            <td>${customerId}</td>
          </tr>
          <tr>
            <td>Tarif/Daya</td>
            <td>${powerRate}</td>
          </tr>
          <tr>
            <td>Alamat</td>
            <td>${address}</td>
          </tr>
        </table>
        
        <div class="title">Informasi Tagihan</div>
        <table class="info-table">
          <tr>
            <td>Periode Tagihan</td>
            <td>${period}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td><span class="status-badge ${status.includes('Belum') ? 'status-unpaid' : 'status-paid'}">${status}</span></td>
          </tr>
          <tr>
            <td>Jatuh Tempo</td>
            <td>${dueDate}</td>
          </tr>
          <tr>
            <td>Nomor Referensi</td>
            <td>${referenceNo}</td>
          </tr>
        </table>
        
        <div class="amount-box">
          <div class="amount-label">Total Tagihan</div>
          <div class="amount-value">${amount}</div>
        </div>
        
        <button class="print-btn no-print" onclick="window.print()">Cetak Bukti Tagihan</button>
        
        <div class="footer">
          <div>© 2025 fadzdigital. Dokumen ini hanya sebagai informasi tagihan.</div>
          <div>Untuk pembayaran resmi, gunakan channel pembayaran resmi PLN.</div>
          <div class="timestamp">Dicetak pada: ${new Date().toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        
        <script>
          // Auto print after 1 second
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }
  
  // Handle URL parameters (if any)
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');
  
  if (idParam && /^\d{10,13}$/.test(idParam)) {
    customerIdInput.value = idParam;
    setTimeout(() => {
      cekBtn.click();
    }, 500);
  }
});

