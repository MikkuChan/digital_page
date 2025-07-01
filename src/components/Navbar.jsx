import React, { useState } from "react";
import logo from "../assets/logo.svg";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-6 max-w-screen-xl mx-auto relative z-30">
      <div className="flex items-center gap-3">
        <img src={logo} alt="fadzdigital logo" className="w-9 h-9 rounded-xl shadow" />
        <span className="text-2xl font-extrabold logo-gradient">fadzdigital</span>
      </div>

      {/* Desktop Menu */}
      <nav className="hidden lg:flex space-x-8 text-gray-800 font-semibold text-lg">
        <a href="#" className="hover:text-[#2563EB] transition-colors duration-300">Beranda</a>
        <a href="#" className="hover:text-[#2563EB] transition-colors duration-300">Produk</a>
        <a href="#" className="hover:text-[#2563EB] transition-colors duration-300">Tutorial</a>
        <a href="#" className="hover:text-[#2563EB] transition-colors duration-300">Tools</a>
        <a href="#" className="hover:text-[#2563EB] transition-colors duration-300">Kontak</a>
      </nav>

      {/* CTA Desktop */}
      <div className="hidden lg:flex gap-2">
        <a href="https://wa.me/6285727035336" target="_blank" className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2 rounded-xl font-semibold cta-anim transition">WhatsApp</a>
        <a href="https://t.me/fadzdigital" target="_blank" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl font-semibold cta-anim transition">Telegram</a>
        <a href="https://shopee.co.id/fadzdigital" target="_blank" className="bg-gradient-to-r from-[#FF6600] to-[#FFD700] text-white px-4 py-2 rounded-xl font-semibold shadow transition">Shopee</a>
      </div>

      {/* Hamburger Icon */}
      <button onClick={() => setOpen(!open)} className="lg:hidden text-gray-700 focus:outline-none">
        <div className="w-8 h-8 relative">
          <span className={`hamburger-top absolute top-1 left-0 w-8 h-0.5 bg-gray-700 rounded transition-all ${open ? "transform translate-y-2 rotate-45" : ""}`}></span>
          <span className={`hamburger-middle absolute top-3 left-0 w-8 h-0.5 bg-gray-700 rounded transition-all ${open ? "opacity-0" : ""}`}></span>
          <span className={`hamburger-bottom absolute top-5 left-0 w-8 h-0.5 bg-gray-700 rounded transition-all ${open ? "transform -translate-y-2 -rotate-45" : ""}`}></span>
        </div>
      </button>

      {/* Mobile Menu */}
      <div className={`lg:hidden fixed left-0 right-0 top-0 bg-white z-20 px-6 py-8 shadow-md transition-all duration-400 ${open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <nav className="space-y-4 pb-6 text-gray-800 font-medium text-lg">
          <a href="#" className="block hover:text-[#2563EB] transition-colors duration-300">Beranda</a>
          <a href="#" className="block hover:text-[#2563EB] transition-colors duration-300">Produk</a>
          <a href="#" className="block hover:text-[#2563EB] transition-colors duration-300">Tutorial</a>
          <a href="#" className="block hover:text-[#2563EB] transition-colors duration-300">Tools</a>
          <a href="#" className="block hover:text-[#2563EB] transition-colors duration-300">Kontak</a>
          <a href="https://wa.me/6285727035336" target="_blank" className="block bg-[#22C55E] hover:bg-[#16A34A] text-white px-4 py-2 rounded-xl font-semibold cta-anim">WhatsApp</a>
          <a href="https://t.me/fadzdigital" target="_blank" className="block bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl font-semibold cta-anim">Telegram</a>
          <a href="https://shopee.co.id/fadzdigital" target="_blank" className="block bg-gradient-to-r from-[#FF6600] to-[#FFD700] text-white px-4 py-2 rounded-xl font-semibold shadow">Shopee</a>
        </nav>
      </div>
    </header>
  );
}
