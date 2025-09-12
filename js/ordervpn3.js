// ================================
//  FADZDIGITAL API (Cloudflare Worker) - Struktur ENV Baru
//  KV Binding : ORDERS
// ================================

// ---------- Utils & helpers ----------
// Fungsi MD5 dari Paul Johnston
function md5(string) { function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); } function AddUnsigned(lX, lY) { var lX4, lY4, lX8, lY8, lResult; lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000); lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000); lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF); if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8); if (lX4 | lY4) { if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8); else return (lResult ^ 0x40000000 ^ lX8 ^ lY8); } else return (lResult ^ lX8 ^ lY8); } function F(x, y, z) { return (x & y) | ((~x) & z); } function G(x, y, z) { return (x & z) | (y & (~z)); } function H(x, y, z) { return (x ^ y ^ z); } function I(x, y, z) { return (y ^ (x | (~z))); } function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); } function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); } function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); } function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); } function ConvertToWordArray(string) { var lWordCount; var lMessageLength = string.length; var lNumberOfWords_temp1 = lMessageLength + 8; var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64; var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16; var lWordArray = Array(lNumberOfWords - 1); var lBytePosition = 0; var lByteCount = 0; while (lByteCount < lMessageLength) { lWordCount = (lByteCount - (lByteCount % 4)) / 4; lBytePosition = (lByteCount % 4) * 8; lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition)); lByteCount++; } lWordCount = (lByteCount - (lByteCount % 4)) / 4; lBytePosition = (lByteCount % 4) * 8; lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition); lWordArray[lNumberOfWords - 2] = lMessageLength << 3; lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29; return lWordArray; } function WordToHex(lValue) { var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount; for (lCount = 0; lCount <= 3; lCount++) { lByte = (lValue >>> (lCount * 8)) & 255; WordToHexValue_temp = "0" + lByte.toString(16); WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2); } return WordToHexValue; } function Utf8Encode(string) { string = string.replace(/\r\n/g, "\n"); var utftext = ""; for (var n = 0; n < string.length; n++) { var c = string.charCodeAt(n); if (c < 128) { utftext += String.fromCharCode(c); } else if ((c > 127) && (c < 2048)) { utftext += String.fromCharCode((c >> 6) | 192); utftext += String.fromCharCode((c & 63) | 128); } else { utftext += String.fromCharCode((c >> 12) | 224); utftext += String.fromCharCode(((c >> 6) & 63) | 128); utftext += String.fromCharCode((c & 63) | 128); } } return utftext; } var x = Array(); var k, AA, BB, CC, DD, a, b, c, d; var S11 = 7, S12 = 12, S13 = 17, S14 = 22; var S21 = 5, S22 = 9, S23 = 14, S24 = 20; var S31 = 4, S32 = 11, S33 = 16, S34 = 23; var S41 = 6, S42 = 10, S43 = 15, S44 = 21; string = Utf8Encode(string); x = ConvertToWordArray(string); a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476; for (k = 0; k < x.length; k += 16) { AA = a; BB = b; CC = c; DD = d; a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756); c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE); a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A); c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501); a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF); c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE); a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193); c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821); a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340); c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA); a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x2441453); c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8); a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6); c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED); a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8); c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A); a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681); c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C); a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9); c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70); a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA); c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05); a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5); c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665); a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97); c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039); a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92); c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1); a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0); c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1); a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235); c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391); a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD); } var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d); return temp.toLowerCase(); }
function isAllowedOrigin(origin, env) { const list = safeJSON(env.ALLOWED_ORIGINS, []); return !!origin && Array.isArray(list) && list.includes(origin); }
function preflight(allow, req) { const h = new Headers(); h.set('Access-Control-Allow-Origin', allow || 'null'); h.set('Vary', 'Origin'); h.set('Access-Control-Allow-Methods', req.headers.get('Access-Control-Request-Method') || 'GET, POST, OPTIONS'); h.set('Access-Control-Allow-Headers', req.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization'); h.set('Access-Control-Max-Age', '86400'); return new Response(null, { status: 204, headers: h }); }
function corsify(resp, allow) { const h = new Headers(resp.headers); h.set('Access-Control-Allow-Origin', allow || 'null'); h.set('Vary', 'Origin'); return new Response(resp.body, { status: resp.status, headers: h }); }
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
function sanitize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 24); }
function sanitizeEnum(s) { return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9\-_]/g,''); }
function normId(s){ return String(s||'').trim().toLowerCase(); }
async function readJSON(req) { const ct = (req.headers.get('content-type') || '').toLowerCase(); if (!ct.includes('application/json')) return null; try { return await req.json(); } catch { return null; } }
function safeJSON(s, d) { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return d; } }
async function sha256hex(str) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function getApiBase(env) { return env.PUBLIC_API_BASE || ''; }
function escapeHtml(s) { return String(s || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// [BARU] Fungsi untuk memuat daftar produk dari variabel ENV
function loadProducts(region, variant, env) {
    const varName = `PRICE_${region}_${variant}`;
    const rawJson = env[varName];
    if (!rawJson) return [];
    return safeJSON(rawJson, []);
}

// [BARU] Fungsi untuk mencari satu produk spesifik berdasarkan ID-nya
function findProductById(region, variant, serverId, env) {
    const productList = loadProducts(region, variant, env);
    const normalizedServerId = normId(serverId);
    return productList.find(p => normId(p.id) === normalizedServerId);
}

// ---------- Promo helpers ----------
function parsePromoCodes(env) { const raw = env.PROMO_CODES || ''; const js = safeJSON(raw, null); let arr = []; if (Array.isArray(js)) arr = js; else if (typeof raw === 'string') arr = raw.split(/[,\s]+/).filter(Boolean); return arr.map(s => s.toLowerCase()); }
function promoActive(env) { return String(env.STATUS_CPROMO || '').toLowerCase() === 'online'; }
function applyPromo(basePrice, promoCode, env) { if (!promoActive(env)) return { final: basePrice, discount: 0, applied: false }; const list = parsePromoCodes(env); const code = String(promoCode || '').toLowerCase().trim(); if (!code || !list.includes(code)) return { final: basePrice, discount: 0, applied: false }; const disc = Math.max(0, parseInt(env.DISC_PROMCODE || '0', 10) || 0); const final = Math.max(0, basePrice - disc); return { final, discount: Math.min(disc, basePrice), applied: true, code }; }

// ---------- Duitku helpers ----------
async function buildDuitkuHeaders(env) { const isProd = (env.DUITKU_ENV || 'sandbox') === 'production'; const endpoint = isProd ? 'https://api-prod.duitku.com/api/merchant/createInvoice' : 'https://api-sandbox.duitku.com/api/merchant/createInvoice'; const ts  = Date.now().toString(); const raw = `${env.DUITKU_MERCHANT_CODE}${ts}${env.DUITKU_API_KEY}`; const sig = await sha256hex(raw); return { endpoint, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'x-duitku-timestamp': ts, 'x-duitku-merchantcode': env.DUITKU_MERCHANT_CODE, 'x-duitku-signature': sig } }; }
async function verifyWithDuitku(orderId, env) { const isProd = (env.DUITKU_ENV || 'sandbox') === 'production'; const url = isProd ? 'https://api-prod.duitku.com/api/merchant/checkTransactionStatus' : 'https://api-sandbox.duitku.com/api/merchant/checkTransactionStatus'; const sigRaw = `${env.DUITKU_MERCHANT_CODE}${orderId}${env.DUITKU_API_KEY}`; const signature = await sha256hex(sigRaw); const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ merchantCode: env.DUITKU_MERCHANT_CODE, merchantOrderId: orderId, signature }) }); const t = await r.text(); return safeJSON(t, { raw: t }); }

