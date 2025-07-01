import React from "react";

export default function CardFeature({ icon, title, desc, color, badge }) {
  return (
    <div className={`bg-white rounded-2xl card-feature p-7 flex flex-col items-center hover:border-[${color}] border transition relative`}>
      {badge &&
        <span className="badge-premium">{badge}</span>
      }
      <div className="mb-2">{icon}</div>
      <span className={`font-bold text-lg mb-1 text-[${color}]`}>{title}</span>
      <span className="text-sm text-gray-600 text-center">{desc}</span>
    </div>
  );
}
