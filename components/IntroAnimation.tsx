import React, { useEffect, useState } from 'react';
import { TrustLogo } from './TrustLogo';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequence timing
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 0: Initial State (Black)
    
    // Step 1: Orb appears/scales (500ms)
    timers.push(setTimeout(() => setStep(1), 500));

    // Step 2: Text reveal (2000ms)
    timers.push(setTimeout(() => setStep(2), 2000));

    // Step 3: Fade out and complete (4500ms)
    timers.push(setTimeout(() => setStep(3), 4500));
    
    // Step 4: Callback (5000ms)
    timers.push(setTimeout(onComplete, 5000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (step === 3) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-[#020410] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${step === 3 ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Background ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className={`w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] transition-all duration-[2000ms] ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* The Blue Logo */}
        <div 
          className={`
            transition-all duration-[1500ms] cubic-bezier(0.22, 1, 0.36, 1) transform
            ${step === 0 ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
            ${step === 2 ? 'translate-y-0' : 'translate-y-4'}
          `}
        >
          <div className="w-32 h-32 md:w-40 md:h-40 drop-shadow-[0_0_60px_rgba(0,242,254,0.4)]">
            <TrustLogo className="w-full h-full" />
          </div>
        </div>

        {/* Text Reveal */}
        <div className={`mt-10 flex flex-col items-center transition-all duration-1000 delay-300 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
               <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-[0.2em] text-white font-sans uppercase">
              Trust Browser
            </h1>
          </div>
          <div className="h-[1px] w-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent transition-all duration-[1500ms] delay-500" 
               style={{ width: step >= 2 ? '100%' : '0%' }} 
          />
          <p className="mt-4 text-blue-300/80 tracking-widest text-base font-medium uppercase">
            Trust The Source
          </p>
        </div>
      </div>
    </div>
  );
};