// ---------- KV helpers ----------
function keyOrder(orderId) { return `order:${orderId}`; }
function refKey(ref)       { return `ref:${ref}`; }
async function putOrder(env, orderObj) { await env.ORDERS.put(keyOrder(orderObj.orderId), JSON.stringify(orderObj), { expirationTtl: 60 * 60 * 24 * 7 }); }
function stripSensitive(order) { const { iplimit, ...safe } = order; if (order.accountConfig && !safe.accountFields) { try { safe.accountFields = formatAccountFields(order.accountConfig, order?.server?.host); } catch {} } return safe; }

// ---------- Normalisasi hasil akun ----------
function formatAccountFields(cfg, fallbackDomain) { const obj = typeof cfg === 'string' ? safeJSON(cfg, null) : cfg; if (obj && typeof obj === 'object') { return { username: obj.username || obj.user || '', domain:   obj.domain   || fallbackDomain || '', uuid:     obj.uuid     || '', quota_gb: obj.quota_gb ?? obj.quota ?? null, created:  obj.created  || '', expired:  obj.expired  || '', ws_tls:   obj.ws_tls   || '', ws_ntls:  obj.ws_ntls  || '', grpc:     obj.grpc     || '', config_url: obj.config_url || '' }; } return null; }
function buildAccountText(fields) { if (!fields) return ''; const lines = []; lines.push('=== FADZDIGITAL VPN ACCOUNT ==='); if (fields.username) lines.push(`Username : ${fields.username}`); if (fields.domain)   lines.push(`Domain   : ${fields.domain}`); if (fields.uuid)     lines.push(`UUID     : ${fields.uuid}`); if (fields.quota_gb != null) lines.push(`Quota    : ${fields.quota_gb} GB`); if (fields.created)  lines.push(`Created  : ${fields.created}`); if (fields.expired)  lines.push(`Expired  : ${fields.expired}`); lines.push(''); if (fields.ws_tls)   { lines.push('[WS TLS]');       lines.push(fields.ws_tls);  lines.push(''); } if (fields.ws_ntls)  { lines.push('[WS Non-TLS]');  lines.push(fields.ws_ntls); lines.push(''); } if (fields.grpc)     { lines.push('[gRPC]');         lines.push(fields.grpc);    lines.push(''); } if (fields.config_url) { lines.push(`Config URL: ${fields.config_url}`); lines.push(''); } lines.push('Simpan file ini untuk impor konfigurasi.'); return lines.join('\n'); }

