document.getElementById('cekTagihanForm').addEventListener('submit', function(event) {
  event.preventDefault(); // Mencegah pengiriman form

  const idPelanggan = document.getElementById('idPelanggan').value;
  const resultDiv = document.getElementById('result');

  // Tampilkan loading spinner
  resultDiv.innerHTML = '<div class="loading-spinner"></div>';

  // Simulasi pengambilan data tagihan
  setTimeout(() => {
    // Ganti dengan logika pengambilan data yang sebenarnya
    const dummyData = {
      id: idPelanggan,
      tagihan: 'Rp 150.000',
      status: 'Belum Dibayar'
    };

    // Tampilkan hasil
    resultDiv.innerHTML = `
      <div class="alert alert-info">
        <h5>Tagihan untuk ID Pelanggan: ${dummyData.id}</h5>
        <p>Jumlah Tagihan: <strong>${dummyData.tagihan}</strong></p>
        <p>Status: <strong>${dummyData.status}</strong></p>
      </div>
    `;
  }, 2000); // Simulasi waktu loading 2 detik
});
