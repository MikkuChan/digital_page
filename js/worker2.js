// ================================
//  FADZDIGITAL API (Cloudflare Worker) — FULL
//  KV Binding : ORDERS
//  Variables  : lihat daftar di header balasan
// ================================

// ---------- Utils & helpers ----------
function isAllowedOrigin(origin, env) {
  const list = safeJSON(env.ALLOWED_ORIGINS, []);
  return !!origin && Array.isArray(list) && list.includes(origin);
}

function preflight(allow, req) {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', allow || 'null');
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Methods', req.headers.get('Access-Control-Request-Method') || 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', req.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization');
  h.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers: h });
}

function corsify(resp, allow) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', allow || 'null');
  h.set('Vary', 'Origin');
  return new Response(resp.body, { status: resp.status, headers: h });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function sanitize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 24);
}

async function readJSON(req) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) return null;
  try { return await req.json(); } catch { return null; }
}

function safeJSON(s, d) {
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return d; }
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getApiBase(env) {
  return env.PUBLIC_API_BASE || '';
}

// ---------- Produk / Paket ----------
function mapPackage(id) {
  const packs = {
    SG_HP_10K:  { id: 'SG_HP_10K',  label: 'SG HP 300GB/30h',  price: 10000, quotaGB: 300, expDays: 30, iplimit: 10, region: 'SG' },
    ID_HP_15K:  { id: 'ID_HP_15K',  label: 'ID HP 300GB/30h',  price: 15000, quotaGB: 300, expDays: 30, iplimit: 10, region: 'ID' },
    SG_STB_15K: { id: 'SG_STB_15K', label: 'SG STB 600GB/30h', price: 15000, quotaGB: 600, expDays: 30, iplimit: 20, region: 'SG' },
    ID_STB_20K: { id: 'ID_STB_20K', label: 'ID STB 600GB/30h', price: 20000, quotaGB: 600, expDays: 30, iplimit: 20, region: 'ID' }
  };
  return packs[id] || null;
}

// ---------- Duitku helpers ----------
async function buildDuitkuHeaders(env) {
  const isProd = (env.DUITKU_ENV || 'sandbox') === 'production';
  const endpoint = isProd
    ? 'https://api-prod.duitku.com/api/merchant/createInvoice'
    : 'https://api-sandbox.duitku.com/api/merchant/createInvoice';

  // Signature: sha256(merchantCode + timestamp + apiKey)
  const ts  = Date.now().toString();
  const raw = `${env.DUITKU_MERCHANT_CODE}${ts}${env.DUITKU_API_KEY}`;
  const sig = await sha256hex(raw);

  return {
    endpoint,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-duitku-timestamp': ts,
      'x-duitku-merchantcode': env.DUITKU_MERCHANT_CODE,
      'x-duitku-signature': sig
    }
  };
}

async function verifyWithDuitku(orderId, env) {
  const isProd = (env.DUITKU_ENV || 'sandbox') === 'production';
  const url = isProd
    ? 'https://api-prod.duitku.com/api/merchant/checkTransactionStatus'
    : 'https://api-sandbox.duitku.com/api/merchant/checkTransactionStatus';

  // Signature: sha256(merchantCode + merchantOrderId + apiKey)
  const sigRaw = `${env.DUITKU_MERCHANT_CODE}${orderId}${env.DUITKU_API_KEY}`;
  const signature = await sha256hex(sigRaw);

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      merchantCode: env.DUITKU_MERCHANT_CODE,
      merchantOrderId: orderId,
      signature
    })
  });
  const t = await r.text();
  return safeJSON(t, { raw: t });
}

// ---------- KV helpers ----------
function keyOrder(orderId) { return `order:${orderId}`; }
function refKey(ref)      { return `ref:${ref}`; }

async function putOrder(env, orderObj) {
  await env.ORDERS.put(keyOrder(orderObj.orderId), JSON.stringify(orderObj), {
    expirationTtl: 60 * 60 * 24 * 7 // 7 hari
  });
}

function stripSensitive(order) {
  const { iplimit, ...safe } = order;
  // Sertakan accountFields agar FE lebih rapi
  if (order.accountConfig && !safe.accountFields) {
    try { safe.accountFields = formatAccountFields(order.accountConfig); } catch {}
  }
  return safe;
}

