// ================================
//  FADZDIGITAL API (Cloudflare Worker)
//  Bindings (Dashboard → Settings):
//    KV Namespace  : ORDERS
//    Variables     : lihat daftar di bawah
//
//  Environment Variables (Text / Secret):
//    ALLOWED_ORIGINS : '["https://www.fadzdigital.store"]'
//    DUITKU_API_KEY (Secret)
//    DUITKU_MERCHANT_CODE (Text)
//    DUITKU_ENV : 'sandbox' | 'production'
//    PUBLIC_SITE_BASE : 'https://www.fadzdigital.store'
//    PUBLIC_API_BASE  : 'https://apis.fadzdigital.store'
//    VPN_API_SECRET (Secret) : 'kunci_rahasia_anda'
//    SG_HOSTS : '["sg3.vpnluxury.web.id"]'
//    ID_HOSTS : '["id3.vpnluxury.web.id"]'
//    RESEND_API_KEY (Secret)
//    MAIL_FROM : 'noreply@fadzdigital.com'
//    MAIL_FROM_NAME : 'fadzdigital'            (optional)
//    ADMIN_EMAIL : 'owner@fadzdigital.com'     (optional, BCC)
// ================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = isAllowedOrigin(origin, env) ? origin : null;

    // CORS preflight
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

        const order = await env.ORDERS.get(keyOrder(orderId), { type: 'json' });
        if (!order) return corsify(json({ message: 'not found' }, 404), allowed);

        // Jika sudah PAID + ada config tapi email belum terkirim → coba kirim sekarang (idempoten)
        if (order.status === 'PAID' && order.accountConfig && !order.emailed) {
          try {
            await ensureDisplayAndEmail(order, env);
            await putOrder(env, order);
          } catch (_) { /* biar tetap jalan */ }
        }

        const safe = stripSensitive(order);
        return corsify(json({
          orderId: safe.orderId,
          status: safe.status,
          paymentUrl: safe.paymentUrl || null,
          accountConfig: safe.accountConfig || null,
          accountDisplay: safe.accountDisplay || null
        }, 200), allowed);
      }

      if (url.pathname === '/pay/callback' && request.method === 'POST') {
        // Duitku bisa mengirim FORM-ENCODED / JSON
        const ct = request.headers.get('content-type') || '';
        const raw = await request.text();
        const payload = ct.includes('application/json')
          ? safeJSON(raw, {})
          : Object.fromEntries(new URLSearchParams(raw));

        const res = await handleCallback(payload, env);
        // WAJIB 200 agar Duitku stop retry
        return new Response(res.text || 'OK', { status: res.status || 200 });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(`ERR: ${e?.message || e}`, { status: 500 });
    }
  }
};

// ================= Handlers =================

