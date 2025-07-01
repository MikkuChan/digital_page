import React from "react";

export default function FloatingIcon() {
  return (
    <>
      <svg className="floating-icon" width="90" height="90" style={{top:16, left:'8vw', position:'absolute'}} viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="45" r="37" fill="#14B8A6"/>
      </svg>
      <svg className="floating-icon" width="50" height="50" style={{top:80, right:'10vw', position:'absolute', animationDelay:"2.4s"}} viewBox="0 0 50 50" fill="none">
        <rect x="6" y="6" width="38" height="38" rx="13" fill="#2563EB"/>
      </svg>
    </>
  )
}
