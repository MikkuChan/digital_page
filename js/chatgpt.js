// ===========================
// CHATGPT PAGE ULTRA JAVASCRIPT
// Premium Experience & Interactions
// ===========================

// --- Configuration
const API_CHATGPT = "https://api.ryzumi.vip/api/ai/chatgpt";
const STORAGE_KEY = "chatgpt_last_session";
const STATS_KEY = "chatgpt_stats";

// --- Global State
let requestStartTime = 0;
let totalChats = 0;

// --- Initialize on Load
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  loadLastSession();
  loadStats();
  initParticles();
});

// --- Initialize Application
function initializeApp() {
  // Auto-focus with delay for better UX
  setTimeout(() => {
    document.getElementById("textInput").focus();
  }, 600);
  
  // Show welcome animation
  showWelcomeMessage();
}

// --- Welcome Message
function showWelcomeMessage() {
  setTimeout(() => {
    showNotification("Selamat datang! Mulai chat dengan ChatGPT sekarang 🚀", "info", 4000);
  }, 1000);
}

// --- Initialize Particles Background
function initParticles() {
  const particlesBg = document.getElementById('particlesBg');
  if (!particlesBg) return;
  
  // Create floating particles
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 8 + 4}px;
      height: ${Math.random() * 8 + 4}px;
      background: radial-gradient(circle, rgba(66, 133, 244, 0.6), transparent);
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      animation: floatParticle ${Math.random() * 20 + 15}s infinite ease-in-out;
      animation-delay: ${Math.random() * 5}s;
      pointer-events: none;
    `;
    particlesBg.appendChild(particle);
  }
  
  // Add keyframes for particles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatParticle {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0;
      }
      10% {
        opacity: 0.6;
      }
      90% {
        opacity: 0.6;
      }
      50% {
        transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) scale(1.5);
        opacity: 0.8;
      }
    }
  `;
  document.head.appendChild(style);
}

// --- Setup Event Listeners
function setupEventListeners() {
  // Character counter
  const textInput = document.getElementById("textInput");
  const charCounter = document.getElementById("charCounter");
  
  textInput.addEventListener("input", function() {
    const length = this.value.length;
    const maxLength = parseInt(this.getAttribute("maxlength"));
    charCounter.textContent = `${length}/${maxLength}`;
    
    // Dynamic styling based on length
    charCounter.classList.remove("warning", "danger");
    if (length > maxLength * 0.9) {
      charCounter.classList.add("danger");
    } else if (length > maxLength * 0.7) {
      charCounter.classList.add("warning");
    }
    
    // Show warning notification
    if (length === maxLength) {
      showNotification("Batas maksimal karakter tercapai!", "warning", 2000);
    }
  });
  
  // Enhanced Enter to submit
  textInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("chatForm").dispatchEvent(new Event('submit'));
    }
  });
  
  // Auto-resize textarea
  textInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
  });
  
  // Generate Session ID with animation
  document.getElementById("generateSession").addEventListener("click", function() {
    const newId = randomSessionId();
    const input = document.getElementById("sessionInput");
    
    // Animation effect
    this.classList.add("btn-success");
    this.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Generated!';
    
    // Typewriter effect for session ID
    typewriterEffect(input, newId, () => {
      showNotification("Session ID baru berhasil dibuat!", "success", 2000);
    });
    
    setTimeout(() => {
      this.classList.remove("btn-success");
      this.innerHTML = '<i class="bi bi-stars me-1"></i> Generate Otomatis';
    }, 2000);
  });
  
  // Copy Chat Button
  document.getElementById("copyChat").addEventListener("click", copyToClipboard);
  
  // Clear Chat Button
  document.getElementById("clearChat").addEventListener("click", clearChat);
  
  // Share Chat Button
  document.getElementById("shareChat").addEventListener("click", shareChat);
  
  // Form Submit
  document.getElementById("chatForm").addEventListener("submit", handleFormSubmit);
  
  // Add smooth scroll to top button
  addScrollTopButton();
}