async function handleCreateInvoice(input, env) {
  const pkg = mapPackage(input?.packageId);
  if (!pkg) return { status: 400, body: { message: 'Paket tidak valid' } };

  const protocol = ['vmess', 'vless', 'trojan'].includes((input?.protocol || '').toLowerCase())
    ? input.protocol.toLowerCase() : 'vmess';

  const username       = sanitize(input?.username);
  const usernameFinal  = sanitize(input?.usernameFinal); // FE sudah tambah -{3digit}
  const email          = (input?.email || '').trim();

  if (!username || !usernameFinal) {
    return { status: 400, body: { message: 'Username tidak valid' } };
  }

  const orderId = `FDZ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // simpan order awal
  const order = {
    orderId,
    packageId: pkg.id,
    price: pkg.price,           // rupiah
    quota: pkg.quotaGB,         // GB
    expDays: pkg.expDays,
    iplimit: pkg.iplimit,       // hidden dari FE
    region: pkg.region,         // 'SG' | 'ID'
    protocol,
    username,
    usernameFinal,
    email,
    status: 'PENDING',
    createdAt: Date.now(),
    emailed: false
  };
  await putOrder(env, order);

  // Buat invoice Duitku (POP)
  const { endpoint, headers } = await buildDuitkuHeaders(env);
  const payload = {
    paymentAmount: pkg.price,
    merchantOrderId: orderId,
    productDetails: `VPN ${pkg.label} (${protocol.toUpperCase()})`,
    additionalParam: `${pkg.id}|${protocol}|${usernameFinal}`,
    merchantUserInfo: email || '',
    customerVaName: order.usernameFinal,
    email: email || 'noemail@fadzdigital.local',
    phoneNumber: '',
    itemDetails: [{ name: `VPN ${pkg.label}`, price: pkg.price, quantity: 1 }],
    callbackUrl: `${getApiBase(env)}/pay/callback`,
    returnUrl: `${env.PUBLIC_SITE_BASE || ''}/ordervpn.html`,
    expiryPeriod: 60 // menit
  };

  const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await resp.text();
  const data = safeJSON(text, { raw: text });

  if (!resp.ok || !data?.reference) {
    return { status: 502, body: { message: 'Gagal membuat invoice', detail: data } };
  }

  // simpan short mapping ref -> orderId (berguna jika perlu)
  await env.ORDERS.put(refKey(data.reference), orderId, { expirationTtl: 60 * 60 * 24 * 7 });

  // update order dgn paymentUrl (kalau ada)
  if (data.paymentUrl) {
    order.paymentUrl = data.paymentUrl;
    await putOrder(env, order);
  }

  return { status: 200, body: { orderId, reference: data.reference, paymentUrl: data.paymentUrl } };
}

async function handleCallback(payload, env) {
  const orderId = payload.merchantOrderId || payload.merchantorderid || payload.orderId;
  if (!orderId) return { status: 400, text: 'NO ORDER' };

  const resultCode = String(payload.resultCode || payload.resultcode || '');
  const normalizedStatus = resultCode === '00' ? 'PAID' : (resultCode === '01' ? 'PENDING' : 'FAILED');

  const order = await env.ORDERS.get(keyOrder(orderId), { type: 'json' });
  if (!order) return { status: 404, text: 'ORDER NOT FOUND' };

  // (Opsional) verifikasi langsung ke Duitku:
  // const verify = await verifyWithDuitku(orderId, env);
  // if (verify?.status === 'SUCCESS') normalizedStatus = 'PAID';

  order.status = normalizedStatus;
  await putOrder(env, order);

  if (normalizedStatus === 'PAID' && !order.accountConfig) {
    try {
      // 1) Provision akun VPN di server kamu
      const rawCfg = await createVpnAccount(order, env);
      order.accountConfig = (rawCfg || '').trim();

      // 2) Build tampilan human-readable utk UI + email
      order.accountDisplay = buildDisplayText(order.accountConfig, {
        orderId: order.orderId
      });

      // 3) Kirim email kalau user isi email
      await trySendEmail(order, env);

      // 4) Simpan
      await putOrder(env, order);
    } catch (e) {
      order.error = e?.message || 'create-account-error';
      await putOrder(env, order);
    }
  }

  return { status: 200, text: 'OK' };
}

// Kirim email jika perlu (idempoten)
async function trySendEmail(order, env) {
  if (!order) return;
  if (!order.accountDisplay) {
    order.accountDisplay = buildDisplayText(order.accountConfig || '', { orderId: order.orderId });
  }
  if (order.email && !order.emailed) {
    await sendWithResend({
      env,
      to: order.email,
      subject: `Detail Akun VPN – Order ${order.orderId}`,
      text: order.accountDisplay,
      html: preHtml(order.accountDisplay),
      bcc: env.ADMIN_EMAIL || ''
    });
    order.emailed = true;
  }
}

// Pastikan ada displayText + coba email (dipanggil dari /pay/status juga)
async function ensureDisplayAndEmail(order, env) {
  if (order.accountConfig && !order.accountDisplay) {
    order.accountDisplay = buildDisplayText(order.accountConfig, { orderId: order.orderId });
  }
  if (!order.emailed) {
    await trySendEmail(order, env);
  }
}

// ================= VPN Creator =================

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
    quota: String(order.quota),   // 300/600 (GB) — pastikan sesuai API backend
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
  return txt; // JSON string seperti contohmu
}

// ================= Tampilan Akun (human-readable) =================

function buildDisplayText(rawConfig, meta = {}) {
  let p = null;
  try { p = JSON.parse(rawConfig); } catch (_) { /* raw */ }

  // Kalau bukan JSON valid, kirim raw saja
  if (!p || typeof p !== 'object') {
    return [
      '=== FADZDIGITAL VPN ACCOUNT ===',
      meta.orderId ? `Order ID : ${meta.orderId}` : null,
      '',
      '[Raw Response]',
      (rawConfig || '(no data)').trim(),
      ''
    ].filter(Boolean).join('\n');
  }

  const out = [];
  out.push('=== FADZDIGITAL VPN ACCOUNT ===');
  if (meta.orderId) out.push(`Order ID : ${meta.orderId}`);
  if (p.username) out.push(`Username : ${p.username}`);
  if (p.uuid)     out.push(`UUID     : ${p.uuid}`);
  if (p.quota_gb) out.push(`Quota    : ${p.quota_gb} GB`);
  if (p.created)  out.push(`Created  : ${p.created}`);
  if (p.expired)  out.push(`Expired  : ${p.expired}`);
  if (p.domain)   out.push(`Domain   : ${p.domain}`);
  out.push('');

  if (p.ws_tls)  { out.push('[WS TLS]');     out.push(p.ws_tls.trim());  out.push(''); }
  if (p.ws_ntls) { out.push('[WS Non-TLS]'); out.push(p.ws_ntls.trim()); out.push(''); }
  if (p.grpc)    { out.push('[gRPC]');       out.push(p.grpc.trim());    out.push(''); }
  if (p.config_url) { out.push(`Config URL: ${p.config_url}`); out.push(''); }

  out.push('Simpan konfigurasi ini dengan aman.');
  out.push('Terima kasih sudah bertransaksi di fadzdigital.');
  return out.join('\n');
}

function preHtml(text) {
  const esc = String(text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<pre style="font-family:ui-monospace,monospace;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc}</pre>`;
}

