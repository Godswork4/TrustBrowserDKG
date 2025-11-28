import React, { useState, useRef, useEffect } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { TrustLogo } from './TrustLogo';

interface LandingViewProps {
  onSearch: (query: string) => void;
  onOpenProfile: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onSearch, onOpenProfile }) => {
  const [inputValue, setInputValue] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate 3D Tilt for the logo container
  const getTiltStyle = () => {
    if (!logoRef.current) return {};
    
    const rect = logoRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (mousePos.x - centerX) / window.innerWidth;
    const deltaY = (mousePos.y - centerY) / window.innerHeight;

    // Max rotation degrees
    const maxRot = 15; 
    
    return {
      transform: `perspective(1000px) rotateY(${deltaX * maxRot}deg) rotateX(${-deltaY * maxRot}deg)`,
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSearch(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden" ref={containerRef}>
      {/* Top Navbar inside view */}
      <div className="flex justify-between items-center px-8 py-6 z-20">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="w-8 h-8 relative transition-transform duration-300 group-hover:scale-110">
             <TrustLogo className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-sans group-hover:text-blue-200 transition-colors">TrustBrowser</span>
        </div>
        <div className="flex space-x-8 text-base font-medium text-gray-400">
          <button className="hover:text-blue-400 transition-colors">Home</button>
          <button onClick={onOpenProfile} className="hover:text-blue-400 transition-colors">Profile</button>
          <button className="hover:text-blue-400 transition-colors">Settings</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16 z-10">
        
        {/* Animated Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Hero Avatar / Logo with Gesture Animation */}
        <div 
          ref={logoRef}
          className="mb-12 relative group cursor-pointer animate-fade-in"
          style={{ transition: 'transform 0.1s ease-out', ...getTiltStyle() }}
        >
          {/* Outer Glow Ring */}
          <div className="absolute -inset-10 bg-blue-500/20 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 animate-pulse-slow pointer-events-none" />
          
          <div className="relative w-40 h-40 md:w-48 md:h-48 drop-shadow-[0_0_30px_rgba(37,99,235,0.5)]">
             <TrustLogo 
                className="w-full h-full" 
                mousePos={mousePos} 
                containerRef={logoRef} 
             />
          </div>
        </div>

        {/* Greeting Text */}
        <div className="text-center mb-12 space-y-3 z-10 animate-slide-up">
          <h2 className="text-gray-400 text-xl md:text-2xl font-medium tracking-wide">Welcome back, Sviatoslav</h2>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
            How can I make your<br />
            browsing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">safer</span> today?
          </h1>
        </div>

        {/* Search Input */}
        <div className="w-full max-w-2xl relative group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Gradient Border Effect */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-blue-500/50 rounded-2xl opacity-40 group-hover:opacity-100 blur-sm transition duration-500" />
          
          <div className="relative flex items-center bg-[#050b1e]/90 backdrop-blur-xl rounded-2xl border border-white/10 px-7 py-6 shadow-2xl">
            <input 
              type="text"
              className="w-full bg-transparent text-xl text-white placeholder-gray-500 focus:outline-none font-light tracking-wide"
              placeholder="Search securely..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div 
               className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 cursor-pointer transition-colors"
               onClick={() => inputValue.trim() && onSearch(inputValue)}
            >
               <Search className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Footer: Powered by OriginTrail */}
        <a
          href="https://origintrail.io"
          target="_blank"
          rel="noreferrer"
          className="mt-12 inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-[#0a0f26] border border-blue-500/20 animate-slide-up shadow-[0_0_20px_rgba(0,0,0,0.3)] text-blue-200 hover:text-blue-100 transition-colors"
          style={{ animationDelay: '0.2s' }}
        >
          <img
            src="https://cryptologos.cc/logos/origintrail-trac-logo.svg?v=031"
            alt="OriginTrail Logo"
            className="w-6 h-6"
          />
          <span className="text-base md:text-lg font-medium">Powered by OriginTrail</span>
        </a>

      </div>
    </div>
  );
};