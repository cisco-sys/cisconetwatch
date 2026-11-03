'use client';
import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

/** Vector logo — no binary asset required */
export default function AppLogo({ size = 32, className = '' }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CiscoNetWatch"
    >
      <rect width="64" height="64" rx="12" fill="#0d1520" />
      <rect x="2" y="2" width="60" height="60" rx="10" stroke="#00BCEB" strokeWidth="2" opacity="0.4" />
      <circle cx="32" cy="32" r="6" fill="#00BCEB" />
      <circle cx="16" cy="20" r="3" fill="#00BCEB" opacity="0.8" />
      <circle cx="48" cy="20" r="3" fill="#00BCEB" opacity="0.8" />
      <circle cx="16" cy="44" r="3" fill="#00BCEB" opacity="0.8" />
      <circle cx="48" cy="44" r="3" fill="#00BCEB" opacity="0.8" />
      <path
        d="M19 22L29 30M35 30L45 22M19 42L29 34M35 34L45 42"
        stroke="#00BCEB"
        strokeWidth="1.5"
        opacity="0.6"
      />
    </svg>
  );
}
