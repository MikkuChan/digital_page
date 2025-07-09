// ===== PARSER VMESS / VLESS / TROJAN =====
function decodeBase64(base64) { try { return atob(base64); } catch { return null; } }

function parseVmess(vmessLink) {
  const vmessDataEncoded = vmessLink.slice(8);
  const decoded = decodeBase64(vmessDataEncoded);
  if (!decoded) return { error: 'Base64 VMESS tidak valid!' };
  try {
    const vmessDataJson = JSON.parse(decoded);
    const config = {
      type: "vmess",
      name: vmessDataJson.ps || "Vmess",
      server: vmessDataJson.add,
      port: parseInt(vmessDataJson.port, 10),
      uuid: vmessDataJson.id,
      alterId: parseInt(vmessDataJson.aid || 0, 10),
      cipher: "auto",
      tls: vmessDataJson.tls === "tls",
      "skip-cert-verify": true,
      servername: vmessDataJson.sni || vmessDataJson.host || "",
      network: vmessDataJson.net,
      udp: true,
      wsOpts: (vmessDataJson.net === "ws" ? {
        path: vmessDataJson.path || "",
        headers: { Host: vmessDataJson.host || "" }
      } : undefined)
    };
    return config;
  } catch (e) {
    return { error: `Format JSON VMESS error: ${e.message}` };
  }
}