// ---------- Normalisasi hasil akun ----------
function formatAccountFields(cfg) {
  // cfg bisa string JSON dari server VPN, atau object
  const obj = typeof cfg === 'string' ? safeJSON(cfg, null) : cfg;
  if (obj && typeof obj === 'object') {
    return {
      username: obj.username || obj.user || '',
      domain:   obj.domain   || '',
      uuid:     obj.uuid     || '',
      quota_gb: obj.quota_gb ?? obj.quota ?? null,
      created:  obj.created  || '',
      expired:  obj.expired  || '',
      ws_tls:   obj.ws_tls   || '',
      ws_ntls:  obj.ws_ntls  || '',
      grpc:     obj.grpc     || '',
      config_url: obj.config_url || ''
    };
  }
  // kalau bukan JSON, tidak bisa dinormalisasi
  return null;
}

function buildAccountText(fields) {
  if (!fields) return '';
  const lines = [];
  lines.push('=== FADZDIGITAL VPN ACCOUNT ===');
  if (fields.username) lines.push(`Username : ${fields.username}`);
  if (fields.domain)   lines.push(`Domain   : ${fields.domain}`);
  if (fields.uuid)     lines.push(`UUID     : ${fields.uuid}`);
  if (fields.quota_gb != null) lines.push(`Quota    : ${fields.quota_gb} GB`);
  if (fields.created)  lines.push(`Created  : ${fields.created}`);
  if (fields.expired)  lines.push(`Expired  : ${fields.expired}`);
  lines.push('');
  if (fields.ws_tls)  { lines.push('[WS TLS]');     lines.push(fields.ws_tls);  lines.push(''); }
  if (fields.ws_ntls) { lines.push('[WS Non-TLS]');lines.push(fields.ws_ntls); lines.push(''); }
  if (fields.grpc)    { lines.push('[gRPC]');      lines.push(fields.grpc);    lines.push(''); }
  if (fields.config_url) { lines.push(`Config URL: ${fields.config_url}`); lines.push(''); }
  lines.push('Simpan file ini untuk impor konfigurasi.');
  return lines.join('\n');
}

// ---------- Create akun VPN ----------
async function createVpnAccount(order, env) {
  const sgHosts = safeJSON(env.SG_HOSTS, []);
  const idHosts = safeJSON(env.ID_HOSTS, []);
  const hosts = order.region === 'SG' ? sgHosts : idHosts;
  if (!hosts.length) throw new Error('Host server VPN tidak tersedia');

  const host = hosts[Math.floor(Math.random() * hosts.length)];
  const base = `http://${host}:5888`;

  const qs = new URLSearchParams({
    user: order.usernameFinal,
    exp: String(order.expDays),
    quota: String(order.quota),
    iplimit: String(order.iplimit),
    auth: env.VPN_API_SECRET
  });

  let path = '/createvmess';
  if (order.protocol === 'vless')  path = '/createvless';
  if (order.protocol === 'trojan') path = '/createtrojan';

  const full = `${base}${path}?${qs.toString()}`;
  const r = await fetch(full, { method: 'GET', redirect: 'manual' });
  const txt = await r.text();

  if (!r.ok) throw new Error(`VPN API error (${r.status})`);
  return txt; // JSON string (sesuai contoh kamu)
}