// ================= Paket Produk =================

function mapPackage(id) {
  const packs = {
    // HP (personal) — 300GB / 30 hari
    SG_HP_10K: { id: 'SG_HP_10K', label: 'SG HP 300GB/30h', price: 10000, quotaGB: 300, expDays: 30, iplimit: 10, region: 'SG' },
    ID_HP_15K: { id: 'ID_HP_15K', label: 'ID HP 300GB/30h', price: 15000, quotaGB: 300, expDays: 30, iplimit: 10, region: 'ID' },
    // STB/OpenWrt (wifi-sharing) — 600GB / 30 hari
    SG_STB_15K:{ id: 'SG_STB_15K', label: 'SG STB 600GB/30h', price: 15000, quotaGB: 600, expDays: 30, iplimit: 20, region: 'SG' },
    ID_STB_20K:{ id: 'ID_STB_20K', label: 'ID STB 600GB/30h', price: 20000, quotaGB: 600, expDays: 30, iplimit: 20, region: 'ID' }
  };
  return packs[id] || null;
}

// ================= Duitku Helpers =================

async function buildDuitkuHeaders(env) {
  const isProd = (env.DUITKU_ENV || 'sandbox') === 'production';
  const endpoint = isProd
    ? 'https://api-prod.duitku.com/api/merchant/createInvoice'
    : 'https://api-sandbox.duitku.com/api/merchant/createInvoice';

  // Signature POP createInvoice dengan timestamp:
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

// (Opsional) verifikasi status langsung ke Duitku
async function verifyWithDuitku(orderId, env) {
  const isProd = (env.DUITKU_ENV || 'sandbox') === 'production';
  const url = isProd
    ? 'https://api-prod.duitku.com/api/merchant/checkTransactionStatus'
    : 'https://api-sandbox.duitku.com/api/merchant/checkTransactionStatus';

  // Signature checkTransactionStatus = sha256(merchantCode + merchantOrderId + apiKey)
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

// ================= Email (Resend) =================

async function sendWithResend({ env, to, subject, text, html, bcc }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY belum di-set.');
  if (!env.MAIL_FROM) throw new Error('MAIL_FROM belum di-set.');
  const fromName = env.MAIL_FROM_NAME || 'fadzdigital';
  const from = `${fromName} <${env.MAIL_FROM}>`;

  const payload = {
    from,
    to: [to],
    subject,
    text,
    html
  };
  if (bcc) payload.bcc = [bcc];

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errTxt = await resp.text().catch(()=> '');
    throw new Error(`Gagal kirim email: ${errTxt || resp.status}`);
  }
}

// ================= KV & Utils =================

function keyOrder(orderId) { return `order:${orderId}`; }
function refKey(ref)      { return `ref:${ref}`; }

async function putOrder(env, orderObj) {
  await env.ORDERS.put(keyOrder(orderObj.orderId), JSON.stringify(orderObj), {
    expirationTtl: 60 * 60 * 24 * 7 // 7 hari
  });
}

function stripSensitive(order) {
  const { iplimit, ...safe } = order;
  return safe;
}

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
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return await req.json().catch(() => null);
}

function safeJSON(s, d) { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return d; } }

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getApiBase(env) {
  return env.PUBLIC_API_BASE || '';
}
