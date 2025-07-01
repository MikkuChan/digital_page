import React from "react";
import logo from "../assets/logo.svg";

export default function Footer() {
  return (
    <footer className="bg-white py-7 shadow-inner border-t border-blue-50 z-20 relative mt-8">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 gap-2">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo fadzdigital" className="w-7 h-7 rounded" />
          <span className="font-bold text-lg text-gray-900">fadzdigital</span>
        </div>
        <span className="text-gray-500 text-sm">&copy; 2025 fadzdigital. All Rights Reserved.</span>
        <div className="flex gap-2">
          <a href="https://wa.me/6285727035336" target="_blank" className="inline-flex items-center px-3 py-1.5 bg-[#22C55E] text-white rounded-xl font-semibold text-sm hover:bg-[#16A34A] cta-anim">WhatsApp</a>
          <a href="https://t.me/fadzdigital" target="_blank" className="inline-flex items-center px-3 py-1.5 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-[#1D4ED8] cta-anim">Telegram</a>
          <a href="https://shopee.co.id/fadzdigital" target="_blank" className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#FF6600] to-[#FFD700] text-white rounded-xl font-semibold text-sm shadow">Shopee</a>
        </div>
      </div>
    </footer>
  );
}
