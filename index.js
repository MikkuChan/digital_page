const SECRET = "zhYqHrObvu62ZJOJeWADvp2a";
const ALLOWED_ORIGIN = "https://vpn.fadzdigital.web.id"; // ganti sesuai domain kamu

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Hanya izinkan POST /cekkuota dari domain yang sah
    if (request.method === "POST" && url.pathname === "/cekkuota") {
      const origin = request.headers.get("origin") || "";
      const referer = request.headers.get("referer") || "";
      const host = request.headers.get("host") || "";

      if (
        !origin.startsWith(ALLOWED_ORIGIN) &&
        !referer.startsWith(ALLOWED_ORIGIN) &&
        host !== "vpn.fadzdigital.web.id"
      ) {
        return forbiddenPage();
      }

      // Parse body JSON
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const msisdn = body.msisdn;
      if (!msisdn || !/^(08[1-9][0-9]{7,11})$/.test(msisdn)) {
        return json({ error: "Nomor tidak valid! Format: 08xxxxxxxxxx" }, 400);
      }
      // Signature (pakai Web Crypto API)
      const timestamp = Date.now() + 10000;
      const encoder = new TextEncoder();
      const key = encoder.encode(SECRET);
      const hmac = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const data = encoder.encode(`${msisdn}.${timestamp}`);
      const signatureBuf = await crypto.subtle.sign("HMAC", hmac, data);
      const signature = Array.from(new Uint8Array(signatureBuf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Request ke API tujuan
      try {
        const resp = await fetch("https://sidompul.violetvpn.biz.id/api/sidompul", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${signature}`,
          },
          body: JSON.stringify({ msisdn, timestamp }),
        });

        const data = await resp.json();
        return json(data, resp.status);
      } catch (err) {
        return json({ error: "Gagal cek kuota, cek koneksi atau coba lagi." }, 500);
      }
    }

    // Semua request lain = 403 forbidden page
    return forbiddenPage();
  },
};

// Helper JSON Response
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

// Halaman 403 Forbidden premium
function forbiddenPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>403 Forbidden - MikkuTod</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { background:#22243a; color:#fff; min-height:100vh; display:flex; align-items:center; justify-content:center; margin:0; }
    .center-card { background:#fff; color:#2c2c48; border-radius:1.8em; box-shadow:0 12px 38px #0003; max-width:350px; width:90vw; padding:2.6em 1.2em 2em 1.2em; text-align:center;}
    .emoji { font-size:2.5em; margin-bottom: .25em;}
    h1 { font-size:2em; margin:0 0 .2em 0;}
    .desc { font-size:1.1em; color:#555b8a; margin-bottom:.5em;}
    .tips { color:#c44; margin-top:1.2em; }
    .footer { color:#7a7ea7; margin-top:2.2em; font-size:.97em;}
  </style>
</head>
<body>
  <div class="center-card">
    <div class="emoji">⛔️</div>
    <h1>403 Forbidden</h1>
    <div class="desc">Akses ke API ini tidak diizinkan.<br>Hanya website resmi yang bisa mengakses fitur ini.</div>
    <div class="tips">
      ⚠️ Jika kamu bukan developer MikkuTod,<br>jangan coba-coba scraping ya!
    </div>
    <div class="footer">
      &copy; MikkuTod API Security
    </div>
  </div>
</body>
</html>
  `, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=UTF-8" }
  });
}
