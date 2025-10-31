// ===========================
// CHATGPT PAGE JAVASCRIPT
// Enhanced with Better UX & Interactions
// ===========================

// --- API Configuration
const API_CHATGPT = "https://api.ryzumi.vip/api/ai/chatgpt";
const STORAGE_KEY = "chatgpt_last_session";

// --- Initialize on Load
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  loadLastSession();
});

// --- Initialize Application
function initializeApp() {
  // Auto-focus on text input
  setTimeout(() => {
    document.getElementById("textInput").focus();
  }, 500);
}

// --- Setup Event Listeners
function setupEventListeners() {
  // Character counter for textarea
  const textInput = document.getElementById("textInput");
  const charCounter = document.getElementById("charCounter");
  
  textInput.addEventListener("input", function() {
    const length = this.value.length;
    const maxLength = this.getAttribute("maxlength");
    charCounter.textContent = `${length}/${maxLength}`;
    
    // Warning colors
    if (length > maxLength * 0.9) {
      charCounter.classList.add("danger");
      charCounter.classList.remove("warning");
    } else if (length > maxLength * 0.7) {
      charCounter.classList.add("warning");
      charCounter.classList.remove("danger");
    } else {
      charCounter.classList.remove("warning", "danger");
    }
  });
  
  // Enter to submit (Shift+Enter for new line)
  textInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("chatForm").dispatchEvent(new Event('submit'));
    }
  });
  
  // Generate Session ID
  document.getElementById("generateSession").addEventListener("click", function() {
    const newId = randomSessionId();
    document.getElementById("sessionInput").value = newId;
    showNotification("Session ID baru berhasil dibuat!", "success");
    
    // Animation effect
    this.classList.add("btn-success");
    setTimeout(() => {
      this.classList.remove("btn-success");
    }, 1000);
  });
  
  // Copy Chat Button
  document.getElementById("copyChat").addEventListener("click", copyToClipboard);
  
  // Clear Chat Button
  document.getElementById("clearChat").addEventListener("click", clearChat);
  
  // Form Submit
  document.getElementById("chatForm").addEventListener("submit", handleFormSubmit);
}

// --- Unique Session ID Generator
function randomSessionId() {
  return (Date.now().toString(36) + Math.random().toString(36).substring(2, 14))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

// --- Load Last Session from LocalStorage
function loadLastSession() {
  const lastSession = localStorage.getItem(STORAGE_KEY);
  if (lastSession) {
    document.getElementById("sessionInput").value = lastSession;
  }
}

// --- Save Session to LocalStorage
function saveSession(sessionId) {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

// --- Handle Form Submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const text = document.getElementById("textInput").value.trim();
  const prompt = document.getElementById("promptInput").value.trim();
  const session = document.getElementById("sessionInput").value.trim();

  // Validation
  if (!text) {
    showNotification("Pesan tidak boleh kosong!", "warning");
    document.getElementById("textInput").focus();
    return;
  }
  
  if (!session) {
    showNotification("Session ID harus diisi!", "warning");
    document.getElementById("sessionInput").focus();
    return;
  }

  // Save session to localStorage
  saveSession(session);

  // Show UI Loading States
  setLoadingState(true);
  hideResult();
  hideError();
  showTypingIndicator();

  // Build API URL
  let url = `${API_CHATGPT}?text=${encodeURIComponent(text)}&session=${encodeURIComponent(session)}`;
  if (prompt) {
    url += `&prompt=${encodeURIComponent(prompt)}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    setLoadingState(false);
    hideTypingIndicator();

    if (data.success && data.result) {
      displayResult(data.result, data.session || session);
      showNotification("Berhasil mendapatkan jawaban!", "success");
    } else {
      showError(data.result || "Gagal mendapatkan jawaban dari ChatGPT. Silakan coba lagi.");
    }
  } catch (error) {
    setLoadingState(false);
    hideTypingIndicator();
    showError("Gagal terhubung ke server. Periksa koneksi internet Anda dan coba lagi.");
    console.error("API Error:", error);
  }
}

// --- Display Result
function displayResult(resultText, sessionId) {
  const resultSection = document.getElementById("resultSection");
  const chatResult = document.getElementById("chatResult");
  const sessionTag = document.getElementById("sessionTag");
  
  chatResult.textContent = resultText;
  sessionTag.textContent = `Session: ${sessionId}`;
  
  resultSection.style.display = "block";
  
  // Smooth scroll to result
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

// --- Hide Result Section
function hideResult() {
  document.getElementById("resultSection").style.display = "none";
}

// --- Show Error Message
function showError(message) {
  const errorSection = document.getElementById("errorSection");
  errorSection.innerHTML = `
    <div class="alert alert-danger d-flex align-items-center mb-2" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <div>${message}</div>
    </div>
  `;
  errorSection.style.display = "block";
  
  // Smooth scroll to error
  setTimeout(() => {
    errorSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

// --- Hide Error Section
function hideError() {
  document.getElementById("errorSection").style.display = "none";
}

// --- Show Typing Indicator
function showTypingIndicator() {
  document.getElementById("typingIndicator").style.display = "flex";
}

// --- Hide Typing Indicator
function hideTypingIndicator() {
  document.getElementById("typingIndicator").style.display = "none";
}

// --- Set Loading State for Submit Button
function setLoadingState(isLoading) {
  const btn = document.getElementById("askBtn");
  
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Memproses Permintaan...
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <i class="bi bi-send me-2"></i>Tanya ChatGPT Sekarang
    `;
  }
}

// --- Copy to Clipboard
function copyToClipboard() {
  const chatText = document.getElementById("chatResult").textContent;
  
  if (!chatText || chatText.trim() === "") {
    showNotification("Tidak ada teks untuk disalin!", "warning");
    return;
  }

  navigator.clipboard.writeText(chatText).then(() => {
    const btn = document.getElementById("copyChat");
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = `<i class="bi bi-clipboard-check-fill"></i> Berhasil Disalin!`;
    btn.classList.add("copied");
    btn.classList.remove("btn-success");
    btn.classList.add("btn-info");
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove("copied", "btn-info");
      btn.classList.add("btn-success");
    }, 2000);
    
    showNotification("Jawaban berhasil disalin ke clipboard!", "success");
  }).catch(err => {
    showNotification("Gagal menyalin teks. Coba lagi.", "danger");
    console.error("Copy error:", err);
  });
}

// --- Clear Chat
function clearChat() {
  if (!confirm("Yakin ingin menghapus percakapan ini?")) {
    return;
  }
  
  document.getElementById("textInput").value = "";
  document.getElementById("promptInput").value = "";
  hideResult();
  hideError();
  
  showNotification("Percakapan berhasil dihapus!", "info");
  
  // Reset character counter
  document.getElementById("charCounter").textContent = "0/2000";
  document.getElementById("charCounter").classList.remove("warning", "danger");
  
  // Focus back to input
  document.getElementById("textInput").focus();
}

// --- Toast Notification System
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existing = document.querySelector(".custom-toast");
  if (existing) {
    existing.remove();
  }
  
  const colors = {
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6"
  };
  
  const icons = {
    success: "bi-check-circle-fill",
    danger: "bi-x-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill"
  };
  
  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    border-left: 4px solid ${colors[type]};
    animation: slideInRight 0.3s ease;
    max-width: 400px;
  `;
  
  toast.innerHTML = `
    <i class="bi ${icons[type]}" style="color: ${colors[type]}; font-size: 1.3em;"></i>
    <span style="color: #1f2937; font-weight: 500;">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Add animation styles dynamically
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);