// ---------- Create akun VPN ----------
async function createVpnAccount(order, env) { let host = order?.server?.host; if (!host) return; const base = `http://${host}:5888`; const qs = new URLSearchParams({ user: order.usernameFinal, exp: String(order.expDays), quota: String(order.quota), iplimit: String(order.iplimit), auth: env.VPN_API_SECRET }); let path = '/createvmess'; if (order.protocol === 'vless')  path = '/createvless'; if (order.protocol === 'trojan') path = '/createtrojan'; const full = `${base}${path}?${qs.toString()}`; const r = await fetch(full, { method: 'GET', redirect: 'manual' }); const txt = await r.text(); if (!r.ok) throw new Error(`VPN API error (${r.status})`); return txt; }

// ---------- Email (Resend) opsional ----------
async function sendEmailResend(order, fields, env) { const apiKey = env.RESEND_API_KEY; const from = env.MAIL_FROM || 'fadzdigital <no-reply@support.fadzdigital.store>'; const to = (order.email || '').trim(); if (!apiKey || !to) return; const subject = `Akun VPN #${order.orderId} — ${order.variant}/${order.region}/${order.server?.id || order.packageId} (${order.protocol.toUpperCase()})`; const text = buildAccountText(fields || null) || (order.accountConfig || ''); const html = ` <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif"> <h2 style="margin:0 0 12px">Akun VPN Anda</h2> <p style="margin:0 0 6px">Order ID: <b>${order.orderId}</b></p> <p style="margin:0 0 6px">Varian/Region/Server: <b>${order.variant}</b> / <b>${order.region}</b> / <b>${order.server?.id || '-'}</b></p> <p style="margin:0 0 10px">Protocol: <b>${order.protocol.toUpperCase()}</b></p> <pre style="background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(text)}</pre> <p style="color:#64748b;font-size:12px;margin-top:12px">Simpan konfigurasi ini dengan aman.</p> </div> `; await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, subject, html, text }) }).catch(() => {}); }

