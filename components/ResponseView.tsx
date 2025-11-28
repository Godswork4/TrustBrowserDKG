import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Copy, Network, ShieldCheck, CheckCircle2, Sparkles, UploadCloud } from 'lucide-react';
import { DKGResponseData, TruthScoreResult } from '../types';
import { TrustLogo } from './TrustLogo';
import { fetchTruthSignals, computeTruthScore, publishKnowledgeAsset } from '../services/geminiService';

interface ResponseViewProps {
  data: DKGResponseData | null;
  query: string;
}

export const ResponseView: React.FC<ResponseViewProps> = ({ data, query }) => {
  if (!data) return null;
  const [truth, setTruth] = useState<TruthScoreResult | null>(null);
  const [localExplorer, setLocalExplorer] = useState<string | undefined>(data.explorerUrl);
  const [localUAL, setLocalUAL] = useState<string | undefined>(data.ual);
  const [publishing, setPublishing] = useState(false);
  const displayedSource = useMemo(() => {
    return (localUAL || data.ual) ? (localUAL || data.ual) : data.sourceHash;
  }, [localUAL, data.ual, data.sourceHash]);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  useEffect(() => {
    try { setIsWalletConnected(!!localStorage.getItem('walletAddress')); } catch { setIsWalletConnected(false); }
  }, [localUAL]);
  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      const data = evt.data || {};
      if (data.type === 'WALLET_CONNECTED') setIsWalletConnected(true);
      if (data.type === 'WALLET_DISCONNECTED') setIsWalletConnected(false);
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, []);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (data.sourceType !== 'dkg' || !data.ual) { setTruth(null); return; }
      const signals = await fetchTruthSignals(data.ual, query);
      const score = computeTruthScore(signals);
      if (alive) setTruth(score);
    };
    run();
    return () => { alive = false; };
  }, [data.sourceType, data.ual, query]);

  return (
    <div className="flex flex-col h-full relative">
       
       {/* Ambient Backlight */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />

       {/* Header */}
       <div className="flex justify-between items-center px-8 py-6 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 relative">
             <TrustLogo className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">TrustBrowser</span>
        </div>
        <div className="flex space-x-8 text-base font-medium text-gray-400">
          <button className="hover:text-blue-400 transition-colors">Home</button>
          <button className="hover:text-blue-400 transition-colors">Profile</button>
          <button className="hover:text-blue-400 transition-colors">Settings</button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 md:px-12 lg:px-20 flex flex-col justify-center pb-12 z-10">
        
        {/* Glass Card */}
        <div className="glass-panel rounded-2xl p-8 md:p-12 max-w-5xl mx-auto w-full relative overflow-hidden animate-slide-up bg-[#0a0f26]/60 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
           
           {/* Inner Top Light */}
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

           <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <h3 className="text-blue-200/70 text-lg font-light tracking-wide">{data.sourceType === 'dkg' ? 'DKG Response' : 'AI Assisted Response'}:</h3>
              </div>
              
              {/* Question / Title */}
              <div className="mb-6">
                 <h2 className="text-4xl font-bold text-white mb-1 leading-tight">{data.title}</h2>
                 <div className="h-0.5 w-16 bg-blue-500 rounded-full mt-4" />
              </div>
              
              {/* Answer Text */}
              <div className="text-gray-300 leading-relaxed space-y-4 text-base md:text-lg font-light max-w-4xl">
                <p>{data.explanation}</p>
              </div>

              {/* Source Box */}
              <div className="mt-10 bg-[#020410]/60 rounded-xl border border-blue-500/30 p-6 relative group hover:border-blue-400/50 transition-colors duration-300">
                 {/* Label */}
                 <div className="flex items-center space-x-2 mb-3">
                    <Shield className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                    <span className="text-blue-100 font-medium text-sm">{data.sourceType === 'dkg' ? 'Verified Source Link' : 'Generated Reference'}:</span>
                 </div>
                 
                 {/* Hash Code */}
                 <div className="flex items-center justify-between bg-[#050b1e] rounded-lg border border-white/5 px-4 py-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <code className="text-blue-300 font-mono text-sm md:text-base truncate mr-4 relative z-10 tracking-wide">
                       {displayedSource}
                    </code>
                    
                    <div className="flex items-center space-x-2 text-gray-500 hover:text-white cursor-pointer transition-colors relative z-10" onClick={() => { navigator.clipboard.writeText(displayedSource || ''); }}>
                       <span className="text-xs uppercase tracking-wider font-medium hidden sm:block">[Copy]</span>
                       <Copy className="w-4 h-4" />
                    </div>
                 </div>

                 {/* Action Buttons */}
                 {((localExplorer || data.explorerUrl) && (localUAL || data.ual)) ? (
                   <a href={localExplorer || data.explorerUrl} target="_blank" rel="noreferrer" className="w-full mt-4 py-3.5 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center space-x-2 group/btn">
                      <span className="group-hover/btn:tracking-wide transition-all duration-300">Explore in Knowledge Graph</span>
                      <Network className="w-4 h-4 text-blue-500" />
                   </a>
                 ) : (
                   <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <button className="py-3.5 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                         <span>AI Suggested Explanation</span>
                      </button>
                    <button onClick={async () => { if (publishing) return; if (!isWalletConnected) { try { window.postMessage({ type: 'PROMPT_CONNECT_WALLET' }, '*'); } catch {} return; } setPublishing(true); const res = await publishKnowledgeAsset({ title: data.title, explanation: data.explanation }); setLocalExplorer(res.explorerUrl); setLocalUAL(res.ual); setPublishing(false); }} className="py-3.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 text-blue-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50" disabled={publishing} title={isWalletConnected ? 'Publish to DKG' : 'Connect wallet to publish'}>
                      <UploadCloud className="w-4 h-4 text-blue-400" />
                      <span>{publishing ? 'Publishing…' : (isWalletConnected ? 'Be the first to publish' : 'Connect wallet to publish')}</span>
                    </button>
                   </div>
                 )}
              </div>

              {truth && (
                <div className="mt-6 bg-[#020410]/60 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">Truth Score</div>
                    <div className="text-xl font-bold text-white">{Math.round(truth.composite * 100)}%</div>
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    {truth.badges.verifiedFingerprint && (<span className="px-2 py-1 text-[10px] rounded bg-green-500/10 text-green-300 border border-green-500/20">Verified fingerprint</span>)}
                    {truth.badges.highAvailability && (<span className="px-2 py-1 text-[10px] rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">High availability</span>)}
                    {truth.badges.paranetCurated && (<span className="px-2 py-1 text-[10px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">Paranet curated</span>)}
                  </div>
                </div>
              )}
           </div>

           {/* Floating Bottom Badge: Powered by OriginTrail */}
           <div className="mt-10 flex justify-center">
              <a
                href="https://origintrail.io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/20 backdrop-blur-md text-blue-200 hover:text-blue-100 transition-colors"
              >
                <img src="https://cryptologos.cc/logos/origintrail-trac-logo.svg?v=031" alt="OriginTrail Logo" className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Powered by OriginTrail</span>
              </a>
           </div>

        </div>
      </div>
    </div>
  );
};
