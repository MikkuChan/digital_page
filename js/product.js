// TAB PRODUK
document.querySelectorAll('.produk-tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.produk-tab').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.produk-panel').forEach(function(p){ p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    window.scrollTo({ top: document.getElementById('produkTabsSticky').offsetTop-20, behavior: 'smooth' });
    if(window.AOS) setTimeout(()=>AOS.refresh(), 400);
  });
});
// PRODUK SEARCHBAR
const searchInput = document.getElementById('produkSearch');
if(searchInput){
  searchInput.addEventListener('input', function(){
    const val = this.value.toLowerCase();
    document.querySelectorAll('.produk-panel.active .produk-item').forEach(function(card){
      const text = (card.dataset.title+" "+card.dataset.feature+" "+card.innerText).toLowerCase();
      card.style.display = text.includes(val) ? '' : 'none';
    });
  });
}
