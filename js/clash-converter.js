// ----------- PARSER -----------
function decodeBase64(base64) { try { return atob(base64); } catch { return null; } }
function parseVmess(vmessLink) {
  const vmessDataEncoded = vmessLink.slice(8);
  const decoded = decodeBase64(vmessDataEncoded);
  if (!decoded) return { error: 'Base64 VMESS tidak valid!' };
  try {
    const vmessDataJson = JSON.parse(decoded);
    const config = {
      name: vmessDataJson.ps || "Vmess",
      server: vmessDataJson.add,
      port: parseInt(vmessDataJson.port, 10),
      type: "vmess",
      uuid: vmessDataJson.id,
      alterId: parseInt(vmessDataJson.aid || 0, 10),
      cipher: "auto",
      tls: vmessDataJson.tls === "tls",
      "skip-cert-verify": true,
      servername: vmessDataJson.sni || vmessDataJson.host || "",
      network: vmessDataJson.net,
      udp: true,
    };
    if (vmessDataJson.net === "ws") {
      config["ws-opts"] = {
        path: vmessDataJson.path || "",
        headers: { Host: vmessDataJson.host || "" },
      };
    } else if (vmessDataJson.net === "grpc") {
      config["grpc-opts"] = {
        "grpc-service-name": vmessDataJson.path || "",
      };
    }
    return config;
  } catch (e) { return { error: `Format JSON VMESS error: ${e.message}` }; }
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
    const security = params.get("security") || "";
    const tls = security === "tls";
    const sni = params.get("sni") || params.get("host") || "";
    const config = {
      name,
      server: host,
      port: parseInt(port, 10),
      type: "vless",
      uuid,
      cipher: "auto",
      tls,
      "skip-cert-verify": tls,
      servername: sni,
      network: params.get("type") === "ws" ? "ws" : "grpc",
      udp: true,
    };
    if (config.network === "ws") {
      config["ws-opts"] = {
        path,
        headers: { Host: params.get("host") || "" },
      };
    } else if (config.network === "grpc") {
      config["grpc-opts"] = {
        "grpc-service-name": params.get("serviceName") || "",
      };
    }
    return config;
  } catch (e) { return { error: `Format VLESS error: ${e.message}` }; }
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
    const path = decodeURIComponent(params.get("path") || "");
    const security = params.get("security") || "";
    const tls = security === "tls";
    const sni = params.get("sni") || params.get("host") || "";
    const serviceName = params.get("serviceName") || "";
    const config = {
      name,
      server: host,
      port: parseInt(port, 10),
      type: "trojan",
      password,
      "skip-cert-verify": true,
      network: params.get("type") === "ws" ? "ws" : "grpc",
      udp: true,
    };
    if (tls) config.sni = sni;
    if (config.network === "grpc") {
      config["grpc-opts"] = {
        "grpc-service-name": serviceName || "trojan-grpc",
      };
    }
    else if (config.network === "ws") {
      config["ws-opts"] = {
        path,
        headers: { Host: params.get("host") || sni },
      };
    }
    return config;
  } catch (e) { return { error: `Format TROJAN error: ${e.message}` }; }
}
function parseLink(link) {
  if (link.startsWith("vmess://")) return parseVmess(link);
  if (link.startsWith("vless://")) return parseVless(link);
  if (link.startsWith("trojan://")) return parseTrojan(link);
  return { error: "Format tidak didukung!" };
}

// ----------- TEMPLATE DEFAULT -----------
const baseTemplate = {
  port: 7890,
  "socks-port": 7891,
  "redir-port": 7892,
  "mixed-port": 7893,
  "tproxy-port": 7895,
  ipv6: false,
  mode: "rule",
  "log-level": "silent",
  "allow-lan": true,
  "external-controller": "0.0.0.0:9090",
  secret: "",
  "bind-address": "*",
  "unified-delay": true,
  profile: { "store-selected": true },
  dns: {
    enable: true,
    ipv6: false,
    "enhanced-mode": "redir-host",
    listen: "0.0.0.0:7874",
    nameserver: [
      "8.8.8.8",
      "1.0.0.1",
      "https://dns.google/dns-query"
    ],
    fallback: [
      "1.1.1.1",
      "8.8.4.4",
      "https://cloudflare-dns.com/dns-query",
      "112.215.203.254"
    ],
    "default-nameserver": [
      "8.8.8.8",
      "1.1.1.1",
      "112.215.203.254"
    ]
  }
};
function buildProxyGroups(proxyNames) {
  return [
    {
      name: 'MikkuTod',
      type: 'select',
      proxies: [...proxyNames, 'LOAD-BALANCE', 'BEST-PING', 'FALLBACK', 'DIRECT']
    },
    {
      name: 'LOAD-BALANCE',
      type: 'load-balance',
      strategy: 'consistent-hashing',
      url: 'http://hi.bonds.id/ping',
      interval: 300,
      proxies: proxyNames
    },
    {
      name: 'BEST-PING',
      type: 'url-test',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
      proxies: proxyNames
    },
    {
      name: 'FALLBACK',
      type: 'fallback',
      url: 'http://hi.bonds.id/ping',
      interval: 300,
      proxies: proxyNames
    }
  ];
}

