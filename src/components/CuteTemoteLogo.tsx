import React from "react";

interface CuteTemoteLogoProps {
  size?: number;
  className?: string;
}

export const CuteTemoteLogo: React.FC<CuteTemoteLogoProps> = ({ size = 28, className = "" }) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none filter drop-shadow-[0_1.5px_3px_rgba(255,120,148,0.25)]"
      >
        {/* Cute floppy cat/bear ears */}
        <path
          d="M 18 32 C 8 8, 32 8, 36 32 Z"
          fill="#FFB7C5"
          stroke="#FF7894"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M 82 32 C 92 8, 68 8, 64 32 Z"
          fill="#FFB7C5"
          stroke="#FF7894"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Inner ear pink highlights */}
        <path d="M 22 29 C 15 13, 29 13, 31 29 Z" fill="#FF8EA6" opacity="0.75" />
        <path d="M 78 29 C 85 13, 71 13, 69 29 Z" fill="#FF8EA6" opacity="0.75" />
        
        {/* Main Face / Body (Soft round squircle) */}
        <rect
          x="10"
          y="25"
          width="80"
          height="68"
          rx="28"
          fill="url(#temoteCuteGrad)"
          stroke="#FF7894"
          strokeWidth="4"
        />
        
        {/* Blushing Cheeks (Warm glowing pink) */}
        <ellipse cx="26" cy="65" rx="9" ry="6" fill="#FF7894" opacity="0.55" />
        <ellipse cx="74" cy="65" rx="9" ry="6" fill="#FF7894" opacity="0.55" />
        
        {/* Big Sparkling Anime Eyes */}
        <circle cx="32" cy="51" r="6.5" fill="#2D2D30" />
        <circle cx="30" cy="48" r="2.2" fill="white" />
        <circle cx="33.5" cy="53" r="1" fill="white" opacity="0.8" />
        
        <circle cx="68" cy="51" r="6.5" fill="#2D2D30" />
        <circle cx="66" cy="48" r="2.2" fill="white" />
        <circle cx="69.5" cy="53" r="1" fill="white" opacity="0.8" />
        
        {/* Sweet curving cat-like mouth (w-mouth) */}
        <path
          d="M 44 59 C 46 62.5, 49 62.5, 50 59.5 C 51 62.5, 54 62.5, 56 59"
          stroke="#2D2D30"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Cute Yellow Flower Hair Clip */}
        <circle cx="50" cy="33" r="4.5" fill="#FFE14D" />
        <circle cx="45" cy="33" r="4" fill="#FFE14D" />
        <circle cx="55" cy="33" r="4" fill="#FFE14D" />
        <circle cx="50" cy="28.5" r="4" fill="#FFE14D" />
        <circle cx="50" cy="37.5" r="4" fill="#FFE14D" />
        <circle cx="50" cy="33" r="1.8" fill="#FF9E1B" />

        <defs>
          <linearGradient id="temoteCuteGrad" x1="10" y1="25" x2="90" y2="93" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF0F3" />
            <stop offset="0.5" stopColor="#FFE1E6" />
            <stop offset="1" stopColor="#FFD3DA" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
