"use client";

import React from "react";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  light?: boolean;
}

export default function Logo({ className = "h-10 w-auto", showTagline = true, light = false }: LogoProps) {
  const textColor = light ? "#000000" : "#FFFFFF";
  const taglineColor = light ? "#4B5563" : "#94A3B8";
  const viewBox = showTagline ? "0 0 300 80" : "0 0 300 60";

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      {/* Bold Blue Checkmark/Tick overlying m and a */}
      <path
        d="M 52 38 L 62 48 L 84 22"
        stroke="#0091FF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* "Smart" Text */}
      <text
        x="12"
        y="54"
        fill={textColor}
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="36"
        letterSpacing="-1.2"
      >
        Smart
      </text>

      {/* "Hire" Text */}
      <text
        x="118"
        y="54"
        fill="#0091FF"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="36"
        letterSpacing="-1.2"
      >
        Hire
      </text>

      {/* Subtitle/Tagline */}
      {showTagline && (
        <text
          x="12"
          y="74"
          fill={taglineColor}
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="10"
          letterSpacing="1.8"
        >
          SMART SCREENING <tspan fill="#0091FF">•</tspan> CONFIDENT HIRE
        </text>
      )}
    </svg>
  );
}