// ---------- Email (Resend) opsional ----------
async function sendEmailResend(order, fields, env) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM || 'fadzdigital <no-reply@support.fadzdigital.store>';
  const to = (order.email || '').trim();
  if (!apiKey || !to) return; // skip kalau tidak dikonfigurasi

  const subject = `Akun VPN #${order.orderId} — ${order.packageId} (${order.protocol.toUpperCase()})`;
  const text = buildAccountText(fields || null) || (order.accountConfig || '');

  const html = `
    <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif">
      <h2 style="margin:0 0 12px">Akun VPN Anda</h2>
      <p style="margin:0 0 8px">Order ID: <b>${order.orderId}</b></p>
      <p style="margin:0 0 8px">Paket: <b>${order.packageId}</b> &middot; Protocol: <b>${order.protocol.toUpperCase()}</b></p>
      <pre style="background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(text)}</pre>
      <p style="color:#64748b;font-size:12px;margin-top:12px">Simpan konfigurasi ini dengan aman.</p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text
    })
  }).catch(() => {});
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

// ---------- Handlers ----------
async function handleCreateInvoice(input, env) {
  const pkg = mapPackage(input?.packageId);
  if (!pkg) return { status: 400, body: { message: 'Paket tidak valid' } };

  const protocol = ['vmess', 'vless', 'trojan'].includes((input?.protocol||'').toLowerCase())
    ? input.protocol.toLowerCase() : 'vmess';
  const username      = sanitize(input?.username);
  const usernameFinal = sanitize(input?.usernameFinal);

  if (!username || !usernameFinal) {
    return { status: 400, body: { message: 'Username tidak valid' } };
  }

  const orderId = `FDZ-${Date.now()}`;
  const order = {
    orderId,
    packageId: pkg.id,
    price: pkg.price,
    quota: pkg.quotaGB,
    expDays: pkg.expDays,
    iplimit: pkg.iplimit,
    region: pkg.region,
    protocol,
    username,
    usernameFinal,
    email: (input?.email || '').trim(),
    status: 'PENDING',
    createdAt: Date.now()
  };
  await putOrder(env, order);

  // Buat invoice Duitku (POP)
  const { endpoint, headers } = await buildDuitkuHeaders(env);
  const payload = {
    paymentAmount: pkg.price,
    merchantOrderId: orderId,
    productDetails: `VPN ${pkg.label} (${protocol.toUpperCase()})`,
    additionalParam: `${pkg.id}|${protocol}|${usernameFinal}`,
    merchantUserInfo: order.email || '',
    customerVaName: order.usernameFinal,
    email: order.email || 'noemail@fadzdigital.local',
    phoneNumber: '',
    itemDetails: [{ name: `VPN ${pkg.label}`, price: pkg.price, quantity: 1 }],
    callbackUrl: `${getApiBase(env)}/pay/callback`,
    returnUrl: `${env.PUBLIC_SITE_BASE || ''}/ordervpn.html`,
    expiryPeriod: 60
  };

  const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await resp.text();
  const data = safeJSON(text, { raw: text });

  if (!resp.ok || !data?.reference || !data?.paymentUrl) {
    return { status: 502, body: { message: 'Gagal membuat invoice', detail: data } };
  }

  await env.ORDERS.put(refKey(data.reference), orderId, { expirationTtl: 60 * 60 * 24 * 7 });

  return { status: 200, body: { orderId, reference: data.reference, paymentUrl: data.paymentUrl } };
}

async function handleCallback(payload, env) {
  const orderId = payload.merchantOrderId || payload.merchantorderid || payload.orderId;
  if (!orderId) return { status: 400, text: 'NO ORDER' };

  const resultCode = String(payload.resultCode || payload.resultcode || '');
  let status = resultCode === '00' ? 'PAID' : (resultCode === '01' ? 'PENDING' : 'FAILED');

  const order = await env.ORDERS.get(keyOrder(orderId), { type: 'json' });
  if (!order) return { status: 404, text: 'ORDER NOT FOUND' };

  // (Opsional) verifikasi langsung ke Duitku
  // const verify = await verifyWithDuitku(orderId, env);
  // if (verify?.status === 'SUCCESS') status = 'PAID';

  order.status = status;
  await putOrder(env, order);

  if (status === 'PAID' && !order.accountConfig) {
    try {
      const cfg = await createVpnAccount(order, env); // <- string JSON dari server VPN kamu
      order.accountConfig = (cfg || '').trim();
      // normalisasi agar FE enak
      const fields = formatAccountFields(order.accountConfig);
      if (fields) order.accountFields = fields;
      await putOrder(env, order);

      // kirim email (opsional)
      await sendEmailResend(order, fields, env);
    } catch (e) {
      order.error = e?.message || 'create-account-error';
      await putOrder(env, order);
    }
  }

  // WAJIB 200 supaya Duitku stop retry
  return { status: 200, text: 'OK' };
}

// ---------- Export fetch ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = isAllowedOrigin(origin, env) ? origin : null;

    if (request.method === 'OPTIONS') return preflight(allowed, request);

    try {
      if (url.pathname === '/health') {
        return corsify(json({ ok: true, time: Date.now() }), allowed);
      }

      if (url.pathname === '/pay/create' && request.method === 'POST') {
        const body = await readJSON(request);
        if (!body) return corsify(json({ message: 'Invalid JSON' }, 400), allowed);
        const res = await handleCreateInvoice(body, env);
        return corsify(json(res.body, res.status), allowed);
      }

      if (url.pathname === '/pay/status' && request.method === 'GET') {
        const orderId = url.searchParams.get('orderId') || '';
        if (!orderId) return corsify(json({ message: 'orderId required' }, 400), allowed);
        const data = await env.ORDERS.get(keyOrder(orderId), { type: 'json' });
        if (!data) return corsify(json({ message: 'not found' }, 404), allowed);
        return corsify(json(stripSensitive(data), 200), allowed);
      }

      if (url.pathname === '/pay/callback' && request.method === 'POST') {
        // Duitku bisa FORM-ENCODED / JSON
        const ct = (request.headers.get('content-type') || '').toLowerCase();
        const raw = await request.text();
        const payload = ct.includes('application/json')
          ? safeJSON(raw, {})
          : Object.fromEntries(new URLSearchParams(raw));

        const res = await handleCallback(payload, env);
        return new Response(res.text || 'OK', { status: res.status || 200 });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(`ERR: ${e?.message || e}`, { status: 500 });
    }
  }
};
