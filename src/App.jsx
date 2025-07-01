import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FloatingIcon from "./components/FloatingIcon";
import CardFeature from "./components/CardFeature";
import hero from "./assets/hero-vpn.svg";

export default function App() {
  const [loading, setLoading] = useState(true);

  // Simulasi shimmer loading grid
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7fbff]">
      <Navbar />

      <div className="main-content flex-1 relative pt-16">
        <section className="relative max-w-6xl mx-auto px-4 pt-8 pb-10 flex flex-col items-center text-center">
          <FloatingIcon />

          <h1 className="hero-title text-4xl md:text-5xl font-extrabold mb-5 leading-tight text-gray-900 drop-shadow-[0_2px_8px_#2563EB13] relative z-10">
            <span className="bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E] bg-clip-text text-transparent">VPN Premium</span>,
            <span className="text-[#14B8A6]"> Autoscript</span> & <span className="text-[#2563EB]">Bot Telegram</span>
          </h1>
          <p className="text-gray-700 text-lg md:text-2xl mb-8 max-w-2xl mx-auto font-medium relative z-10">
            Solusi VPN Premium, Autoscript, Sewa Bot Telegram jualan VPN, Kuota Xcvip Double YT.<br />
            Masa aktif <span className="text-[#22C55E] font-bold">30 hari</span>, garansi, support, tutorial lengkap!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-7 relative z-10">
            <a href="https://wa.me/6285727035336" target="_blank" className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold px-7 py-3 rounded-xl shadow-md cta-anim transition">Order WhatsApp</a>
            <a href="https://t.me/fadzdigital" target="_blank" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-7 py-3 rounded-xl shadow-md cta-anim transition">Chat Telegram</a>
            <a href="https://shopee.co.id/fadzdigital" target="_blank" className="bg-gradient-to-r from-[#FF6600] to-[#FFD700] text-white font-semibold px-7 py-3 rounded-xl shadow-md transition">Shopee</a>
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-6 relative z-10">
            <div className="bg-white rounded-2xl card-feature px-8 py-5 flex flex-col items-center hover:border-[#2563EB] border transition">
              <span className="font-bold text-lg text-gray-700 mb-1">Masa Aktif</span>
              <span className="text-[#2563EB] font-bold text-2xl">30 Hari</span>
            </div>
            <div className="bg-white rounded-2xl card-feature px-8 py-5 flex flex-col items-center hover:border-[#22C55E] border transition">
              <span className="font-bold text-lg text-gray-700 mb-1">Gratis Tutorial</span>
              <span className="text-[#22C55E] font-bold text-2xl">Lengkap</span>
            </div>
            <div className="bg-white rounded-2xl card-feature px-8 py-5 flex flex-col items-center hover:border-[#FBBF24] border transition">
              <span className="font-bold text-lg text-gray-700 mb-1">Garansi Akun</span>
              <span className="text-[#FBBF24] font-bold text-2xl">Aktif</span>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-12 mb-8">
            <img src={hero} alt="fadzdigital hero" className="w-full max-w-md mx-auto rounded-xl shadow-lg" />
          </div>
        </section>

        {/* Fitur utama */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10">
            Kenapa Pilih <span className="bg-gradient-to-r from-[#2563EB] to-[#14B8A6] bg-clip-text text-transparent">fadzdigital?</span>
          </h2>
          {/* shimmer loading */}
          {loading ? (
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl card-feature card-shimmer p-7"></div>
              <div className="bg-white rounded-2xl card-feature card-shimmer p-7"></div>
              <div className="bg-white rounded-2xl card-feature card-shimmer p-7"></div>
              <div className="bg-white rounded-2xl card-feature card-shimmer p-7"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-6">
              <CardFeature
                icon={
                  <svg width="38" height="38" fill="none">
                    <circle cx="19" cy="19" r="17" fill="#2563EB12" stroke="#2563EB" strokeWidth="2"/>
                    <path d="M13 26h12v-2a4 4 0 1 0-12 0v2Z" fill="#2563EB"/>
                    <circle cx="19" cy="15" r="3.5" fill="#fff" stroke="#2563EB" strokeWidth="2"/>
                  </svg>
                }
                title="VPN Premium"
                desc="Server stabil, cocok gaming & streaming. Aman privasi."
                color="#2563EB"
                badge="Best Seller"
              />
              <CardFeature
                icon={
                  <svg width="38" height="38" fill="none">
                    <rect x="8" y="16" width="22" height="10" rx="4" fill="#22C55E20" stroke="#22C55E" strokeWidth="2"/>
                    <rect x="13" y="11" width="12" height="7" rx="2" fill="#22C55E" />
                  </svg>
                }
                title="Autoscript & Bot"
                desc="Jualan VPN makin mudah dengan script & Bot Telegram."
                color="#22C55E"
              />
              <CardFeature
                icon={
                  <svg width="38" height="38" fill="none">
                    <rect x="10" y="13" width="18" height="12" rx="3" fill="#0EA5E922" stroke="#0EA5E9" strokeWidth="2"/>
                    <path d="M15 22h10" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }
                title="Tutorial & Tools"
                desc="Panduan lengkap & tools converter siap pakai gratis."
                color="#0EA5E9"
              />
              <CardFeature
                icon={
                  <svg width="38" height="38" fill="none">
                    <circle cx="19" cy="19" r="17" fill="#FBBF2412" stroke="#FBBF24" strokeWidth="2"/>
                    <path d="M15 24l4 4 4-4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 12v12" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }
                title="Garansi & Support"
                desc="Akun aktif 30 hari, garansi & support CS fast respon."
                color="#FBBF24"
              />
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
