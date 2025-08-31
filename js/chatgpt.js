/* =========================================================
 * FadzDigital — ChatGPT Web (Frontend)
 * - Kirim request via POST JSON ke Cloudflare Worker proxy
 * - Aman dari WAF (hindari query panjang di URL)
 * - Ada timeout, retry ringan, dan UI state handling
 * ======================================================= */

// --- Konfigurasi Endpoint (Worker proxy kamu)
const API_CHATGPT = "https://api.fadzdigital.store/chatgpt";

// --- Helper: Random Session ID (16 char alnum uppercase)
function randomSessionId() {
  return (Date.now().toString(36) + Math.random().toString(36).substring(2, 14))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
}

// --- Helper: Timeout fetch
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 25000 } = options; // 25s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(resource, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

// --- Elemen UI (pastikan id-nya ada di HTML)
const el = {
  form:         document.getElementById("chatForm"),
  text:         document.getElementById("textInput"),
  prompt:       document.getElementById("promptInput"),
  session:      document.getElementById("sessionInput"),
  genSession:   document.getElementById("generateSession"),
  askBtn:       document.getElementById("askBtn"),
  resultWrap:   document.getElementById("resultSection"),
  errorWrap:    document.getElementById("errorSection"),
  resultText:   document.getElementById("chatResult"),
  sessionTag:   document.getElementById("sessionTag"),
  copyBtn:      document.getElementById("copyChat"),
};

// --- Inisialisasi awal
(function init() {
  if (el.session && !el.session.value) {
    el.session.value = randomSessionId();
  }
})();

// --- Generate Session ID
if (el.genSession) {
  el.genSession.onclick = function () {
    el.session.value = randomSessionId();
  };
}

// --- UX: Enter untuk submit (kecuali Shift+Enter untuk baris baru)
if (el.text) {
  el.text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      el.form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  });
}

// --- Handle Submit
if (el.form) {
  el.form.onsubmit = async function (e) {
    e.preventDefault();

    const text = (el.text?.value || "").trim();
    const prompt = (el.prompt?.value || "").trim();
    const session = (el.session?.value || "").trim();

    // Validasi sederhana
    if (!text)  { el.text?.focus(); return; }
    if (!session){ el.session?.focus(); return; }

    setLoading(true);
    hide(el.resultWrap);
    hide(el.errorWrap);

    // Payload POST JSON
    const payload = { text, session };
    if (prompt) payload.prompt = prompt;

    try {
      // Retry ringan: 1x retry jika non-2xx atau network error
      const data = await callApiWithRetry(API_CHATGPT, payload, 1);

      setLoading(false);

      if (data && data.success && data.result) {
        show(el.resultWrap);
        el.resultText.textContent = data.result;
        el.sessionTag.textContent = "Session: " + (data.session || session);
        hide(el.errorWrap);
      } else {
        const msg = (data && (data.message || data.result)) || "Gagal mendapatkan jawaban dari ChatGPT!";
        showError(msg);
      }
    } catch (err) {
      setLoading(false);
      showError(err?.message || "Gagal connect ke server API.");
    }
  };
}

// --- Call API dengan POST JSON + retry
async function callApiWithRetry(url, jsonBody, retryCount = 0) {
  let lastErr;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Tambah "Authorization": "Bearer xxx" jika perlu
        },
        body: JSON.stringify(jsonBody),
        credentials: "omit",
        cache: "no-store",
        timeout: 25000
      });

      // Baca respons sebagai JSON jika memungkinkan
      const ct = resp.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await resp.json() : { success: false, result: await resp.text() };

      // Jika status 200-299, kembalikan apa adanya
      if (resp.ok) {
        return data;
      }

      // Jika upstream memblok (403, 429, 503) — tampilkan pesan yang jelas
      if ([403, 429, 503].includes(resp.status)) {
        const reason = data?.message || data?.result || `Server menolak (HTTP ${resp.status}).`;
        throw new Error(reason);
      }

      // Status lain: lempar agar masuk ke retry (jika masih ada jatah)
      lastErr = new Error(data?.message || data?.result || `HTTP ${resp.status}`);
      if (attempt < retryCount) continue;
      throw lastErr;

    } catch (err) {
      lastErr = err;
      if (attempt < retryCount) {
        // kecilkan jeda agar responsif
        await sleep(400);
        continue;
      }
      throw lastErr;
    }
  }
}

// --- Copy Response
if (el.copyBtn) {
  el.copyBtn.onclick = function () {
    const txt = el.resultText?.innerText || "";
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    this.innerHTML = `<i class="bi bi-clipboard-check"></i> Disalin!`;
    setTimeout(() => {
      this.innerHTML = `<i class="bi bi-clipboard me-1"></i>Copy Jawaban`;
    }, 1200);
  };
}

// --- UI Helpers
function setLoading(isLoading) {
  if (!el.askBtn) return;
  if (isLoading) {
    el.askBtn.disabled = true;
    el.askBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Memproses...`;
  } else {
    el.askBtn.disabled = false;
    el.askBtn.innerHTML = `<i class="bi bi-send me-2"></i>Tanya ChatGPT`;
  }
}

function showError(msg) {
  hide(el.resultWrap);
  if (el.errorWrap) {
    el.errorWrap.innerHTML = `<div class="alert alert-danger mb-2">${escapeHtml(msg)}</div>`;
    show(el.errorWrap);
  }
}

function show(node)  { if (node) node.style.display = "block"; }
function hide(node)  { if (node) node.style.display = "none"; }
function sleep(ms)   { return new Promise(r => setTimeout(r, ms)); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
}
