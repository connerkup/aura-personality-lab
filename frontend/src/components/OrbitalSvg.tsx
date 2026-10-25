import React from 'react';

interface OrbitalSvgProps {
  size?: number;
  uid?: string;
}

export const OrbitalSvg: React.FC<OrbitalSvgProps> = ({ size = 84, uid = 'orb' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`coreGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#a78bfa" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#080910" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`orbitGrad1-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`orbitGrad2-${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="32" fill={`url(#coreGlow-${uid})`}>
        <animate attributeName="r" values="27;35;27" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <g>
        <ellipse
          cx="60"
          cy="60"
          rx="48"
          ry="20"
          stroke={`url(#orbitGrad1-${uid})`}
          strokeWidth="1.6"
        />
        <circle cx="108" cy="60" r="3.5" fill="#38bdf8" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 60 60"
          to="360 60 60"
          dur="11s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <ellipse
          cx="60"
          cy="60"
          rx="48"
          ry="20"
          stroke={`url(#orbitGrad2-${uid})`}
          strokeWidth="1.6"
        />
        <circle cx="12" cy="60" r="3.5" fill="#f472b6" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="60 60 60"
          to="420 60 60"
          dur="14s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <ellipse
          cx="60"
          cy="60"
          rx="48"
          ry="20"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.1"
          strokeDasharray="4 4"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="120 60 60"
          to="-240 60 60"
          dur="18s"
          repeatCount="indefinite"
        />
      </g>
      <circle cx="60" cy="60" r="5.5" fill="#ffffff" />
    </svg>
  );
};
