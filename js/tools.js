document.addEventListener('DOMContentLoaded', function () {
  const tools = [
  {
    title: "Clash Config Converter",
    desc: "Converter v2ray ke Format OpenClash, Tanpa Ribet & cepat.",
    icon: "bi bi-shuffle",
    url: "clash-converter.html",
    badge: "Populer",
    gradient: "blue"
  },
  {
    title: "Auto Configuration Generator",
    desc: "Konfigurasikan Akun VPN (VMESS, VLESS, TROJAN) secara otomatis untuk berbagai kebutuhan dengan mudah!",
    icon: "bi bi-lightning-charge-fill",
    url: "autoconfiguration.html",
    badge: "Config",
    gradient: "green"
  },
  {
    title: "Json Converter",
    desc: "Konversi link VMESS, VLESS, atau TROJAN ke format JSON config Sing-box sekali klik. Praktis!",
    icon: "bi bi-file-earmark-code-fill",
    url: "json-converter.html",
    badge: "NekoBox",
    gradient: "orange"
  },
  {
    title: "IP Locator",
    desc: "Cari lokasi, kota, negara, ASN, provider, dan detail lengkap dari sebuah IP publik.",
    icon: "bi bi-geo-alt-fill",
    url: "iplocator.html",
    badge: "Gratis",
    gradient: "sky"
  },
  {
    title: "ChatGPT AI",
    desc: "Ngobrol, tanya apapun ke ChatGPT, bisa multi sesi, mudah di-copy dan responsif.",
    icon: "bi bi-chat-dots-fill",
    url: "chatgpt.html",
    badge: "AI",
    gradient: "purple"
  },
  {
    title: "DeepSeek AI",
    desc: "Tanya DeepSeek AI. Jawaban super cepat, siap bantu segala kebutuhan kamu!",
    icon: "bi bi-robot",
    url: "deepseek.html",
    badge: "AI",
    gradient: "cyan"
  },
  {
    title: "UUID Generator",
    desc: "Generate UUID unik untuk V2Ray, SSH, database, dsb. Bisa copy otomatis.",
    icon: "bi bi-123",
    url: "uuid.html",
    badge: "Gratis",
    gradient: "purple"
  }
];


  const toolsList = document.getElementById('toolsList');
  const toolsEmpty = document.getElementById('toolsEmptyResult');
  const searchInput = document.getElementById('searchToolsInput');

  function renderTools(filter = '') {
    let found = false;
    toolsList.innerHTML = '';
    tools.forEach(tool => {
      // Search filter (case-insensitive)
      if (
        tool.title.toLowerCase().includes(filter.toLowerCase()) ||
        tool.desc.toLowerCase().includes(filter.toLowerCase())
      ) {
        found = true;
        toolsList.innerHTML += `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="tool-card" tabindex="0" data-gradient="${tool.gradient}">
            <div class="tool-icon"><i class="${tool.icon}"></i></div>
            <div class="tool-title">${tool.title}</div>
            <div class="tool-desc">${tool.desc}</div>
            <a href="${tool.url}" class="tool-btn" tabindex="-1">Buka Tools <i class="bi bi-arrow-right-short ms-1"></i></a>
            ${tool.badge ? `<div class="tool-badge">${tool.badge}</div>` : ''}
          </div>
        </div>
        `;
      }
    });
    toolsEmpty.classList.toggle('d-none', found);
    toolsList.classList.toggle('d-none', !found);
  }

  // Initial render
  renderTools();

  // Live search
  searchInput.addEventListener('input', function () {
    renderTools(this.value.trim());
  });
});