// ----------- TEMPLATE REDIR-HOST + RULES -----------
const redirHostTemplate = {
  ...baseTemplate,
  dns: {
    ...baseTemplate.dns,
    "enhanced-mode": "redir-host",
  }
};
function buildProxyGroupsRedir(proxyNames) {
  return [
    {
      name: 'MikkuTod', type: 'select',
      proxies: [
        ...proxyNames, "GAME", "SOSMED", "WA", "YOUTUBE", "STREAMING-ID", "AdsBLOCK",
        "LOAD-BALANCE", "BEST-PING", "FALLBACK", "DIRECT"
      ]
    },
    { name: "GAME", type: "select", proxies: [...proxyNames, "DIRECT"] },
    { name: "SOSMED", type: "select", proxies: [...proxyNames, "DIRECT"] },
    { name: "WA", type: "select", proxies: [...proxyNames, "DIRECT"] },
    { name: "YOUTUBE", type: "select", proxies: [...proxyNames, "DIRECT"] },
    { name: "STREAMING-ID", type: "select", proxies: [...proxyNames, "DIRECT"] },
    { name: "AdsBLOCK", type: "select", proxies: [...proxyNames, "REJECT"] },
    {
      name: "LOAD-BALANCE",
      type: "load-balance",
      strategy: "consistent-hashing",
      url: "http://hi.bonds.id/ping",
      interval: 300,
      proxies: proxyNames,
    },
    {
      name: "BEST-PING",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: proxyNames,
    },
    {
      name: "FALLBACK",
      type: "fallback",
      url: "http://hi.bonds.id/ping",
      interval: 300,
      proxies: proxyNames,
    },
  ];
}
const redirRules = [
  "RULE-SET,rule_portgames,GAME",
  "RULE-SET,rule_Sosmed,SOSMED",
  "RULE-SET,rule_netflix,STREAMING-ID",
  "RULE-SET,rule_primevideo,STREAMING-ID",
  "RULE-SET,rule_hbo,STREAMING-ID",
  "RULE-SET,rule_hboasia,STREAMING-ID",
  "RULE-SET,rule_iqiyi,STREAMING-ID",
  "RULE-SET,rule_disneyplus,STREAMING-ID",
  "RULE-SET,rule_Streaming,STREAMING-ID",
  "RULE-SET,rule_basicads,AdsBLOCK",
  "RULE-SET,rule_Youtube,YOUTUBE",
  "DOMAIN-SUFFIX,static.whatsapp.net,WA",
  "DOMAIN-SUFFIX,docker.whatsapp.biz,WA",
  "DOMAIN-SUFFIX,whatsapp.com,WA",
  "DOMAIN-SUFFIX,whatsapp.net,WA",
  "DOMAIN-SUFFIX,g.whatsapp.net,WA",
  "DOMAIN-SUFFIX,v.whatsapp.net,WA",
  "DOMAIN-SUFFIX,mmg.whatsapp.net,WA",
  "MATCH,MikkuTod"
];
const redirRuleProviders = {
  rule_portgames: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_portgames.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_portgames.yaml", interval: 86400
  },
  rule_Sosmed: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_sosmed.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_sosmed.yaml", interval: 86400
  },
  rule_Youtube: {
    type: "http", behavior: "domain", path: "./rule_provider/rule_youtube.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_youtube.yaml", interval: 86400
  },
  rule_netflix: {
    type: "http", behavior: "domain", path: "./rule_provider/rule_netflix.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_netflix.yaml", interval: 86400
  },
  rule_primevideo: {
    type: "http", behavior: "domain", path: "./rule_provider/rule_primevideo.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_primevideo.yaml", interval: 86400
  },
  rule_hbo: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_hbo.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_hbo.yaml", interval: 86400
  },
  rule_hboasia: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_hboasia.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_hboasia.yaml", interval: 86400
  },
  rule_iqiyi: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_iqiyi.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_iqiyi.yaml", interval: 86400
  },
  rule_disneyplus: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_disneyplus.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_disneyplus.yaml", interval: 86400
  },
  rule_Streaming: {
    type: "http", behavior: "classical", path: "./rule_provider/rule_streaming.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_streaming.yaml", interval: 86400
  },
  rule_basicads: {
    type: "http", behavior: "domain", path: "./rule_provider/rule_basicads.yaml",
    url: "https://raw.githubusercontent.com/malikshi/open_clash/main/rule_provider/rule_basicads.yaml", interval: 43200
  },
};

