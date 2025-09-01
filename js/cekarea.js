document.addEventListener('DOMContentLoaded', function () {
  const areaData = [
    { provinsi: "Banten", kota: "Kota Tangerang Selatan, Kota Tangerang, Kab. Tangerang, Kab. Pandeglang, Kab. Lebak, Kab. Serang, Kota Serang, Kota Cilegon", area: "Area 2" },
    { provinsi: "DI Yogyakarta", kota: "Kab. Kulon Progo, Kota Yogyakarta, Kab. Sleman, Kab. Bantul, Kab. Gunungkidul", area: "Area 1" },
    { provinsi: "DKI Jakarta", kota: "Kota Jakarta Pusat, Kota Jakarta Selatan, Kota Jakarta Barat, Kota Jakarta Timur, Kota Jakarta Utara", area: "Area 2" },
    { provinsi: "DKI Jakarta", kota: "Kab. Kepulauan Seribu", area: "Area 3" },
    { provinsi: "Jawa Barat", kota: "Kab. Bandung, Kab. Kuningan, Kab. Purwakarta, Kota Bandung", area: "Area 1" },
    { provinsi: "Jawa Barat", kota: "Kab. Bandung Barat, Kota Cimahi, Kab. Cirebon, Kota Cirebon, Kab. Indramayu, Kab. Subang", area: "Area 2" },
    { provinsi: "Jawa Barat", kota: "Kab. Bogor, Kota Bogor, Kota Depok, Kota Bekasi, Kota Banjar, Kab. Ciamis, Kota Tasikmalaya, Kab. Majalengka, Kab. Sumedang, Kab. Bekasi, Kab. Tasikmalaya, Kab. Garut", area: "Area 3" },
    { provinsi: "Jawa Barat", kota: "Kab. Cianjur, Kab. Pangandaran, Kab. Karawang, Kota Sukabumi, Kab. Sukabumi", area: "Area 4" },
    { provinsi: "Jawa Tengah", kota: "Kab. Tegal, Kota Surakarta, Kota Tegal, Kab. Brebes, Kab. Kebumen, Kab. Pemalang, Kota Semarang", area: "Area 2" },
    { provinsi: "Jawa Tengah", kota: "Kab. Boyolali, Kota Salatiga, Kab. Semarang, Kab. Cilacap, Kab. Grobogan, Kab. Kendal, Kab. Rembang", area: "Area 3" },
    { provinsi: "Jawa Tengah", kota: "Kota Pekalongan, Kab. Pekalongan, Kab. Batang, Kab. Purbalingga, Kab. Kudus, Kab. Sukoharjo, Kab. Klaten, Kota Magelang, Kab. Banyumas, Kab. Banyumas, Kab. Magelang, Kab. Temanggung, Kab. Sragen, Kab. Banjarnegara, Kab. Karanganyar, Kab. Wonosobo, Kab. Jepara, Kab. Demak, Kab. Purworejo, Kab. Blora, Kab. Wonogiri, Kab. Pati", area: "Area 4" },
    { provinsi: "Jawa Timur", kota: "Kota Probolinggo, Kab. Bangkalan, Kab. Sidoarjo, Kab. Banyuwangi, Kota Surabaya, Kab. Sampang, Kab. Pamekasan, Kab. Sumenep, Kab. Pacitan", area: "Area 2" },
    { provinsi: "Jawa Timur", kota: "Kab. Lumajang, Kab. Probolinggo", area: "Area 3" },
    { provinsi: "Jawa Timur", kota: "Kab. Jombang, Kota Blitar, Kab. Blitar, Kota Kediri, Kab. Lamongan, Kab. Kediri, Kab. Ngawi, Kab. Mojokerto, Kota Mojokerto, Kab. Magetan, Kab. Gresik, Kab. Tulungagung, Kab. Nganjuk, Kab. Pasuruan, Kota Pasuruan, Kab. Bojonegoro, Kab. Madiun, Kab. Bondowoso, Kab. Tuban, Kota Madiun, Kab. Situbondo, Kab. Jember, Kota Malang, Kab. Malang, Kab. Ponorogo, Kota Batu, Kab. Trenggalek", area: "Area 4" },
    { provinsi: "Bengkulu", kota: "Kab. Seluma", area: "Area 3" },
    { provinsi: "Bengkulu", kota: "Kab. Bengkulu Selatan, Kab. Kaur, Kab. Lebong, Kab. Rejang Lebong, Kab. Bengkulu Tengah, Kota Bengkulu, Kab. Bengkulu Utara, Kab. Kepahiang, Kab. Muko Muko", area: "Area 4" },
    { provinsi: "Jambi", kota: "Kab. Batanghari, Kota Jambi, Kab. Tanjung Jabung Barat, Kab. Muaro Jambi, Kab. Sarolangun", area: "Area 3" },
    { provinsi: "Jambi", kota: "Kab. Tanjung Jabung Timur, Kab. Kerinci, Kab. Bungo, Kab. Tebo, Kab. Merangin, Kota Sungai Penuh", area: "Area 4" },
    { provinsi: "Kepulauan Bangka Belitung", kota: "Kab. Bangka Selatan, Kota Pangkal Pinang, Kab. Belitung, Kab. Belitung Timur", area: "Area 2" },
    { provinsi: "Kepulauan Bangka Belitung", kota: "Kab. Bangka, Kab. Bangka Tengah, Kab. Bangka Barat", area: "Area 3" },
    { provinsi: "Kepulauan Riau", kota: "Kota Batam", area: "Area 2" },
    { provinsi: "Kepulauan Riau", kota: "Kab. Karimun, Kab. Bintan, Kota Tanjung Pinang", area: "Area 3" },
    { provinsi: "Kepulauan Riau", kota: "Kab. Lingga, Kab. Kepulauan Anambas, Kab. Natuna", area: "Area 4" },
    { provinsi: "Lampung", kota: "Kab. Lampung Tengah, Kab. Pringsewu, Kota Metro, Kab. Pesawaran, Kab. Lampung Selatan, Kota Bandar Lampung", area: "Area 3" },
    { provinsi: "Lampung", kota: "Kab. Lampung Barat, Kab. Lampung Timur, Kab. Tulang Bawang Barat, Kab. Way Kanan, Kab. Tulang Bawang, Kab. Tanggamus, Kab. Pesisir Barat, Kab. Lampung Utara, Kab. Mesuji", area: "Area 4" },
    { provinsi: "Nanggroe Aceh Darussalam", kota: "Kab. Aceh Barat Daya, Kab. Aceh Besar, Kota Sabang, Kab. Gayo Lues", area: "Area 2" },
    { provinsi: "Nanggroe Aceh Darussalam", kota: "Kab. Aceh Jaya, Kab. Aceh Selatan, Kab. Aceh Tenggara, Kab. Nagan Raya, Kota Banda Aceh", area: "Area 3" },
    { provinsi: "Nanggroe Aceh Darussalam", kota: "Kab. Aceh Barat, Kab. Aceh Singkil, Kab. Aceh Tamiang, Kab. Aceh Tengah, Kota Subulussalam, Kab. Bener Meriah, Kab. Aceh Utara, Kota Lhokseumawe, Kab. Pidie, Kab. Aceh Timur, Kab. Simeulue, Kota Langsa, Kab. Bireuen, Kab. Pidie Jaya", area: "Area 4" },
    { provinsi: "Riau", kota: "Kota Pekanbaru", area: "Area 2" },
    { provinsi: "Riau", kota: "Kab. Kuantan Singingi, Kab. Pelalawan, Kab. Kampar, Kab. Siak, Kota Dumai, Kab. Rokan Hilir, Kab. Indragiri Hulu, Kab. Kepulauan Meranti, Kab. Bengkalis", area: "Area 3" },
    { provinsi: "Riau", kota: "Kab. Rokan Hulu, Kab. Indragiri Hilir", area: "Area 4" },
    { provinsi: "Sumatera Barat", kota: "Kab. Kepulauan Mentawai", area: "Area 2" },
    { provinsi: "Sumatera Barat", kota: "Kota Payakumbuh, Kota Padang Panjang, Kab. Sijunjung, Kab. Padang Pariaman, Kota Padang, Kab. Solok Selatan", area: "Area 3" },
    { provinsi: "Sumatera Barat", kota: "Kab. Pasaman Barat, Kab. Pasaman, Kab. Lima Puluh Kota, Kab. Tanah Datar, Kab. Dharmasraya, Kota Solok, Kab. Agam, Kab. Solok, Kota Bukittinggi, Kota Pariaman, Kota Sawahlunto, Kab. Pesisir Selatan", area: "Area 4" },
    { provinsi: "Sumatera Selatan", kota: "Kab. Ogan Komering Ilir, Kab. Penukal Abab Lematang Ilir, Kab. Banyuasin, Kota Palembang, Kab. Ogan Ilir", area: "Area 3" },
    { provinsi: "Sumatera Selatan", kota: "Kab. Ogan Komering Ulu Timur, Kab. Ogan Komering Ulu Selatan, Kab. Ogan Komering Ulu, Kab. Musi Rawas, Kab. Musi Rawas Utara, Kab. Empat Lawang, Kota Pagar Alam, Kota Lubuk Linggau, Kab. Musi Banyuasin, Kab. Muara Enim, Kab. Lahat, Kota Prabumulih", area: "Area 4" },
    { provinsi: "Sumatera Utara", kota: "Kab. Karo, Kota Medan, Kab. Dairi", area: "Area 2" },
    { provinsi: "Sumatera Utara", kota: "Kota Binjai, Kota Tebing Tinggi, Kab. Serdang Bedagai, Kab. Langkat, Kab. Deli Serdang, Kab. Batu Bara, Kota Tanjung Balai, Kab. Asahan, Kota Gunungsitoli, Kab. Nias Barat, Kab. Nias Selatan, Kab. Nias Utara", area: "Area 3" },
    { provinsi: "Sumatera Utara", kota: "Kab. Pakpak Bharat, Kab. Mandailing Natal, Kab. Padang Lawas, Kab. Labuhanbatu Utara, Kota Padangsidimpuan, Kab. Tapanuli Selatan, Kab. Labuhanbatu Selatan, Kab. Labuhanbatu, Kab. Tapanuli Utara, Kab. Padang Lawas Utara, Kab. Humbang Hasundutan, Kab. Simalungun, Kab. Toba Samosir, Kota Pematangsiantar, Kab. Tapanuli Tengah, Kab. Samosir, Kota Sibolga, Kab. Nias", area: "Area 4" },
    { provinsi: "Kalimantan Barat", kota: "Kab. Sekadau, Kab. Kapuas Hulu, Kab. Sintang, Kab. Bengkayang, Kab. Melawi, Kab. Sambas, Kab. Sanggau, Kab. Kubu Raya, Kota Pontianak, Kab. Kayong Utara, Kab. Landak, Kab. Mempawah, Kota Singkawang, Kab. Ketapang", area: "Area 4" },
    { provinsi: "Kalimantan Selatan", kota: "Kab. Hulu Sungai Tengah, Kab. Tapin, Kab. Hulu Sungai Utara, Kab. Tabalong, Kota Banjarmasin, Kab. Banjar, Kab. Tanah Bumbu, Kota Banjarbaru, Kab. Hulu Sungai Selatan", area: "Area 2" },
    { provinsi: "Kalimantan Selatan", kota: "Kab. Balangan, Kab. Barito Kuala, Kab. Tanah Laut, Kab. Kotabaru", area: "Area 3" },
    { provinsi: "Kalimantan Tengah", kota: "Kab. Kapuas, Kab. Pulang Pisau, Kota Palangkaraya", area: "Area 3" },
    { provinsi: "Kalimantan Tengah", kota: "Kab. Seruyan, Kab. Kotawaringin Barat, Kab. Katingan, Kab. Kotawaringin Timur, Kab. Sukamara, Kab. Lamandau, Kab. Murung Raya, Kab. Barito Timur, Kab. Barito Utara, Kab. Barito Selatan, Kab. Gunung Mas", area: "Area 4" },
    { provinsi: "Kalimantan Timur", kota: "Kab. Penajam Paser Utara, Kota Balikpapan, Kab. Paser, Kab. Kutai Kartanegara, Kota Samarinda, Kota Bontang, Kab. Berau, Kab. Kutai Timur, Kab. Kutai Barat, Kab. Mahakam Ulu", area: "Area 4" },
    { provinsi: "Kalimantan Utara", kota: "Kab. Tana Tidung, Kab. Malinau, Kab. Bulungan, Kota Tarakan, Kab. Nunukan", area: "Area 4" },
    { provinsi: "Gorontalo", kota: "Kab. Pahuwato, Kab. Boalemo, Kab. Gorontalo, Kota Gorontalo, Kab. Gorontalo Utara, Kab. Bone Bolango", area: "Area 4" },
    { provinsi: "Sulawesi Barat", kota: "Kab. Mamuju Tengah", area: "Area 2" },
    { provinsi: "Sulawesi Barat", kota: "Kab. Majene, Kab. Polewali Mandar, Kab. Mamuju Utara", area: "Area 3" },
    { provinsi: "Sulawesi Barat", kota: "Kab. Mamuju, Kab. Mamasa", area: "Area 4" },
    { provinsi: "Sulawesi Selatan", kota: "Kab. Barru, Kota Pare Pare, Kab. Pinrang", area: "Area 2" },
    { provinsi: "Sulawesi Selatan", kota: "Kab. Sinjai, Kab. Enrekang, Kab. Sidenreng Rappang, Kab. Luwu Timur, Kab. Soppeng, Kab. Tana Toraja", area: "Area 3" },
    { provinsi: "Sulawesi Selatan", kota: "Kab. Kepulauan Selayar, Kab. Takalar, Kab. Jeneponto, Kab. Bulukumba, Kab. Pangkajene Kepulauan, Kota Makassar, Kab. Gowa, Kab. Maros, Kab. Bone, Kab. Wajo, Kab. Luwu, Kab. Luwu Utara, Kota Palopo, Kab. Toraja Utara", area: "Area 4" },
    { provinsi: "Sulawesi Tengah", kota: "Kab. Banggai Kepulauan, Kab. Banggai Laut, Kota Palu, Kab. Toli Toli, Kab. Tojo Una Una, Kab. Morowali, Kab. Morowali Utara", area: "Area 3" },
    { provinsi: "Sulawesi Tengah", kota: "Kab. Banggai, Kab. Parigi Moutong, Kab. Donggala, Kab. Sigi, Kab. Poso, Kab. Buol", area: "Area 4" },
    { provinsi: "Sulawesi Tenggara", kota: "Kab. Konawe Kepulauan, Kab. Konawe Utara, Kab. Buton Utara, Kab. Wakatobi", area: "Area 2" },
    { provinsi: "Sulawesi Tenggara", kota: "Kota Bau Bau, Kab. Muna, Kab. Buton Selatan, Kab. Buton Tengah, Kab. Muna Barat", area: "Area 3" },
    { provinsi: "Sulawesi Tenggara", kota: "Kab. Kolaka, Kab. Kolaka Utara, Kab. Konawe, Kab. Konawe Selatan, Kota Kendari, Kab. Kolaka Timur, Kab. Buton, Kab. Bombana", area: "Area 4" },
    { provinsi: "Sulawesi Utara", kota: "Kab. Bolaang Mongondow, Kab. Bolaang Mongondow Selatan, Kota Kotamobagu, Kab. Minahasa Selatan, Kab. Bolaang Mongondow Timur, Kab. Minahasa Tenggara, Kab. Bolaang Mongondow Utara, Kota Tomohon, Kab. Minahasa, Kota Manado, Kab. Minahasa Utara, Kota Bitung, Kab. Kepulauan Sangihe, Kab. Kepulauan Talaud, Kab. Siau Tagulandang Biaro", area: "Area 4" },
    { provinsi: "Bali", kota: "Kab. Jembrana, Kab. Buleleng", area: "Area 1" },
    { provinsi: "Bali", kota: "Kab. Badung, Kab. Karangasem, Kab. Tabanan, Kab. Bangli, Kab. Gianyar, Kab. Klungkung, Kota Denpasar", area: "Area 2" },
    { provinsi: "Nusa Tenggara Barat", kota: "Kab. Lombok Barat, Kab. Lombok Timur, Kota Mataram, Kab. Lombok Tengah, Kab. Lombok Utara, Kab. Sumbawa Barat, Kab. Sumbawa, Kota Bima, Kab. Dompu", area: "Area 2" },
    { provinsi: "Nusa Tenggara Barat", kota: "Kab. Bima", area: "Area 4" },
    { provinsi: "Nusa Tenggara Timur", kota: "Kab. Alor, Kota Kupang, Kab. Kupang, Kab. Malaka, Kab. Manggarai Barat, Kab. Timor Tengah Selatan, Kab. Belu, Kab. Sikka, Kab. Timor Tengah Utara, Kab. Lembata, Kab. Manggarai Timur, Kab. Ende, Kab. Sumba Barat Daya, Kab. Rote Ndao, Kab. Nagekeo, Kab. Flores Timur, Kab. Ngada, Kab. Sumba Tengah, Kab. Manggarai, Kab. Sumba Barat, Kab. Sumba Timur, Kab. Sabu Raijua", area: "Area 4" },
    { provinsi: "Maluku", kota: "Kab. Maluku Tenggara Barat, Kab. Kepulauan Aru, Kota Tual, Kab. Seram Bagian Barat, Kab. Maluku Tengah, Kab. Seram Bagian Timur, Kota Ambon, Kab. Maluku Tenggara, Kab. Maluku Barat Daya, Kab. Buru Selatan, Kab. Buru", area: "Area 1" },
    { provinsi: "Maluku Utara", kota: "Kab. Halmahera Barat, Kab. Halmahera Utara, Kab. Kepulauan Sula, Kab. Halmahera Timur, Kab. Pulau Taliabu, Kab. Halmahera Selatan, Kota Tidore Kepulauan, Kota Ternate, Kab. Halmahera Tengah, Kab. Pulau Morotai", area: "Area 1" },
    { provinsi: "Papua", kota: "Kab. Asmat, Kab. Jayapura, Kab. Mimika, Kab. Keerom, Kab. Biak Numfor, Kota Jayapura, Kab. Kepulauan Yapen, Kab. Boven Digoel, Kab. Merauke, Kab. Deiyai, Kab. Dogiyai, Kab. Intan Jaya, Kab. Jayawijaya, Kab. Lanny Jaya, Kab. Mamberamo Raya, Kab. Mamberamo Tengah, Kab. Mappi, Kab. Nabire, Kab. Nduga, Kab. Paniai, Kab. Pegunungan Bintang, Kab. Puncak, Kab. Puncak Jaya, Kab. Sarmi, Kab. Supiori, Kab. Tolikara, Kab. Waropen, Kab. Yahukimo, Kab. Yalimo", area: "Area 1" },
    { provinsi: "Papua Barat", kota: "Kab. Teluk Bintuni, Kab. Sorong Selatan, Kab. Sorong, Kab. Teluk Wondama, Kota Sorong, Kab. Manokwari, Kab. Fak Fak, Kab. Kaimana, Kab. Manokwari Selatan, Kab. Maybrat, Kab. Pegunungan Arfak, Kab. Raja Ampat, Kab. Tambrauw", area: "Area 1" }
  ];

  const searchInput = document.getElementById('searchInput');
  const cekareaList = document.getElementById('cekareaList');
  const cekareaEmptyResult = document.getElementById('cekareaEmptyResult');

  function renderArea(filter = '') {
    let found = false;
    cekareaList.innerHTML = '';
    areaData.forEach(item => {
      if (
        item.provinsi.toLowerCase().includes(filter.toLowerCase()) ||
        item.kota.toLowerCase().includes(filter.toLowerCase()) ||
        item.area.toLowerCase().includes(filter.toLowerCase())
      ) {
        found = true;
        let iconHtml = '<span style="font-size:2rem;">🌏</span>';
        cekareaList.innerHTML += `
          <div class="col-12 col-sm-6 col-lg-4">
            <div class="cekarea-card" tabindex="0">
              <div class="area-icon mb-2">
                ${iconHtml}
              </div>
              <div class="area-provinsi">${item.provinsi}</div>
              <div class="area-kota">${item.kota}</div>
              <div class="area-label">${item.area}</div>
            </div>
          </div>
        `;
      }
    });
    cekareaEmptyResult.classList.toggle('d-none', found || filter === '');
    cekareaList.classList.toggle('d-none', !found && filter !== '');
  }

  // Initial render
  renderArea();

  // Live search
  searchInput.addEventListener('input', function () {
    renderArea(this.value.trim());
  });
});