function parseVless(vlessLink) {
  try {
    const vlessData = vlessLink.slice(8);
    const [userInfo, hostInfo] = vlessData.split("@");
    let [host, portAndQuery] = hostInfo.split(":");
    let port = portAndQuery;
    let query = '';
    if (portAndQuery.includes('/?')) {
      [port, query] = portAndQuery.split('/?');
    } else if (portAndQuery.includes('?')) {
      [port, query] = portAndQuery.split('?');
    }
    query = query.replace(/^\//, '');
    const uuid = userInfo.split("@")[0];
    const queryParts = query.split("#");
    const name = queryParts.length > 1 ? decodeURIComponent(queryParts[1]) : "Vless";
    const params = new URLSearchParams(queryParts[0] || '');
    const path = decodeURIComponent(params.get("path") || "");
    const tls = (params.get("security") === "tls");
    const sni = params.get("sni") || params.get("host") || "";
    const flow = params.get("flow") || "";
    const config = {
      type: "vless",
      name,
      server: host,
      port: parseInt(port, 10),
      uuid,
      tls,
      flow,
      servername: sni,
      network: params.get("type") === "ws" ? "ws" : params.get("type") === "grpc" ? "grpc" : "tcp",
      wsOpts: (params.get("type") === "ws" ? {
        path,
        headers: { Host: params.get("host") || "" }
      } : undefined),
      grpcOpts: (params.get("type") === "grpc" ? {
        service_name: params.get("serviceName") || "",
        mode: params.get("mode") || "gun"
      } : undefined)
    };
    return config;
  } catch (e) {
    return { error: `Format VLESS error: ${e.message}` };
  }
}

function parseTrojan(trojanLink) {
  try {
    const trojanData = trojanLink.slice(9);
    const [passwordInfo, hostInfo] = trojanData.split("@");
    let [host, portAndQuery] = hostInfo.split(":");
    let port = portAndQuery;
    let query = '';
    if (portAndQuery.includes('/?')) {
      [port, query] = portAndQuery.split('/?');
    } else if (portAndQuery.includes('?')) {
      [port, query] = portAndQuery.split('?');
    }
    query = query.replace(/^\//, '');
    const password = passwordInfo.split("@")[0];
    const queryParts = query.split("#");
    const name = queryParts.length > 1 ? decodeURIComponent(queryParts[1]) : "Trojan";
    const params = new URLSearchParams(queryParts[0] || '');
    const sni = params.get("sni") || params.get("host") || "";
    const config = {
      type: "trojan",
      name,
      server: host,
      port: parseInt(port, 10),
      password,
      tls: params.get("security") === "tls",
      sni: sni,
      network: params.get("type") === "ws" ? "ws" : params.get("type") === "grpc" ? "grpc" : "tcp",
      wsOpts: (params.get("type") === "ws" ? {
        path: decodeURIComponent(params.get("path") || ""),
        headers: { Host: params.get("host") || "" }
      } : undefined),
      grpcOpts: (params.get("type") === "grpc" ? {
        service_name: params.get("serviceName") || "",
        mode: params.get("mode") || "gun"
      } : undefined)
    };
    return config;
  } catch (e) {
    return { error: `Format TROJAN error: ${e.message}` };
  }
}

function parseLink(link) {
  if (link.startsWith("vmess://")) return parseVmess(link);
  if (link.startsWith("vless://")) return parseVless(link);
  if (link.startsWith("trojan://")) return parseTrojan(link);
  return { error: "Format tidak didukung!" };
}

// ===== SINGBOX BASE JSON TEMPLATE =====
const baseSingbox = {
  "log": { "disabled": false, "level": "warn", "timestamp": true },
  "experimental": {
    "clash_api": {
      "external_controller": "127.0.0.1:9090",
      "external_ui": "../files/yacd",
      "external_ui_download_url": "https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip",
      "external_ui_download_detour": "MikkuChan",
      "secret": "",
      "default_mode": "Rule"
    }
  },
  "dns": {
    "servers": [
      { "tag": "MikkuChan-dns", "address": "1.0.0.1", "strategy": "ipv4_only", "detour": "MikkuChan" },
      { "tag": "Best Latency-dns", "address": "1.1.1.1", "strategy": "ipv4_only", "detour": "Best Latency" },
      { "tag": "direct-dns", "address": "local", "strategy": "ipv4_only", "detour": "direct" },
      { "tag": "block-dns", "address": "rcode://success" }
    ],
    "rules": [
      { "domain_suffix": [".arpa.", ".arpa"], "server": "block-dns", "rewrite_ttl": 20 },
      { "network": "udp", "port": 443, "server": "block-dns", "rewrite_ttl": 20 },
      { "outbound": "MikkuChan", "server": "MikkuChan-dns", "rewrite_ttl": 20 },
      { "outbound": "Best Latency", "server": "Best Latency-dns", "rewrite_ttl": 20 },
      { "outbound": "direct", "server": "direct-dns", "rewrite_ttl": 20, "domain_suffix": ["google.dns"] },
      { "outbound": "any", "server": "direct-dns", "rewrite_ttl": 20 }
    ],
    "reverse_mapping": true,
    "strategy": "ipv4_only",
    "independent_cache": true
  },
  "inbounds": [
    { "type": "tun", "tag": "tun-in", "interface_name": "tun0", "inet4_address": "172.19.0.1/30", "mtu": 9000, "auto_route": true, "strict_route": true, "stack": "system", "endpoint_independent_nat": true, "sniff": true },
    { "listen": "0.0.0.0", "listen_port": 2080, "sniff": true, "tag": "mixed-in", "type": "mixed" }
  ],
  "outbounds": [],
  "route": {
    "auto_detect_interface": true,
    "override_android_vpn": true,
    "rules": [
      { "outbound": "dns-out", "port": [53] }
    ]
  }
};

// ====== BUILD OUTBOUNDS FOR SINGBOX ======
function buildOutbounds(proxies) {
  let outbounds = [];
  proxies.forEach(proxy => {
    // --- VMESS ---
    if(proxy.type === "vmess") {
      outbounds.push({
        type: "vmess",
        tag: proxy.name || "vmess",
        domain_strategy: "ipv4_only",
        fallback_delay: "300ms",
        server: proxy.server,
        server_port: proxy.port,
        uuid: proxy.uuid,
        security: "auto",
        authenticated_length: true,
        tls: {
          enabled: proxy.tls,
          server_name: proxy.servername,
          insecure: true,
          utls: { fingerprint: "chrome" }
        },
        multiplex: {
          enabled: false,
          protocol: "smux",
          max_streams: 32
        },
        transport: proxy.network === "ws" ? {
          type: "ws",
          path: proxy.wsOpts && proxy.wsOpts.path ? proxy.wsOpts.path : "",
          headers: {
            Host: proxy.wsOpts && proxy.wsOpts.headers ? proxy.wsOpts.headers.Host : ""
          },
          max_early_data: 0,
          early_data_header_name: "Sec-WebSocket-Protocol"
        } : undefined
      });
    }
    // --- VLESS ---
    if(proxy.type === "vless") {
      let obj = {
        type: "vless",
        tag: proxy.name || "vless",
        server: proxy.server,
        server_port: proxy.port,
        uuid: proxy.uuid,
        packet_encoding: proxy.flow || undefined,
        tls: proxy.tls ? {
          enabled: true,
          server_name: proxy.servername,
          insecure: true,
          utls: { fingerprint: "chrome" }
        } : undefined,
        transport: undefined,
        multiplex: { enabled: false }
      };
      // Websocket
      if(proxy.network === "ws") {
        obj.transport = {
          type: "ws",
          path: proxy.wsOpts && proxy.wsOpts.path ? proxy.wsOpts.path : "",
          headers: {
            Host: proxy.wsOpts && proxy.wsOpts.headers ? proxy.wsOpts.headers.Host : ""
          }
        };
      }
      // gRPC
      if(proxy.network === "grpc") {
        obj.transport = {
          type: "grpc",
          service_name: proxy.grpcOpts && proxy.grpcOpts.service_name ? proxy.grpcOpts.service_name : "",
          mode: proxy.grpcOpts && proxy.grpcOpts.mode ? proxy.grpcOpts.mode : "gun"
        };
      }
      outbounds.push(obj);
    }
    // --- TROJAN ---
    if(proxy.type === "trojan") {
      let obj = {
        type: "trojan",
        tag: proxy.name || "trojan",
        server: proxy.server,
        server_port: proxy.port,
        password: proxy.password,
        tls: proxy.tls ? {
          enabled: true,
          server_name: proxy.sni || "",
          insecure: true,
          utls: { fingerprint: "chrome" }
        } : undefined,
        transport: undefined,
        multiplex: { enabled: false }
      };
      // Websocket
      if(proxy.network === "ws") {
        obj.transport = {
          type: "ws",
          path: proxy.wsOpts && proxy.wsOpts.path ? proxy.wsOpts.path : "",
          headers: {
            Host: proxy.wsOpts && proxy.wsOpts.headers ? proxy.wsOpts.headers.Host : ""
          }
        };
      }
      // gRPC
      if(proxy.network === "grpc") {
        obj.transport = {
          type: "grpc",
          service_name: proxy.grpcOpts && proxy.grpcOpts.service_name ? proxy.grpcOpts.service_name : "",
          mode: proxy.grpcOpts && proxy.grpcOpts.mode ? proxy.grpcOpts.mode : "gun"
        };
      }
      outbounds.push(obj);
    }
  });
  // Tambahkan outbounds default dari template (jangan dobel tag, sesuaikan jika perlu!)
  outbounds.push(
    { type: "selector", tag: "MikkuChan", outbounds: ["Best Latency", ...(proxies.map(p => p.name))] },
    { type: "urltest", tag: "Best Latency", outbounds: proxies.map(p => p.name), url: "https://detectportal.firefox.com/success.txt", interval: "5m0s" },
    { type: "direct", tag: "direct" },
    { type: "block", tag: "block" },
    { type: "dns", tag: "dns-out" }
  );
  return outbounds;
}

function buildSingboxJson(proxies) {
  let obj = JSON.parse(JSON.stringify(baseSingbox));
  obj.outbounds = buildOutbounds(proxies);
  return JSON.stringify(obj, null, 2);
}

// ===== DOM HANDLER =====
const jsonConvertForm = document.getElementById('jsonConvertForm');
const convertBtnJson = document.getElementById('convertBtnJson');
const jsonBox = document.getElementById('jsonResult');
const resultSectionJson = document.getElementById('jsonResultSection');
const errorSectionJson = document.getElementById('errorSectionJson');
const copyJsonBtn = document.getElementById('copyJson');
const downloadJsonBtn = document.getElementById('downloadJson');
const filenameOptionJson = document.getElementById('filenameOptionJson');
const customFilenameWrapJson = document.getElementById('customFilenameWrapJson');
const customFilenameJson = document.getElementById('customFilenameJson');

filenameOptionJson.addEventListener('change', function() {
  customFilenameWrapJson.style.display = (this.value === "custom") ? "block" : "none";
});

jsonConvertForm.addEventListener('submit', function(e) {
  e.preventDefault();
  convertBtnJson.disabled = true;
  convertBtnJson.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Proses...`;

  setTimeout(() => {
    const links = document.getElementById('vpnLinksJson').value.trim().split('\n').map(l=>l.trim()).filter(Boolean);
    const proxies = [], errors = [];
    links.forEach(line => {
      const parsed = parseLink(line);
      if (parsed.error) errors.push(`• ${line.slice(0,42)} ... <br><span class="text-danger small">${parsed.error}</span>`);
      else proxies.push(parsed);
    });

    if (proxies.length) {
      let json = buildSingboxJson(proxies);
      jsonBox.textContent = json;
      resultSectionJson.style.display = "block";
      errorSectionJson.innerHTML = errors.length ? "<b>Link error:</b><br>"+errors.join("<br>") : '';
      errorSectionJson.style.display = errors.length ? "block" : "none";
      setTimeout(()=>{ jsonBox.scrollIntoView({ behavior: "smooth", block: "center" }); }, 160);
    } else {
      jsonBox.textContent = '';
      errorSectionJson.innerHTML = errors.length ? "<b>Error:</b><br>"+errors.join("<br>") : 'Tidak ada data valid!';
      errorSectionJson.style.display = "block";
      resultSectionJson.style.display = "block";
      setTimeout(()=>{ errorSectionJson.scrollIntoView({ behavior: "smooth", block: "center" }); }, 160);
    }
    convertBtnJson.disabled = false;
    convertBtnJson.innerHTML = `<i class="bi bi-lightning-charge me-2"></i>Convert to JSON`;
  }, 400);
});

// COPY JSON
copyJsonBtn.onclick = function() {
  const json = jsonBox.textContent;
  if (!json) return;
  navigator.clipboard.writeText(json);
  showToast("JSON berhasil disalin!");
};

// DOWNLOAD JSON
downloadJsonBtn.onclick = function(e) {
  e.preventDefault();
  const json = jsonBox.textContent;
  if (!json) return;
  let filename = "config.json";
  if (filenameOptionJson.value === "custom") {
    let val = (customFilenameJson.value || "").trim();
    if(!val) {
      customFilenameJson.focus();
      showToast("Isi nama file JSON dulu!");
      return;
    }
    if (!val.toLowerCase().endsWith(".json")) val += ".json";
    val = val.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    filename = val;
  }
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=> {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
};

function showToast(msg) {
  let toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4 bg-success text-white shadow-lg";
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1200);
  setTimeout(() => { document.body.removeChild(toast); }, 1750);
}
