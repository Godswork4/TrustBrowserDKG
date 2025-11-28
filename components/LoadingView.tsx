import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { TrustLogo } from './TrustLogo';

interface LoadingViewProps {
  onLoadComplete: () => void;
}

export const LoadingView: React.FC<LoadingViewProps> = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(1);
  const [layerTitle, setLayerTitle] = useState("KNOWLEDGE LAYER: INGESTION & STRUCTURING");
  const [statusText, setStatusText] = useState("Processing Triple Store + Paranets");
  
  // Use a ref to track stage inside the interval closure without dependency issues
  const stageRef = useRef(1);

  useEffect(() => {
    const duration = 4500; // Increased duration slightly to make the transitions readable
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / totalSteps) * 100, 100);
      setProgress(newProgress);

      // Stage 1: Knowledge Layer (0% - 33%)
      if (newProgress < 33) {
         if (stageRef.current !== 1) {
             stageRef.current = 1;
             setStage(1);
             setLayerTitle("KNOWLEDGE LAYER: INGESTION & STRUCTURING");
             setStatusText("Processing Triple Store + Paranets");
         }
      } 
      // Stage 2: Trust Layer (33% - 66%)
      else if (newProgress >= 33 && newProgress < 66) {
         if (stageRef.current !== 2) {
             stageRef.current = 2;
             setStage(2);
             setLayerTitle("TRUST LAYER: VERIFICATION & OWNERSHIP");
             setStatusText("Validating Ownership Proofs on DKG");
         }
      } 
      // Stage 3: Verifiable-AI Layer (66% - 100%)
      else if (newProgress >= 66) {
         if (stageRef.current !== 3) {
             stageRef.current = 3;
             setStage(3);
             setLayerTitle("VERIFIABLE‑AI LAYER: REASONING & CONSUMPTION");
             setStatusText("Synthesizing Trusted Response");
         }
      }

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setTimeout(onLoadComplete, 800); 
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onLoadComplete]);

  return (
    <div className="flex flex-col h-full relative">
      
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center px-8 py-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 relative">
             <TrustLogo className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">TrustBrowser</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-16 px-6 z-10">
        
        {/* Logo (Pulse Animation) */}
        <div className="mb-16 relative">
          {/* Pulse Rings */}
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20" />
          <div className="absolute -inset-4 bg-blue-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1s] opacity-10" />
          
          <div className="w-32 h-32 relative z-10 drop-shadow-[0_0_40px_rgba(59,130,246,0.5)]">
             <TrustLogo className="w-full h-full" />
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[400px] mb-8 relative">
          <div className="h-1.5 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all duration-100 ease-linear relative"
              style={{ width: `${progress}%` }}
            >
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
            </div>
          </div>
          
          {/* Loading Spinner centered on bar if needed, or just keep cleaner look */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-10">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        </div>

        {/* Text Status */}
        <div className="text-center space-y-3 min-h-[80px]">
          <h3 className="text-blue-200/90 font-bold tracking-[0.05em] text-sm uppercase font-mono animate-fade-in transition-all duration-300">
            {layerTitle}
          </h3>
          <p className="text-gray-400 text-base font-light tracking-wide animate-pulse">{statusText}...</p>
          <p className="text-gray-600 text-sm mt-6 font-mono tracking-widest">Step {stage} of 3 in progress...</p>
        </div>

        {/* Footer: Powered by OriginTrail */}
        <a
          href="https://origintrail.io"
          target="_blank"
          rel="noreferrer"
          className="mt-16 inline-flex items-center space-x-3 px-5 py-2 rounded-lg bg-[#0f172a] border border-blue-500/20 shadow-lg text-blue-200 hover:text-blue-100 transition-colors"
        >
          <img
            src="https://cryptologos.cc/logos/origintrail-trac-logo.svg?v=031"
            alt="OriginTrail Logo"
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Powered by OriginTrail</span>
        </a>

      </div>
    </div>
  );
};