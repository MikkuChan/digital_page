// --- Konfigurasi Endpoint
const API_DEEPSEEK = "https://api.ryzumi.vip/api/ai/deepseek";

// --- Unique ID Generator
function randomSessionId() {
  return (Date.now().toString(36) + Math.random().toString(36).substring(2,14))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'')
    .slice(0,16);
}

document.getElementById("generateSession").onclick = function(){
  document.getElementById("sessionInput").value = randomSessionId();
};

// --- Handle Form Submit
document.getElementById("deepseekForm").onsubmit = async function(e) {
  e.preventDefault();
  const text = document.getElementById("textInput").value.trim();
  const session = document.getElementById("sessionInput").value.trim();

  // Validasi
  if (!text) {
    document.getElementById("textInput").focus();
    return;
  }
  if (!session) {
    document.getElementById("sessionInput").focus();
    return;
  }

  // Loading UI
  setLoading(true);
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("errorSection").style.display = "none";

  // Build URL ke Worker Proxy
  let url = API_DEEPSEEK + "?text=" + encodeURIComponent(text) + "&session=" + encodeURIComponent(session);

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    setLoading(false);

    if (data.status && data.answer) {
      document.getElementById("resultSection").style.display = "block";
      document.getElementById("deepseekResult").innerText = data.answer;
      document.getElementById("sessionTag").textContent = "Session: " + (data.session || session);
      document.getElementById("errorSection").style.display = "none";
    } else {
      showError(data.answer || "Gagal mendapatkan jawaban dari DeepSeek!");
    }
  } catch (err) {
    setLoading(false);
    showError("Gagal connect ke server API.");
  }
};

function setLoading(loading) {
  const btn = document.getElementById("askBtn");
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Memproses...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-send me-2"></i>Tanya DeepSeek`;
  }
}

// --- Copy Response
document.getElementById("copyDeepSeek").onclick = function() {
  const txt = document.getElementById("deepseekResult").innerText;
  if (!txt) return;
  navigator.clipboard.writeText(txt);
  this.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
  setTimeout(()=>{ this.innerHTML = `<i class="bi bi-clipboard me-1"></i>Copy Jawaban`; }, 1200);
};

function showError(msg) {
  document.getElementById("resultSection").style.display = "none";
  document.getElementById("errorSection").innerHTML = `<div class="alert alert-danger mb-2">${msg}</div>`;
  document.getElementById("errorSection").style.display = "block";
}