// --- Typewriter Effect
function typewriterEffect(element, text, callback) {
  element.value = "";
  let index = 0;
  
  const interval = setInterval(() => {
    if (index < text.length) {
      element.value += text[index];
      index++;
    } else {
      clearInterval(interval);
      if (callback) callback();
    }
  }, 50);
}

// --- Unique Session ID Generator (Enhanced)
function randomSessionId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 14);
  const combined = (timestamp + randomStr).toUpperCase();
  return combined.replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

// --- Load Last Session
function loadLastSession() {
  const lastSession = localStorage.getItem(STORAGE_KEY);
  if (lastSession) {
    document.getElementById("sessionInput").value = lastSession;
  }
}

// --- Save Session
function saveSession(sessionId) {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

// --- Load Stats
function loadStats() {
  const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalChats": 0}');
  totalChats = stats.totalChats || 0;
  updateStatsDisplay();
}

// --- Save Stats
function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify({ totalChats }));
}

// --- Update Stats Display
function updateStatsDisplay() {
  const totalChatsEl = document.getElementById("totalChats");
  if (totalChatsEl) {
    animateNumber(totalChatsEl, parseInt(totalChatsEl.textContent) || 0, totalChats);
  }
}

// --- Animate Number
function animateNumber(element, from, to, duration = 1000) {
  const start = performance.now();
  const range = to - from;
  
  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(from + range * easeOutQuad(progress));
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function easeOutQuad(t) {
  return t * (2 - t);
}

// --- Handle Form Submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const text = document.getElementById("textInput").value.trim();
  const prompt = document.getElementById("promptInput").value.trim();
  const session = document.getElementById("sessionInput").value.trim();

  // Validation with enhanced feedback
  if (!text) {
    showNotification("Pesan tidak boleh kosong!", "warning");
    document.getElementById("textInput").focus();
    shakeElement(document.getElementById("textInput"));
    return;
  }
  
  if (text.length < 3) {
    showNotification("Pesan terlalu pendek! Minimal 3 karakter.", "warning");
    document.getElementById("textInput").focus();
    return;
  }
  
  if (!session) {
    showNotification("Session ID harus diisi!", "warning");
    document.getElementById("sessionInput").focus();
    shakeElement(document.getElementById("sessionInput"));
    return;
  }

  // Save session
  saveSession(session);

  // Track request time
  requestStartTime = performance.now();

  // UI States
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
    
    const responseTime = ((performance.now() - requestStartTime) / 1000).toFixed(2);
    
    setLoadingState(false);
    hideTypingIndicator();

    if (data.success && data.result) {
      displayResult(data.result, data.session || session, responseTime);
      
      // Update stats
      totalChats++;
      saveStats();
      updateStatsDisplay();
      
      showNotification("Berhasil! Jawaban dari ChatGPT sudah siap 🎉", "success");
      
      // Scroll to result
      setTimeout(() => {
        document.getElementById("resultSection").scrollIntoView({ 
          behavior: "smooth", 
          block: "nearest" 
        });
      }, 300);
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

// --- Display Result with Animation
function displayResult(resultText, sessionId, responseTime) {
  const resultSection = document.getElementById("resultSection");
  const chatResult = document.getElementById("chatResult");
  const sessionTag = document.getElementById("sessionTag");
  const responseTimeDisplay = document.getElementById("responseTimeDisplay");
  
  // Clear previous content
  chatResult.textContent = "";
  
  // Show section
  resultSection.style.display = "block";
  
  // Typewriter effect for result
  let index = 0;
  const typeInterval = setInterval(() => {
    if (index < resultText.length) {
      chatResult.textContent += resultText[index];
      index++;
      // Auto scroll during typing
      chatResult.scrollTop = chatResult.scrollHeight;
    } else {
      clearInterval(typeInterval);
    }
  }, 10);
  
  // Update session tag
  sessionTag.textContent = `Session: ${sessionId}`;
  
  // Update response time
  if (responseTimeDisplay) {
    responseTimeDisplay.textContent = `Responded in ${responseTime}s`;
    
    // Update stats display
    const responseTimeEl = document.getElementById("responseTime");
    if (responseTimeEl) {
      responseTimeEl.textContent = `${responseTime}s`;
    }
  }
}

// --- Hide Result Section
function hideResult() {
  document.getElementById("resultSection").style.display = "none";
}

// --- Show Error with Enhanced UI
function showError(message) {
  const errorSection = document.getElementById("errorSection");
  errorSection.innerHTML = `
    <div class="alert alert-danger d-flex align-items-start mb-2" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-3 flex-shrink-0" style="font-size: 1.5em;"></i>
      <div>
        <strong>Oops! Terjadi Kesalahan</strong>
        <p class="mb-0 mt-1">${message}</p>
      </div>
    </div>
  `;
  errorSection.style.display = "block";
  
  // Scroll to error
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
  const indicator = document.getElementById("typingIndicator");
  indicator.style.display = "flex";
  
  // Add pulsing effect
  indicator.style.animation = "fadeIn 0.4s ease";
}

// --- Hide Typing Indicator
function hideTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  indicator.style.animation = "fadeOut 0.3s ease";
  setTimeout(() => {
    indicator.style.display = "none";
  }, 300);
}

// --- Set Loading State
function setLoadingState(isLoading) {
  const btn = document.getElementById("askBtn");
  const btnContent = btn.querySelector('.btn-content');
  
  if (isLoading) {
    btn.disabled = true;
    btnContent.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
      <span>Memproses Permintaan...</span>
    `;
    btn.style.cursor = "not-allowed";
  } else {
    btn.disabled = false;
    btnContent.innerHTML = `
      <i class="bi bi-send-fill me-2"></i>
      <span>Tanya ChatGPT Sekarang</span>
    `;
    btn.style.cursor = "pointer";
  }
}

// --- Copy to Clipboard with Enhanced Feedback
function copyToClipboard() {
  const chatText = document.getElementById("chatResult").textContent;
  
  if (!chatText || chatText.trim() === "" || chatText.includes("Menunggu respons")) {
    showNotification("Tidak ada teks untuk disalin!", "warning");
    shakeElement(document.getElementById("copyChat"));
    return;
  }

  navigator.clipboard.writeText(chatText).then(() => {
    const btn = document.getElementById("copyChat");
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = `<i class="bi bi-clipboard-check-fill"></i> Tersalin!`;
    btn.classList.add("copied");
    
    // Confetti effect
    createConfetti(btn);
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove("copied");
    }, 2500);
    
    showNotification("✨ Jawaban berhasil disalin ke clipboard!", "success");
  }).catch(err => {
    showNotification("Gagal menyalin teks. Coba lagi.", "danger");
    console.error("Copy error:", err);
  });
}

// --- Clear Chat with Confirmation
function clearChat() {
  if (!confirm("🗑️ Yakin ingin menghapus percakapan ini?\n\nPercakapan yang dihapus tidak dapat dikembalikan.")) {
    return;
  }
  
  // Clear inputs
  document.getElementById("textInput").value = "";
  document.getElementById("promptInput").value = "";
  
  // Reset textarea height
  document.getElementById("textInput").style.height = "auto";
  
  // Hide sections
  hideResult();
  hideError();
  
  // Reset character counter
  document.getElementById("charCounter").textContent = "0/2000";
  document.getElementById("charCounter").classList.remove("warning", "danger");
  
  // Show notification
  showNotification("🧹 Percakapan berhasil dihapus!", "info");
  
  // Focus back
  setTimeout(() => {
    document.getElementById("textInput").focus();
  }, 300);
}

// --- Share Chat
function shareChat() {
  const chatText = document.getElementById("chatResult").textContent;
  
  if (!chatText || chatText.trim() === "" || chatText.includes("Menunggu respons")) {
    showNotification("Tidak ada percakapan untuk dibagikan!", "warning");
    return;
  }
  
  const shareData = {
    title: "ChatGPT - fadzdigital",
    text: chatText.substring(0, 200) + (chatText.length > 200 ? "..." : ""),
    url: window.location.href
  };
  
  if (navigator.share) {
    navigator.share(shareData)
      .then(() => showNotification("Berhasil membagikan percakapan!", "success"))
      .catch(() => {}); // User cancelled
  } else {
    // Fallback: copy link
    navigator.clipboard.writeText(window.location.href);
    showNotification("Link halaman disalin ke clipboard!", "info");
  }
}

// --- Shake Element Animation
function shakeElement(element) {
  element.style.animation = "shake 0.5s ease";
  setTimeout(() => {
    element.style.animation = "";
  }, 500);
}

// --- Create Confetti Effect
function createConfetti(button) {
  const rect = button.getBoundingClientRect();
  const colors = ['#4285f4', '#34d399', '#60a5fa', '#fbbf24', '#f87171'];
  
  for (let i = 0; i < 20; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: ${rect.top + rect.height / 2}px;
      left: ${rect.left + rect.width / 2}px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      animation: confettiFall ${Math.random() * 2 + 1}s ease-out forwards;
    `;
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
  }
  
  // Add confetti animation if not exists
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        to {
          transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 300 + 200}px) rotate(${Math.random() * 720}deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// --- Toast Notification System (Enhanced)
function showNotification(message, type = "info", duration = 3500) {
  // Remove existing notifications
  const existing = document.querySelectorAll(".custom-toast");
  existing.forEach(toast => toast.remove());
  
  const colors = {
    success: { bg: "#10b981", icon: "bi-check-circle-fill" },
    danger: { bg: "#ef4444", icon: "bi-x-circle-fill" },
    warning: { bg: "#f59e0b", icon: "bi-exclamation-triangle-fill" },
    info: { bg: "#3b82f6", icon: "bi-info-circle-fill" }
  };
  
  const config = colors[type];
  
  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: white;
    padding: 18px 26px;
    border-radius: 16px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.2);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 14px;
    border-left: 5px solid ${config.bg};
    animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 420px;
    backdrop-filter: blur(10px);
  `;
  
  toast.innerHTML = `
    <i class="bi ${config.icon}" style="color: ${config.bg}; font-size: 1.5em;"></i>
    <span style="color: #1f2937; font-weight: 500; line-height: 1.5;">${message}</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.3em;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
      transition: color 0.2s;
    " onmouseover="this.style.color='#1f2937'" onmouseout="this.style.color='#9ca3af'">
      <i class="bi bi-x-lg"></i>
    </button>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// --- Scroll to Top Button
function addScrollTopButton() {
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
  scrollBtn.className = 'scroll-top-btn';
  scrollBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4285f4, #1d4ed8);
    color: white;
    border: none;
    font-size: 1.3em;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(66, 133, 244, 0.4);
    z-index: 9998;
    opacity: 0;
    transform: scale(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  document.body.appendChild(scrollBtn);
  
  // Show/hide on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.style.opacity = '1';
      scrollBtn.style.transform = 'scale(1)';
    } else {
      scrollBtn.style.opacity = '0';
      scrollBtn.style.transform = 'scale(0)';
    }
  });
  
  scrollBtn.addEventListener('mouseenter', () => {
    scrollBtn.style.transform = 'scale(1.1)';
    scrollBtn.style.boxShadow = '0 6px 24px rgba(66, 133, 244, 0.5)';
  });
  
  scrollBtn.addEventListener('mouseleave', () => {
    scrollBtn.style.transform = 'scale(1)';
    scrollBtn.style.boxShadow = '0 4px 16px rgba(66, 133, 244, 0.4)';
  });
}

// --- Animation Styles
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(450px);
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
      transform: translateX(450px);
      opacity: 0;
    }
  }
  
  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: scale(0.9);
    }
  }
  
  .scroll-top-btn:hover {
    animation: bounce 1s infinite;
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0) scale(1.1);
    }
    50% {
      transform: translateY(-10px) scale(1.1);
    }
  }
`;
document.head.appendChild(style);

// --- Console Easter Egg
console.log("%c👋 Halo Developer!", "color: #4285f4; font-size: 24px; font-weight: bold;");
console.log("%c🚀 Tertarik dengan kode kami? Hubungi kami di Telegram: @fadzdigital", "color: #34d399; font-size: 14px;");
console.log("%c⚠️ Warning: Jangan paste kode yang tidak kamu mengerti di console ini!", "color: #ef4444; font-size: 12px; font-weight: bold;");