// ----------- TEMPLATE FAKE-IP + RULES -----------
const fakeIpTemplate = {
  ...redirHostTemplate,
  dns: {
    ...redirHostTemplate.dns,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "*.lan","*.localdomain","*.example","*.invalid","*.localhost","*.test","*.local","*.home.arpa",
      "time.*.com","time.*.gov","time.*.edu.cn","time.*.apple.com","time1.*.com","time2.*.com","time3.*.com",
      "time4.*.com","time5.*.com","time6.*.com","time7.*.com","ntp.*.com","ntp1.*.com","ntp2.*.com","ntp3.*.com",
      "ntp4.*.com","ntp5.*.com","ntp6.*.com","ntp7.*.com","*.time.edu.cn","*.ntp.org.cn","+.pool.ntp.org",
      "time1.cloud.tencent.com","music.163.com","*.music.163.com","*.126.net","musicapi.taihe.com","music.taihe.com",
      "songsearch.kugou.com","trackercdn.kugou.com","*.kuwo.cn","api-jooxtt.sanook.com","api.joox.com","joox.com",
      "y.qq.com","*.y.qq.com","streamoc.music.tc.qq.com","mobileoc.music.tc.qq.com","isure.stream.qqmusic.qq.com",
      "dl.stream.qqmusic.qq.com","aqqmusic.tc.qq.com","amobile.music.tc.qq.com","*.xiami.com","*.music.migu.cn",
      "music.migu.cn","*.msftconnecttest.com","*.msftncsi.com","msftconnecttest.com","msftncsi.com",
      "localhost.ptlogin2.qq.com","localhost.sec.qq.com","+.srv.nintendo.net","+.stun.playstation.net",
      "xbox.*.microsoft.com","xnotify.xboxlive.com","+.battlenet.com.cn","+.wotgame.cn","+.wggames.cn",
      "+.wowsgame.cn","+.wargaming.net","proxy.golang.org","stun.*.*","stun.*.*.*","+.stun.*.*","+.stun.*.*.*",
      "+.stun.*.*.*.*","heartbeat.belkin.com","*.linksys.com","*.linksyssmartwifi.com","*.router.asus.com",
      "mesu.apple.com","swscan.apple.com","swquery.apple.com","swdownload.apple.com","swcdn.apple.com",
      "swdist.apple.com","lens.l.google.com","stun.l.google.com","+.nflxvideo.net","*.square-enix.com",
      "*.finalfantasyxiv.com","*.ffxiv.com","*.mcdn.bilivideo.cn","+.media.dssott.com"
    ]
  }
};

// ----------- YAML BUILDER -----------
function buildYaml(proxies, useAnchor = true, onlyProxies = false, templateType = "default") {
  if (onlyProxies) return window.jsyaml.dump({ proxies });

  if (templateType === "redirhost" || templateType === "fakeip") {
    const proxyNames = proxies.map(p => p.name);
    const configObj = {
      ...(templateType === "redirhost" ? redirHostTemplate : fakeIpTemplate),
      proxies,
      "proxy-groups": buildProxyGroupsRedir(proxyNames),
      rules: redirRules,
      "rule-providers": redirRuleProviders,
    };
    return window.jsyaml.dump(configObj, { noRefs: !useAnchor });
  }
  // Default minimalis
  const configObj = {
    ...baseTemplate,
    proxies,
    "proxy-groups": buildProxyGroups(proxies.map(p => p.name)),
    rules: [ "MATCH,MikkuTod" ]
  };
  return window.jsyaml.dump(configObj, { noRefs: !useAnchor });
}

// --- ADDITIONAL: ELEMENT for FILENAME ---
const filenameOption = document.getElementById('filenameOption');
const customFilenameWrap = document.getElementById('customFilenameWrap');
const customFilename = document.getElementById('customFilename');

