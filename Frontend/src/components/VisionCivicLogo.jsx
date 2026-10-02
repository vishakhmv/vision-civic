import React from 'react';

/**
 * Vision Civic Emblem:
 * Integrates an outer civic protection Shield with a central surveillance Eye/Lens aperture.
 */
export default function VisionCivicLogo({ size = 32, className = '', showText = false, textClass = '' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }} className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(6, 182, 212, 0.35))' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0891B2" />
            <stop offset="0.5" stopColor="#0284C7" />
            <stop offset="1" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="eyeGrad" x1="16" y1="18" x2="32" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22D3EE" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Shield Outer Path */}
        <path
          d="M24 4L7 11V23.5C7 33.5 14.2 42.6 24 45C33.8 42.6 41 33.5 41 23.5V11L24 4Z"
          fill="url(#shieldGrad)"
          stroke="#38BDF8"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Inner Shield Accent Contour */}
        <path
          d="M24 8L11 13.8V23.5C11 31.2 16.5 38.3 24 40.5C31.5 38.3 37 31.2 37 23.5V13.8L24 8Z"
          fill="#0B132B"
          fillOpacity="0.45"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1"
        />

        {/* Central Surveillance Eye Outline */}
        <path
          d="M14 24C16.8 19.5 20.2 17.5 24 17.5C27.8 17.5 31.2 19.5 34 24C31.2 28.5 27.8 30.5 24 30.5C20.2 30.5 16.8 28.5 14 24Z"
          fill="rgba(8, 145, 178, 0.25)"
          stroke="#E0F2FE"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Iris / Camera Lens */}
        <circle cx="24" cy="24" r="5" fill="url(#eyeGrad)" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Aperture Pupil & Catchlight */}
        <circle cx="24" cy="24" r="2.2" fill="#0A1128" />
        <circle cx="25.2" cy="22.8" r="0.8" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Vision Civic
          </span>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-teal)', fontWeight: 700 }}>
            Civic Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