// ---------- Security: IP allowlist + signature verify for callback ----------
const DUITKU_IPS = { production: [ '182.23.85.8','182.23.85.9','182.23.85.10', '182.23.85.13','182.23.85.14', '103.177.101.184','103.177.101.185','103.177.101.186', '103.177.101.189','103.177.101.190' ], sandbox: [ '182.23.85.11','182.23.85.12','202.145.0.55', '103.177.101.187','103.177.101.188' ] };
function isCallbackIpAllowed(clientIp, env) { if (!clientIp) return false; const mode = (env.DUITKU_ENV || 'sandbox') === 'production' ? 'production' : 'sandbox'; const override = safeJSON(env.DUITKU_CALLBACK_IPS, null); const list = Array.isArray(override) && override.length ? override : DUITKU_IPS[mode]; return list.includes(clientIp); }
function isValidDuitkuSignature(payload, env) { const merchantCode = env.DUITKU_MERCHANT_CODE || ''; const merchantKey = env.DUITKU_MERCHANT_KEY || ''; const amountStr = String(payload.amount ?? '').trim(); const orderId = String(payload.merchantOrderId ?? '').trim(); const sentSig = String(payload.signature ?? '').trim().toLowerCase(); if (!merchantCode || !merchantKey || !amountStr || !orderId || !sentSig) { return false; } const amountInt = Math.round(parseFloat(amountStr)); const signatureString = `${merchantCode}${amountInt}${orderId}${merchantKey}`; const calculatedSig = md5(signatureString).toLowerCase(); return calculatedSig === sentSig; }

// ---------- Handlers ----------
async function handleCreateInvoice(input, env) {
    const variant = sanitizeEnum(input?.variant);
    const region  = sanitizeEnum(input?.region);
    const serverId = normId(input?.serverId);
    if (!['HP','STB'].includes(variant)) return { status: 400, body: { message: 'Varian harus HP/STB' } };
    if (!['SG','ID'].includes(region))   return { status: 400, body: { message: 'Region harus SG/ID' } };

    const product = findProductById(region, variant, serverId, env);
    if (!product) {
        return { status: 400, body: { message: `Produk/Server dengan ID '${serverId}' tidak ditemukan untuk ${region} ${variant}` } };
    }

    const basePrice = Number(product.price);
    const promoRes = applyPromo(basePrice, input?.promoCode, env);
    const finalPrice = promoRes.final;

    const protocol = ['vmess','vless','trojan'].includes((input?.protocol||'').toLowerCase()) ? input.protocol.toLowerCase() : 'vmess';
    const username = sanitize(input?.username);
    const usernameFinal = sanitize(input?.usernameFinal);
    if (!username || !usernameFinal) return { status: 400, body: { message: 'Username tidak valid' } };

    const orderId = `FDZ-${Date.now()}`;
    const order = {
        orderId,
        packageId: `${region}_${variant}_${product.id}`,
        variant,
        region,
        server: { id: product.id, host: product.host, label: product.label || product.id.toUpperCase() },
        priceOriginal: basePrice,
        price: finalPrice,
        promo: promoRes.applied ? { code: promoRes.code, discount: promoRes.discount } : null,
        quota: product.quotaGB,
        expDays: product.expDays,
        iplimit: product.iplimit,
        protocol,
        username,
        usernameFinal,
        email: (input?.email || '').trim(),
        status: 'PENDING',
        createdAt: Date.now()
    };
    await putOrder(env, order);

    const { endpoint, headers } = await buildDuitkuHeaders(env);
    const productName = `VPN ${region} ${variant} ${order.server.label} (${protocol.toUpperCase()})`;
    
    const itemDetails = [];
    itemDetails.push({
        name: productName,
        price: basePrice,
        quantity: 1
    });
    if (promoRes.applied && promoRes.discount > 0) {
        itemDetails.push({
            name: `Promo: ${promoRes.code.toUpperCase()}`,
            price: -promoRes.discount,
            quantity: 1
        });
    }
    
    const payload = {
        paymentAmount: finalPrice,
        merchantOrderId: orderId,
        productDetails: productName,
        additionalParam: `${variant}|${region}|${server.id}|${protocol}|${usernameFinal}`,
        merchantUserInfo: order.email || '',
        customerVaName: order.usernameFinal,
        email: order.email || 'noemail@fadzdigital.local',
        phoneNumber: '',
        itemDetails: itemDetails,
        callbackUrl: `${getApiBase(env)}/pay/callback`,
        returnUrl: `${env.PUBLIC_SITE_BASE || ''}/ordervpn.html`,
        expiryPeriod: 60
    };

    const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    const text = await resp.text();
    const data = safeJSON(text, { raw: text });
    if (!resp.ok || !data?.reference || !data?.paymentUrl) { return { status: 502, body: { message: 'Gagal membuat invoice', detail: data } }; }
    await env.ORDERS.put(refKey(data.reference), orderId, { expirationTtl: 60*60*24*7 });
    return { status: 200, body: { orderId, reference: data.reference, paymentUrl: data.paymentUrl } };
}