filenameOption.addEventListener('change', function() {
  if(this.value === "custom") {
    customFilenameWrap.style.display = "block";
  } else {
    customFilenameWrap.style.display = "none";
  }
});

// ----------- UI INTERACTION -----------
const convertForm = document.getElementById('convertForm');
const convertBtn = document.getElementById('convertBtn');
const yamlBox = document.getElementById('yamlResult');
const resultSection = document.getElementById('resultSection');
const badge = document.getElementById('configTypeBadge');
const errorSection = document.getElementById('errorSection');
const copyBtn = document.getElementById('copyYaml');
const downloadBtn = document.getElementById('downloadYaml');
const configTemplateSelect = document.getElementById('configTemplate');

// === Helper: show toast ===
function showToast(msg) {
  let toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = "position-fixed z-3 px-4 py-2 fw-bold rounded-4"
    + " bg-success text-white shadow-lg"
    + " clash-toast";
  toast.style.top = "85px";
  toast.style.right = "28px";
  toast.style.fontSize = "1.12em";
  toast.style.opacity = 1;
  toast.style.transition = "all .3s";
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1200);
  setTimeout(() => { document.body.removeChild(toast); }, 1750);
}

function showLoading(btn, loading=true) {
  if (loading) {
    btn.disabled = true;
    btn.classList.add("loading");
    btn.dataset.text = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Proses...`;
  } else {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = btn.dataset.text || btn.innerHTML;
  }
}

convertForm.addEventListener('submit', function(e) {
  e.preventDefault();
  showLoading(convertBtn, true);

  setTimeout(() => {
    const links = document.getElementById('vpnLinks').value.trim().split('\n').map(l=>l.trim()).filter(Boolean);
    const useAnchor = document.getElementById('useAnchor').checked;
    const justProxies = document.getElementById('justProxies').checked;
    const templateType = configTemplateSelect.value;
    const proxies = [], errors = [];
    links.forEach(line => {
      const parsed = parseLink(line);
      if (parsed.error) errors.push(`• ${line.slice(0,42)} ... <br><span class="text-danger small">${parsed.error}</span>`);
      else proxies.push(parsed);
    });

    if (proxies.length) {
      let yaml = buildYaml(proxies, useAnchor, justProxies, templateType);
      yamlBox.textContent = yaml;
      resultSection.style.display = "block";
      // Badge label
      let tempLabel = "Default";
      if (templateType === "redirhost") tempLabel = "Redir-host + Rules";
      if (templateType === "fakeip") tempLabel = "Fake-IP + Rules";
      badge.textContent = (justProxies ? "proxies: saja" : tempLabel) + (justProxies ? "" : (useAnchor ? " / Anchor" : " / No Anchor"));
      badge.className = "badge ms-2 " + (
        justProxies ? "bg-warning text-dark" : useAnchor ? "bg-success" : "bg-danger"
      );
      errorSection.innerHTML = errors.length ? "<b>Link error:</b><br>"+errors.join("<br>") : '';
      errorSection.style.display = errors.length ? "block" : "none";
      setTimeout(()=>{ yamlBox.scrollIntoView({ behavior: "smooth", block: "center" }); }, 160);
    } else {
      yamlBox.textContent = '';
      errorSection.innerHTML = errors.length ? "<b>Error:</b><br>"+errors.join("<br>") : 'Tidak ada data valid!';
      errorSection.style.display = "block";
      badge.textContent = "";
      resultSection.style.display = "block";
      setTimeout(()=>{ errorSection.scrollIntoView({ behavior: "smooth", block: "center" }); }, 160);
    }
    showLoading(convertBtn, false);
  }, 500);
});

copyBtn.onclick = function() {
  const yaml = yamlBox.textContent;
  if (!yaml) return;
  navigator.clipboard.writeText(yaml);
  showToast("YAML berhasil disalin!");
};

// === DOWNLOAD BUTTON ===
downloadBtn.onclick = function(e) {
  e.preventDefault();
  const yaml = yamlBox.textContent;
  if (!yaml) return;

  let filename = "config.yaml";
  if (filenameOption.value === "custom") {
    let val = (customFilename.value || "").trim();
    if(!val) {
      customFilename.focus();
      showToast("Isi nama file YAML-nya dulu!");
      return;
    }
    if (!val.toLowerCase().endsWith(".yaml")) val += ".yaml";
    val = val.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    filename = val;
  }

  const blob = new Blob([yaml], {type: 'text/yaml'});
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
