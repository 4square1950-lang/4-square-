import React from 'react';

interface FourSquareCoinProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const FourSquareCoin: React.FC<FourSquareCoinProps> = ({
  className = '',
  size = 24,
  animate = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md ${animate ? 'hover:rotate-12 transition-transform' : ''} ${className}`}
    >
      <defs>
        {/* Outer Gold Rim Gradient */}
        <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Inner Coin Face Gradient */}
        <radialGradient id="goldFace" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>

        {/* 4 Square Quadrant Gradients */}
        <linearGradient id="sq1Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="sq2Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="sq3Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="sq4Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Coin Edge Ridge Pattern */}
        <filter id="emboss" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="1.5" stdDeviation="0.8" floodColor="#78350F" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Outer Coin Base Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#goldRim)" stroke="#92400E" strokeWidth="2.5" />

      {/* Edge Ridges / Beads */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + 43.5 * Math.cos(rad);
        const cy = 50 + 43.5 * Math.sin(rad);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="1.4"
            fill="#FEF3C7"
            stroke="#78350F"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Inner Recessed Face */}
      <circle cx="50" cy="50" r="38" fill="url(#goldFace)" stroke="#78350F" strokeWidth="1.5" />

      {/* Four Square Court on the Coin Face (Rounded 2x2 Grid) */}
      <g filter="url(#emboss)">
        {/* Square 1 (King - Top Left, Red with tiny Crown) */}
        <rect x="23" y="23" width="24" height="24" rx="3.5" fill="url(#sq1Grad)" stroke="#FEF08A" strokeWidth="1" />
        {/* Tiny Crown inside Square 1 */}
        <path
          d="M28 37 L29 30 L32 34 L35 28 L38 34 L41 30 L42 37 Z"
          fill="#FEF08A"
          stroke="#78350F"
          strokeWidth="0.6"
        />

        {/* Square 2 (Contender - Top Right, Amber) */}
        <rect x="53" y="23" width="24" height="24" rx="3.5" fill="url(#sq2Grad)" stroke="#FEF08A" strokeWidth="1" />
        <text
          x="65"
          y="41"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          2
        </text>

        {/* Square 3 (Challenger - Bottom Left, Green) */}
        <rect x="23" y="53" width="24" height="24" rx="3.5" fill="url(#sq3Grad)" stroke="#FEF08A" strokeWidth="1" />
        <text
          x="35"
          y="71"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          3
        </text>

        {/* Square 4 (Rookie/Entry - Bottom Right, Blue) */}
        <rect x="53" y="53" width="24" height="24" rx="3.5" fill="url(#sq4Grad)" stroke="#FEF08A" strokeWidth="1" />
        <text
          x="65"
          y="71"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          4
        </text>
      </g>

      {/* Central Court Divider Lines (Silver/White) */}
      <rect x="48" y="21" width="4" height="58" fill="#FFFBEB" rx="1.5" stroke="#78350F" strokeWidth="0.6" />
      <rect x="21" y="48" width="58" height="4" fill="#FFFBEB" rx="1.5" stroke="#78350F" strokeWidth="0.6" />

      {/* Subtle Coin Specular Highlight Arc */}
      <path
        d="M22 36 A36 36 0 0 1 76 22"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
};