async function handleCallback(payload, env) {
  const orderId = payload.merchantOrderId || payload.merchantorderid || payload.orderId;
  if (!orderId) return { status: 400, text: 'NO ORDER' };
  const resultCode = String(payload.resultCode || payload.resultcode || '');
  let status = resultCode === '00' ? 'PAID' : (resultCode === '01' ? 'PENDING' : 'FAILED');
  const order = await env.ORDERS.get(keyOrder(orderId), { type: 'json' });
  if (!order) return { status: 404, text: 'ORDER NOT FOUND' };
  if (status !== 'PAID') { const verify = await verifyWithDuitku(orderId, env); if (verify?.statusCode === '00') status = 'PAID'; }
  order.status = status;
  await putOrder(env, order);
  if (status === 'PAID' && !order.accountConfig) {
    try {
      const cfg = await createVpnAccount(order, env);
      order.accountConfig = (cfg || '').trim();
      const fields = formatAccountFields(order.accountConfig, order?.server?.host);
      if (fields) order.accountFields = fields;
      await putOrder(env, order);
      await sendEmailResend(order, fields, env);
    } catch (e) {
      order.error = e?.message || 'create-account-error';
      await putOrder(env, order);
    }
  }
  return { status: 200, text: 'OK' };
}

function buildConfigResponse(env){
    function listFor(region, variant) {
        const products = loadProducts(region, variant, env);
        const arr = products.map(p => ({
            id: p.id,
            label: p.label || p.id.toUpperCase(),
            price: Number(p.price) || 0
        }));
        arr.sort((a,b)=> String(a.id).localeCompare(String(b.id), undefined, {numeric:true, sensitivity:'base'}));
        return arr;
    }

    const config = {
        versions: { api: 2, config: 2 }, // Versi config baru
        variants: {
            HP : { SG: listFor('SG','HP'),  ID: listFor('ID','HP')  },
            STB: { SG: listFor('SG','STB'), ID: listFor('ID','STB') }
        },
        promo: {
            status: String(env.STATUS_CPROMO || '').toLowerCase() || 'offline',
            discount: parseInt(env.DISC_PROMCODE || '0',10) || 0,
            codes: parsePromoCodes(env)
        }
    };
    return config;
}

// ---------- Export fetch ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = isAllowedOrigin(origin, env) ? origin : null;
    if (request.method === 'OPTIONS') return preflight(allowed, request);
    try {
      let path = url.pathname.replace(/\/+$/,'');
      if (path === '') path = '/';
      if (path === '/health') { return corsify(json({ ok: true, time: Date.now() }), allowed); }
      if (path === '/config' && request.method === 'GET') { const cfg = buildConfigResponse(env); return corsify(json(cfg, 200), allowed); }
      if (path === '/pay/create' && request.method === 'POST') { const body = await readJSON(request); if (!body) return corsify(json({ message: 'Invalid JSON' }, 400), allowed); const res = await handleCreateInvoice(body, env); return corsify(json(res.body, res.status), allowed); }
      if (path === '/pay/status' && request.method === 'GET') { const orderId = url.searchParams.get('orderId') || ''; if (!orderId) return corsify(json({ message: 'orderId required' }, 400), allowed); const data = await env.ORDERS.get(keyOrder(orderId), { type: 'json' }); if (!data) return corsify(json({ message: 'not found' }, 404), allowed); return corsify(json(stripSensitive(data), 200), allowed); }
      if (path === '/pay/callback' && request.method === 'POST') {
        const ip = (request.headers.get('CF-Connecting-IP') || '').trim();
        if (!isCallbackIpAllowed(ip, env)) return new Response('Forbidden', { status: 403 });
        const ct  = (request.headers.get('content-type') || '').toLowerCase();
        const raw = await request.text();
        const payload = ct.includes('application/json') ? safeJSON(raw, {}) : Object.fromEntries(new URLSearchParams(raw));
        if (!isValidDuitkuSignature(payload, env)) return new Response('Invalid signature', { status: 400 });
        const res = await handleCallback(payload, env);
        return new Response(res.text || 'OK', { status: res.status || 200 });
      }
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      console.error("Worker Execution Error:", e);
      return new Response(`ERR: ${e?.message || e}`, { status: 500 });
    }
  }
};
