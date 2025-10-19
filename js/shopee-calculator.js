document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("calcForm");
  const resultBox = document.getElementById("result");
  const sellingPriceEl = document.getElementById("sellingPrice");
  const detailsEl = document.getElementById("details");
  const copyBtn = document.getElementById("copyBtn");
  const printBtn = document.getElementById("printBtn");
  const resetBtn = document.getElementById("resetBtn");

  const modalEl = document.getElementById("modal");
  const marginEl = document.getElementById("margin");
  const discountEl = document.getElementById("discount");
  const packagingEl = document.getElementById("packaging");
  const statusEl = document.getElementById("sellerStatus");
  const categoryEl = document.getElementById("category");
  const useGoEl = document.getElementById("useGo");
  const goFields = document.querySelectorAll(".go-fields");
  const goRateEl = document.getElementById("goRate");
  const usePromoEl = document.getElementById("usePromo");
  const promoFields = document.querySelectorAll(".promo-fields");
  const promoRateEl = document.getElementById("promoRate");
  const qtyEl = document.getElementById("qty");

  const ORDER_PROCESS_FEE = 1250;
  const GO_CAP_PER_QTY = 40000;
  const PROMO_CAP_PER_QTY = 60000;

  const RATES = {
    nonstar:{A:.08,B:.075,C:.0575,D:.0425,E:.025},
    star:{A:.08,B:.075,C:.0575,D:.0425,E:.025},
    mall:{A:.102,B:.097,C:.072,D:.062,E:.052,F:.032,G:.025}
  };

  // Populate kategori sesuai status toko
  function populateCategories(){
    const map = RATES[statusEl.value];
    categoryEl.innerHTML = "";
    Object.keys(map).forEach(k=>{
      const opt = document.createElement("option");
      const pct = (map[k]*100).toFixed(2).replace(/\.?0+$/,'');
      opt.value = map[k];
      opt.textContent = `Kategori ${k} — ${pct}%`;
      categoryEl.appendChild(opt);
    });
  }
  populateCategories();
  statusEl.addEventListener("change", populateCategories);

  // Toggle fields
  const toggle = (on, nodes)=>nodes.forEach(n=>n.classList.toggle("hidden", !on));
  useGoEl.addEventListener("change", ()=>toggle(useGoEl.checked, goFields));
  usePromoEl.addEventListener("change", ()=>toggle(usePromoEl.checked, promoFields));
  toggle(useGoEl.checked, goFields); toggle(usePromoEl.checked, promoFields);

  // Solver harga dg CAP-logic
  function solvePrice({modal,margin,packaging,discountPenjual,qty,commissionRate,goEnabled,goRate,promoEnabled,promoRate}){
    const baseNominal = modal + (margin||0) + ORDER_PROCESS_FEE + (packaging||0);
    const rK = commissionRate, rG = goEnabled ? goRate : 0, rP = promoEnabled ? promoRate : 0;
    const capG = GO_CAP_PER_QTY * qty, capP = PROMO_CAP_PER_QTY * qty;

    const tryNoCap = ()=>{
      const denom = 1 - (rK + rG + rP);
      if (denom <= 0) return null;
      const price = baseNominal / denom;
      const base = Math.max(price - (discountPenjual||0), 0);
      const fP = rP * base, fG = rG * base;
      if ((!promoEnabled || fP <= capP + 1e-6) && (!goEnabled || fG <= capG + 1e-6)){
        return {price, applied:{promoFee:fP||0, goFee:fG||0, promoCapped:false, goCapped:false}};
      }
      return null;
    };

    const tryCaps = (pCap, gCap)=>{
      let denom = 1 - rK - (pCap ? 0 : rP) - (gCap ? 0 : rG);
      if (denom <= 0) return null;
      const numerator = baseNominal + (pCap ? capP : 0) + (gCap ? capG : 0);
      const price = numerator / denom;
      const base = Math.max(price - (discountPenjual||0), 0);
      const fP = rP * base, fG = rG * base;
      const pIsCap = promoEnabled && fP >= capP - 1e-6;
      const gIsCap = goEnabled && fG >= capG - 1e-6;
      const pOK = !promoEnabled || (pCap ? pIsCap : fP < capP + 1e-6);
      const gOK = !goEnabled || (gCap ? gIsCap : fG < capG + 1e-6);
      if (pOK && gOK){
        return {price, applied:{promoFee:pCap?capP:fP||0, goFee:gCap?capG:fG||0, promoCapped:!!pCap, goCapped:!!gCap}};
      }
      return null;
    };

    let out = tryNoCap(); if (out) return out;
    for (const pair of [[true,false],[false,true],[true,true]]){ out = tryCaps(...pair); if (out) return out; }
    return null;
  }

  // Helpers
  const money = n => "Rp " + (+n).toLocaleString("id-ID");
  const pct = n => (n*100).toFixed(2).replace(/\.?0+$/,'');
  function animateCount(el, to){
    const start = 0, dur = 600, t0 = performance.now();
    function step(t){
      const p = Math.min(1, (t - t0)/dur);
      el.textContent = money(Math.ceil(start + (to-start)*p));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function smoothScrollInto(viewEl){
    viewEl.scrollIntoView({behavior:"smooth", block:"start"});
  }

  // Chart instance
  let feeChart = null;
  function renderChart({komisi, promo, go, proses, kemasan, netReceive}){
    const ctx = document.getElementById("feeChart");
    const data = [komisi, promo, go, proses, kemasan, netReceive];
    const labels = ["Komisi", "Promo XTRA", "GO XTRA", "Biaya Proses", "Kemasan (kamu)", "Terima Bersih"];
    if (feeChart) feeChart.destroy();
    feeChart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data }]},
      options: {
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 14, usePointStyle: true } },
          tooltip: { callbacks: { label: (c)=> `${c.label}: ${money(c.parsed)}` } }
        },
        cutout: "60%"
      }
    });
  }

  // Reset
  resetBtn.addEventListener("click", ()=>{
    form.reset();
    toggle(false, goFields);
    toggle(true, promoFields);
    detailsEl.innerHTML = "";
    resultBox.classList.add("hidden");
  });

  // Submit
  form.addEventListener("submit", (e)=>{
    e.preventDefault();

    const modal = parseFloat(modalEl.value||"0");
    const margin = parseFloat(marginEl.value||"0");
    const packaging = parseFloat(packagingEl.value||"0");
    const discountPenjual = parseFloat(discountEl.value||"0");
    const qty = Math.max(parseInt(qtyEl.value||"1",10),1);

    const commissionRate = parseFloat(categoryEl.value);
    const goEnabled = useGoEl.checked;
    const goRate = goEnabled ? (parseFloat(goRateEl.value||"0")/100) : 0;
    const promoEnabled = usePromoEl.checked;
    const promoRate = promoEnabled ? (parseFloat(promoRateEl.value||"0")/100) : 0;

    if (1 - (commissionRate + (goEnabled?goRate:0) + (promoEnabled?promoRate:0)) <= 0){
      sellingPriceEl.textContent = "Tidak valid (total persentase biaya melebihi 100%)";
      detailsEl.innerHTML = ""; resultBox.classList.remove("hidden"); return;
    }

    const solved = solvePrice({modal,margin,packaging,discountPenjual,qty,commissionRate,goEnabled,goRate,promoEnabled,promoRate});
    if (!solved){ sellingPriceEl.textContent = "Tidak dapat menghitung (cek input)."; detailsEl.innerHTML=""; resultBox.classList.remove("hidden"); return; }

    const priceRounded = Math.ceil(solved.price);
    animateCount(sellingPriceEl, priceRounded); // count-up

    // Hitung nominal berbasis harga final
    const baseForPrograms = Math.max(priceRounded - discountPenjual, 0);
    const komisiDisp = Math.round(commissionRate * priceRounded);

    let promoFeeDisp=0, goFeeDisp=0, promoCapped=false, goCapped=false;
    if (promoEnabled){
      const raw = Math.round(promoRate * baseForPrograms);
      const cap = PROMO_CAP_PER_QTY * qty;
      promoFeeDisp = Math.min(raw, cap);
      promoCapped = raw >= cap;
    }
    if (goEnabled){
      const raw = Math.round(goRate * baseForPrograms);
      const cap = GO_CAP_PER_QTY * qty;
      goFeeDisp = Math.min(raw, cap);
      goCapped = raw >= cap;
    }

    const totalShopeeFees = komisiDisp + promoFeeDisp + goFeeDisp + ORDER_PROCESS_FEE;
    const internalCosts = (packaging||0);
    const totalAllFees = totalShopeeFees + internalCosts;
    const netReceive = priceRounded - totalAllFees;
    const targetNet = modal + (margin||0);
    const chips = [];
    if (discountPenjual){ chips.push(`<span class="badge-infochip">Basis XTRA: ${money(baseForPrograms)}</span>`); }
    if (promoEnabled){ chips.push(`<span class="badge-cap">Promo CAP 60k/qty</span>`); }
    if (goEnabled){ chips.push(`<span class="badge-cap">GO CAP 40k/qty</span>`); }
    const chipHTML = chips.length ? `<div class="mt-2 d-flex flex-wrap gap-2">${chips.join("")}</div>` : "";

    const gridHTML = `
      <div class="result-grid mt-2">
        <div class="result-card">
          <div class="card-head">
            <div class="card-title">Uang dari Pembeli</div>
            <div class="card-amount">${money(priceRounded)}</div>
          </div>
          <div class="fee-row"><span class="label">Harga Jual</span><span class="value"><b>${money(priceRounded)}</b></span></div>
        </div>
        <div class="result-card">
          <div class="card-head">
            <div class="card-title">Potongan oleh Shopee</div>
            <div class="card-amount">${money(totalShopeeFees)}</div>
          </div>
          <div class="fee-row"><span class="label">Komisi Kategori (${pct(commissionRate)}%)</span><span class="value">${money(komisiDisp)}</span></div>
          <div class="fee-row"><span class="label">Promo XTRA ${promoCapped?'<span class="badge-cap">CAP</span>':''} ${promoEnabled?`(${pct(promoRate)}%)`:''}</span><span class="value">${money(promoFeeDisp)}</span></div>
          <div class="fee-row"><span class="label">Gratis Ongkir XTRA ${goCapped?'<span class="badge-cap">CAP</span>':''} ${goEnabled?`(${pct(goRate)}%)`:''}</span><span class="value">${money(goFeeDisp)}</span></div>
          <div class="fee-row"><span class="label">Biaya Proses</span><span class="value">${money(ORDER_PROCESS_FEE)}</span></div>
          <div class="total-row"><span>Total potongan Shopee</span><span>${money(totalShopeeFees)}</span></div>
        </div>
      </div>
      <div class="result-card mt-2">
        <div class="card-head"><div class="card-title">Biaya di Pihak Kamu</div><div class="card-amount">${money(internalCosts)}</div></div>
        <div class="fee-row"><span class="label">Packaging/Kemasan</span><span class="value">${money(internalCosts)}</span></div>
        <div class="total-row"><span>Total biaya di pihak kamu</span><span>${money(internalCosts)}</span></div>
      </div>
    `;

    const bullet = [];
    bullet.push(`<li>Modal: <b>${money(modal)}</b></li>`);
    bullet.push(`<li>Margin: ${money(+margin||0)}</li>`);
    bullet.push(`<li>Biaya Proses: ${money(ORDER_PROCESS_FEE)}</li>`);
    if (internalCosts) bullet.push(`<li>Packaging/Kemasan: ${money(internalCosts)} <span class="text-muted">(biaya di pihak kamu)</span></li>`);
    bullet.push(`<li>Komisi Kategori: ${pct(commissionRate)}% → ${money(komisiDisp)}</li>`);
    if (promoEnabled) bullet.push(`<li>Promo XTRA: ${pct(promoRate)}% dari ${money(baseForPrograms)} → ${money(promoFeeDisp)} ${promoCapped?'<span class="badge-cap ms-1">CAP</span>':''}</li>`);
    if (goEnabled) bullet.push(`<li>Gratis Ongkir XTRA: ${pct(goRate)}% dari ${money(baseForPrograms)} → ${money(goFeeDisp)} ${goCapped?'<span class="badge-cap ms-1">CAP</span>':''}</li>`);
    if (discountPenjual) bullet.push(`<li>Diskon Penjual: ${money(discountPenjual)} <span class="text-muted">(menurunkan basis XTRA)</span></li>`);
    bullet.push(`<li>Kuantitas per produk: ${qty}</li>`);

    const recon = targetNet + totalAllFees;
    const reconLine = `<li><b>Rekonstruksi Harga:</b> (terima bersih + semua biaya) = ${money(recon)} ${recon===priceRounded?'✓':'→ berbeda dengan harga jual'}</li>`;

    const verifyClass = (netReceive===targetNet) ? "verify-ok" : "verify-warn";
    const verifyText = `
      <div class="${verifyClass} mt-2">
        Verifikasi Bersih: ${money(priceRounded)} − ${money(totalShopeeFees)} − ${money(internalCosts)}
        = <b>${money(netReceive)}</b> (target terima bersih ${money(targetNet)})
      </div>
    `;

    detailsEl.innerHTML = `
      <div class="result-kpi mb-2">
        <div><i class="bi bi-coin"></i></div>
        <div class="kpi-label">Harga Jual Disarankan</div>
        <div class="kpi-amount ms-auto">${money(priceRounded)}</div>
      </div>
      <ul class="mb-2">${bullet.join("")}${reconLine}</ul>
      ${chipHTML}
      ${gridHTML}
      ${verifyText}
      <div class="text-muted small mt-2">Catatan: Packaging/Kemasan adalah biaya kamu sendiri (bukan setor ke Shopee). Jika Promo/GO menembus plafon, biaya otomatis dibatasi oleh CAP.</div>
    `;

    resultBox.classList.remove("hidden");
    smoothScrollInto(resultBox);

    // Render donut chart
    renderChart({
      komisi: komisiDisp,
      promo: promoFeeDisp,
      go: goFeeDisp,
      proses: ORDER_PROCESS_FEE,
      kemasan: internalCosts,
      netReceive
    });

    // Copy summary
    copyBtn.onclick = () => {
      const txt = `Harga Jual: ${money(priceRounded)}
Modal: ${money(modal)}
Margin: ${money(margin||0)}
Biaya Proses: ${money(ORDER_PROCESS_FEE)}
Kemasan: ${money(internalCosts)}
Komisi: ${money(komisiDisp)}
Promo XTRA: ${money(promoFeeDisp)}
GO XTRA: ${money(goFeeDisp)}
Total potongan Shopee: ${money(komisiDisp + promoFeeDisp + goFeeDisp + ORDER_PROCESS_FEE)}
Terima bersih: ${money(netReceive)} (target ${money(targetNet)})`;
      navigator.clipboard.writeText(txt).then(()=>{
        const toast = new bootstrap.Toast(document.getElementById("copyToast"));
        toast.show();
      });
    };

    // Print/PDF
    printBtn.onclick = () => window.print();
  });
});
