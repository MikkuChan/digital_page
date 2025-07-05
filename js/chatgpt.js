// --- Load API config
let apiCfg = {};
fetch('json/api.json')
  .then(r => r.json())
  .then(cfg => apiCfg = cfg);

// --- Unique ID Generator
function randomSessionId() {
  return (Date.now().toString(36) + Math.random().toString(36).substring(2,14)).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16);
}
document.getElementById("generateSession").onclick = function(){
  document.getElementById("sessionInput").value = randomSessionId();
};

// --- Handle Form Submit
document.getElementById("chatForm").onsubmit = async function(e) {
  e.preventDefault();
  const text = document.getElementById("textInput").value.trim();
  const prompt = document.getElementById("promptInput").value.trim();
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

  // Build url
  let url = apiCfg.chatgpt.endpoint + "?text=" + encodeURIComponent(text) + "&session=" + encodeURIComponent(session);
  if(prompt) url += "&prompt=" + encodeURIComponent(prompt);

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    setLoading(false);

    if (data.success && data.result) {
      document.getElementById("resultSection").style.display = "block";
      document.getElementById("chatResult").innerText = data.result;
      document.getElementById("sessionTag").textContent = "Session: " + (data.session||session);
      document.getElementById("errorSection").style.display = "none";
    } else {
      showError(data.result || "Gagal mendapatkan jawaban dari ChatGPT!");
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
    btn.innerHTML = `<i class="bi bi-send me-2"></i>Tanya ChatGPT`;
  }
}

// --- Copy Response
document.getElementById("copyChat").onclick = function() {
  const txt = document.getElementById("chatResult").innerText;
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
