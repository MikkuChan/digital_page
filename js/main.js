// =====================
// main.js - Fadzdigital
// =====================

// Overlay loading saat halaman dibuka
window.addEventListener('load', function () {
  setTimeout(function () {
    document.getElementById('loadingOverlay').style.opacity = '0';
    setTimeout(function () {
      document.getElementById('loadingOverlay').style.display = 'none';
    }, 600); // Waktu transisi hilang overlay
  }, 400); // Lama tampil overlay loading
});

// Fungsi untuk progress scroll bar dan parallax, dipanggil dengan requestAnimationFrame
let ticking = false;
function handleScroll() {
  // Progress bar scroll
  const scrollProgress = document.getElementById('scrollProgress');
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = Math.round((scrollTop / docHeight) * 100);
  if (scrollProgress) {
    scrollProgress.style.width = progress + '%';
  }

  // Parallax pada elemen .floating
  const parallax = document.querySelector('.floating');
  if (parallax) {
    const speed = scrollTop * 0.5;
    parallax.style.transform = `translateY(${speed}px)`;
  }

  ticking = false;
}

// Event scroll responsive, tidak memanggil handleScroll terlalu sering
window.addEventListener('scroll', function () {
  if (!ticking) {
    window.requestAnimationFrame(handleScroll);
    ticking = true;
  }
});

// Animasi angka berjalan pada statistik
function animateStatCount() {
  document.querySelectorAll('.stat-number').forEach(function (el) {
    const target = parseInt(el.getAttribute('data-count'));
    let current = 0;
    const increment = Math.ceil(target / 60);
    function update() {
      current += increment;
      if (current > target) current = target;
      el.innerText = current.toLocaleString('id-ID');
      if (current < target) requestAnimationFrame(update);
    }
    update();
  });
}
document.addEventListener('DOMContentLoaded', animateStatCount);

// Inisialisasi animasi saat elemen muncul di layar (AOS)
AOS.init({
  once: true,
  duration: 900,
  offset: 80
});

// Efek scroll halus saat klik menu anchor/link dalam halaman
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});

// Observer untuk mengatur animasi berjalan/berhenti saat elemen masuk/keluar layar
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
    } else {
      entry.target.style.animationPlayState = 'paused';
    }
  });
}, observerOptions);

// Observasi elemen yang punya animasi
document.querySelectorAll('.floating, .badge-premium').forEach(el => {
  observer.observe(el);
});

// Memberikan delay dan durasi acak pada animasi partikel SVG
function createFloatingParticles() {
  const particles = document.querySelectorAll('circle[fill*="particle"]');
  particles.forEach((particle, index) => {
    const randomDelay = Math.random() * 2;
    const randomDuration = 3 + Math.random() * 2;
    particle.style.animationDelay = `${randomDelay}s`;
    particle.style.animationDuration = `${randomDuration}s`;
  });
}
createFloatingParticles();

// Efek partikel SVG bergerak mengikuti gerakan mouse
document.addEventListener('mousemove', (e) => {
  const mouseX = e.clientX / window.innerWidth;
  const mouseY = e.clientY / window.innerHeight;
  const particles = document.querySelectorAll('circle[fill*="particle"]');
  particles.forEach((particle, index) => {
    const speed = (index + 1) * 0.1;
    const x = mouseX * speed * 10;
    const y = mouseY * speed * 10;
    particle.style.transform = `translate(${x}px, ${y}px)`;
  });
});
