// js/tutorial.js

// Auto-open tutorial by hash, highlight TOC & step, scroll, dsb
document.addEventListener('DOMContentLoaded', function() {
  // 1. Accordion auto-open if hash present
  if(window.location.hash){
    let hash = window.location.hash.replace('#','');
    let el = document.getElementById(hash);
    if(el && el.classList.contains('accordion-collapse')){
      let btn = el.previousElementSibling.querySelector('.accordion-button');
      if(btn) setTimeout(()=>btn.click(),300);
      setTimeout(()=>el.scrollIntoView({behavior:'smooth'}), 600);
    }
  }

  // 2. TOC active sync
  function setTocActiveByHash(hash) {
    document.querySelectorAll('.btn-toc').forEach(b=>b.classList.remove('active'));
    let btn = document.querySelector('.btn-toc[href="#'+hash+'"]');
    if(btn) btn.classList.add('active');
  }
  // On click TOC
  document.querySelectorAll('.btn-toc').forEach(function(btn) {
    btn.addEventListener('click', function(e){
      let hash = btn.getAttribute('href').replace('#','');
      setTimeout(()=>setTocActiveByHash(hash), 100);
    });
  });
  // On accordion show, set TOC active & hash
  document.querySelectorAll('.accordion-collapse').forEach(acc => {
    acc.addEventListener('show.bs.collapse', function(e) {
      setTocActiveByHash(acc.id);
      history.replaceState(null,null,'#'+acc.id);
    });
    // Optional: hapus highlight step saat tutup accordion
    acc.addEventListener('hide.bs.collapse', function(e) {
      acc.querySelectorAll('.tutorial-step-card.active').forEach(c => c.classList.remove('active'));
    });
  });

  // 3. Step card highlight on hover/click + scroll on mobile
  document.querySelectorAll('.tutorial-step-card').forEach(function(card){
    card.addEventListener('mouseenter', function(){ card.classList.add('active'); });
    card.addEventListener('mouseleave', function(){ card.classList.remove('active'); });
    card.addEventListener('click', function(){
      document.querySelectorAll('.tutorial-step-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
      // Scroll step ke tengah di mobile
      if(window.innerWidth < 700) {
        setTimeout(()=>card.scrollIntoView({behavior:'smooth', block:'center'}), 60);
      }
    });
  });

  // 4. Optional: Highlight step via #step-N hash (ex: #step5)
  if(window.location.hash && window.location.hash.startsWith('#step')) {
    let stepEl = document.querySelector(window.location.hash);
    if(stepEl && stepEl.classList.contains('tutorial-step-card')) {
      stepEl.classList.add('active');
      setTimeout(()=>stepEl.scrollIntoView({behavior:'smooth', block:'center'}), 300);
    }
  }
});
