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

function renderKuotaResult(data) {
  const msisdn = data.data.msisdn;
  const operator = data.data.operator;
  const status4G = data.data.status_4G;
  const dukcapilStatus = data.data.dukcapil_status;
  const cardAge = data.data.card_age;
  const activePeriod = data.data.active_period;
  const gracePeriod = data.data.grace_period;

  let html = `
    <div class="mb-2">
      <b>Nomor:</b> ${msisdn}<br>
      <b>Operator:</b> ${operator}<br>
      <b>Status 4G:</b> ${status4G}<br>
      <b>Status Dukcapil:</b> ${dukcapilStatus}<br>
      <b>Usia Kartu:</b> ${cardAge}<br>
      <b>Masa Aktif:</b> ${activePeriod}<br>
      <b>Masa Tenggang:</b> ${gracePeriod}
    </div>
  `;

  if (Array.isArray(data.data.quotas) && data.data.quotas.length > 0) {
    html += "<b>Kuota/Paket Aktif:</b><ul>";
    for (const q of data.data.quotas) {
      html += `<li><b>${q.name}</b><br>`;
      html += `<b>Berlaku hingga:</b> ${q.expiry_date}<br>`;
      if (Array.isArray(q.details) && q.details.length > 0) {
        html += "<ul>";
        for (const d of q.details) {
          html += `
            <li>
              <span style="display:inline-block;min-width:120px">${d.benefit}:</span>
              <span class="text-primary fw-bold">${d.remaining_quota} dari ${d.total_quota}</span>
              <div class="kuota-progress-container mt-1">
                <div class="kuota-progress-bar ${getProgressBarClass(parseFloat(d.remaining_percentage))}" style="width: ${d.remaining_percentage};"></div>
              </div>
            </li>
          `;
        }
        html += "</ul>";
      }
      html += "</li>";
    }
    html += "</ul>";
  } else {
    html += "<span class='text-muted'>Tidak ada paket aktif.</span>";
  }
  
  return html;
}

function getProgressBarClass(percentage) {
  if (percentage >= 70) return "progress-high";
  if (percentage >= 30) return "progress-medium";
  return "progress-low";
}

function showToast(msg) {
  let t = document.createElement('div');
  t.textContent = msg;
  t.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4"
    + " bg-success text-white shadow-lg clash-toast";
  t.style.top = "80px";
  t.style.right = "24px";
  t.style.fontSize = "1.1em";
  t.style.opacity = 1;
  t.style.transition = "all .3s";
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = 0; }, 1300);
  setTimeout(() => { document.body.removeChild(t); }, 1800);
}

document.getElementById('cekForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  let msisdnInput = document.getElementById('msisdn').value.trim();
  let hasil = document.getElementById('hasil');
  let hasilwrap = document.getElementById('hasilwrap');
  hasil.innerHTML = "";
  hasilwrap.style.display = "none";

  // Format & validasi input
  let msisdn = formatTo628(msisdnInput);
  if (!/^(62)(8\d{8,13})$/.test(msisdn)) {
    hasil.innerHTML = "<span class='text-danger'>❌ Nomor tidak valid! Masukkan nomor XL/Axis dengan format 08xxx, 628xxx, atau +628xxx.</span>";
    hasilwrap.style.display = "block";
    return;
  }
  if (!isXLorAxis(msisdn)) {
    hasil.innerHTML = "<span class='text-danger'>❌ Nomor bukan XL/Axis!<br>Hanya mendukung nomor XL/Axis.</span>";
    hasilwrap.style.display = "block";
    return;
  }
  hasil.innerHTML = "<span class='text-info'><i class='bi bi-hourglass-split'></i> Mengecek kuota XL/Axis...</span>";
  hasilwrap.style.display = "block";
  try {
    const res = await fetch('https://cekkuota.fadzdigital.dpdns.org/cekkuota', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ msisdn })
    });
    const data = await res.json();
    if (data.error) {
      hasil.innerHTML = "<span class='text-danger'>❌ " + data.error + "</span>";
      return;
    }
    if (data.status && data.data && /xl|axis/i.test(data.data.operator || "")) {
      hasil.innerHTML = renderKuotaResult(data);
    } else {
      hasil.innerHTML = "<span class='text-danger'>❌ Nomor bukan XL/Axis, atau belum terdaftar.</span>";
    }
  } catch (err) {
    hasil.innerHTML = "<span class='text-danger'>❌ Gagal cek kuota atau koneksi!</span>";
  }
  hasilwrap.style.display = "block";
});

// Copy button
document.getElementById('copyHasil').onclick = function() {
  let hasil = document.getElementById('hasil');
  let txt = hasil.innerText || hasil.textContent || "";
  if (txt.trim()) {
    navigator.clipboard.writeText(txt);
    showToast("Hasil berhasil disalin!");
  }
};
