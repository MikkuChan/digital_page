// Loading overlay
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.getElementById('loadingOverlay').style.opacity = '0';
        setTimeout(function () {
          document.getElementById('loadingOverlay').style.display = 'none';
        }, 600);
      }, 400); // bisa diubah
    });

    // Scroll Progress Bar
    window.addEventListener('scroll', function() {
      const scrollProgress = document.getElementById('scrollProgress');
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const progress = Math.round((scrollTop / docHeight) * 100);
      scrollProgress.style.width = progress + '%';
    });

    // Stat Count Animation
    function animateStatCount() {
      document.querySelectorAll('.stat-number').forEach(function(el) {
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

    // Theme Switcher (Light/Dark)
    const themeToggle = document.getElementById('themeToggle');
    function setTheme(mode) {
      if(mode === 'dark'){
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('active');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.classList.remove('active');
      }
      localStorage.setItem('fadzdigital_theme', mode);
    }
    themeToggle.addEventListener('click', function() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });
    // Restore Theme
    document.addEventListener('DOMContentLoaded', function() {
      const saved = localStorage.getItem('fadzdigital_theme');
      if (saved === 'dark') setTheme('dark');
      else setTheme('light');
    });

    // AOS init
    AOS.init({ once: true, duration: 900, offset: 80 });