import React, { useMemo } from 'react';

interface TrustLogoProps {
  className?: string;
  mousePos?: { x: number; y: number };
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const TrustLogo: React.FC<TrustLogoProps> = ({ className, mousePos, containerRef }) => {
  
  // Calculate eye movement based on mouse position relative to the logo center
  const eyeTransform = useMemo(() => {
    if (!mousePos || !containerRef?.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = mousePos.x - centerX;
    const deltaY = mousePos.y - centerY;

    // Limit the movement radius
    const maxMove = 6; 
    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 10, maxMove);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  }, [mousePos, containerRef]);

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="trust-gradient" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" /> {/* blue-500 */}
          <stop offset="1" stopColor="#1d4ed8" /> {/* blue-700 */}
        </linearGradient>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Body Bubble */}
      <path 
        d="M50 5C25.147 5 5 25.147 5 50C5 60.5 8.6 70.1 14.7 77.6L10 92L26 86.5C32.8 90.6 41.1 93 50 93C74.853 93 95 72.853 95 48C95 23.147 74.853 5 50 5Z" 
        fill="url(#trust-gradient)" 
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      
      {/* Highlight/Reflection for glass effect */}
      <path 
        d="M50 5C25.147 5 5 25.147 5 50C5 55 6 60 8 64C12 35 35 12 64 8C60 6 55 5 50 5Z" 
        fill="white" 
        fillOpacity="0.1" 
      />

      {/* Eyes Container */}
      <g transform={`translate(${eyeTransform.x}, ${eyeTransform.y})`} className="transition-transform duration-75 ease-out">
        {/* Left Eye */}
        <circle cx="35" cy="45" r="8" fill="white" filter="url(#glow-filter)" />
        {/* Right Eye */}
        <circle cx="65" cy="45" r="8" fill="white" filter="url(#glow-filter)" />
      </g>
    </svg>
  );
};
