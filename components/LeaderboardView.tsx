import React, { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, Activity, Database, Share2, Layers } from 'lucide-react';
import { TrustLogo } from './TrustLogo';
import { fetchLeaderboard, resolvePNS } from '../services/geminiService';

export const LeaderboardView: React.FC = () => {
  const [rows, setRows] = useState<Array<{ual: string; count: number}>>([]);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  useEffect(() => {
    try { setUserAddress(localStorage.getItem('walletAddress')); } catch {}
    let alive = true;
    const load = async () => { const r = await fetchLeaderboard(); if (alive) setRows(r); };
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const [userDisplay, setUserDisplay] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!userAddress) { setUserDisplay(null); return; }
      const name = await resolvePNS(userAddress);
      if (alive) setUserDisplay(name || `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`);
    };
    run();
    return () => { alive = false; };
  }, [userAddress]);
  const userRank = useMemo(() => {
    if (!userAddress || !rows.length) return null;
    const idx = rows.findIndex(r => r.ual.includes(userAddress.slice(2).toLowerCase()));
    return idx >= 0 ? idx + 1 : null;
  }, [rows, userAddress]);
  // Mock Data for the Graph
  const graphPoints = [
    20, 45, 30, 60, 40, 75, 55, 80, 70, 60, 85, 90
  ];
  
  // Generate SVG Path for the graph (smooth curve)
  const generatePath = (points: number[]) => {
    // simple line simplification
    let d = `M 0 ${100 - points[0]}`;
    const step = 100 / (points.length - 1);
    
    points.forEach((p, i) => {
      if (i === 0) return;
      const x = i * step;
      const y = 100 - p;
      // Bezier control points for smoothing
      const prevX = (i - 1) * step;
      const prevY = 100 - points[i - 1];
      const cp1x = prevX + step / 2;
      const cp1y = prevY;
      const cp2x = x - step / 2;
      const cp2y = y;
      
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    });
    return d;
  };

  const mainPath = generatePath(graphPoints);
  const secondaryPath = generatePath(graphPoints.map(p => p * 0.6 + 10)); // Offset line

  const leaderboardData = rows.map((r, i) => {
    const short = r.ual.length > 16 ? `${r.ual.slice(0,8)}...${r.ual.slice(-6)}` : r.ual;
    const isUser = userAddress ? r.ual.toLowerCase().includes(userAddress.slice(2).toLowerCase()) : false;
    return { rank: i + 1, name: short, score: `${r.count}`, change: 0, isUser };
  });

  return (
    <div className="flex flex-col h-full bg-[#020410] overflow-y-auto custom-scrollbar relative">
      
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full z-10">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
           <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                 <TrustLogo className="w-8 h-8" />
                 Trust Network Leaderboard
              </h1>
              <p className="text-gray-400">Track real-time contributions to the Decentralized Knowledge Graph.</p>
           </div>
           {userAddress && (
             <div className="text-right hidden sm:block">
                <div className="text-sm text-gray-500 font-mono">YOUR CURRENT RANK</div>
                <div className="text-4xl font-bold text-blue-400 shadow-blue-500/50 drop-shadow-lg">{userRank ? `#${userRank}` : '—'}</div>
                <div className="text-xs text-gray-400 font-mono mt-1">{userDisplay || ''}</div>
             </div>
           )}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Graph Card */}
          <div className="lg:col-span-2 bg-[#0a0f26]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
             <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                   <h2 className="text-lg font-semibold text-white">Knowledge Graph Activity</h2>
                   <p className="text-xs text-gray-500 mt-1">Real-time Data Flow & Verification</p>
                </div>
                <button className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400">
                   <MoreHorizontal className="w-5 h-5" />
                </button>
             </div>

             {/* Graph Container */}
             <div className="h-64 w-full relative">
                {/* Y-Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-600 font-mono">
                   <div className="border-b border-white/5 pb-1">100%</div>
                   <div className="border-b border-white/5 pb-1">75%</div>
                   <div className="border-b border-white/5 pb-1">50%</div>
                   <div className="border-b border-white/5 pb-1">25%</div>
                   <div className="border-b border-white/5 pb-1">0%</div>
                </div>

                {/* SVG Graph */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                   <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                         <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                   </defs>
                   
                   {/* Secondary Line */}
                   <path d={secondaryPath} fill="none" stroke="#818cf8" strokeWidth="0.5" strokeDasharray="2,2" className="opacity-50" />
                   
                   {/* Main Line Area */}
                   <path d={`${mainPath} L 100 100 L 0 100 Z`} fill="url(#lineGradient)" className="opacity-30" />
                   
                   {/* Main Line */}
                   <path d={mainPath} fill="none" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                      <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="2s" />
                   </path>

                   {/* Points */}
                   {graphPoints.map((p, i) => {
                      // Only show some points
                      if (i % 3 !== 0) return null;
                      const x = (i * (100 / (graphPoints.length - 1)));
                      const y = 100 - p;
                      return (
                         <circle key={i} cx={x} cy={y} r="1.5" fill="#fff" className="animate-pulse">
                            {i === 9 && (
                               <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" />
                            )}
                         </circle>
                      );
                   })}
                   
                   {/* Tooltip for peak */}
                   <g transform={`translate(${9 * (100/11)}, ${100-60-10})`}>
                      <rect x="-10" y="-8" width="20" height="8" rx="2" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.2" />
                      <text x="0" y="-3" textAnchor="middle" fontSize="4" fill="white" className="font-mono">20.42</text>
                   </g>
                </svg>
             </div>

             {/* X-Axis Labels */}
             <div className="flex justify-between mt-4 text-xs text-gray-500 font-mono px-2">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
             </div>

             {/* Bottom Stats Row */}
             <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                <div>
                   <div className="text-gray-500 text-xs mb-1">Total meters</div>
                   <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-white">38,738</span>
                      <span className="text-green-400 text-xs flex items-center bg-green-400/10 px-1.5 py-0.5 rounded">
                         <ArrowUpRight className="w-3 h-3 mr-0.5" /> 12.5%
                      </span>
                   </div>
                </div>
                <div>
                   <div className="text-gray-500 text-xs mb-1">Top keits</div>
                   <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-white">225.23K</span>
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                   </div>
                </div>
             </div>
          </div>

          {/* Right Column: Stats & User List */}
          <div className="flex flex-col gap-6">
             
             {/* Stat Cards */}
             <div className="bg-[#0a0f26]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
                <div className="flex items-center space-x-3 mb-2">
                   <div className="p-2 rounded-lg bg-blue-500/20">
                      <Activity className="w-5 h-5 text-blue-400" />
                   </div>
                   <span className="text-gray-400 text-sm">Activity Response</span>
                </div>
                <div className="text-2xl font-bold text-white">1h 09m <span className="text-sm text-gray-500 font-normal">avg</span></div>
             </div>

             <div className="bg-[#0a0f26]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
                <div className="flex items-center space-x-3 mb-2">
                   <div className="p-2 rounded-lg bg-purple-500/20">
                      <Database className="w-5 h-5 text-purple-400" />
                   </div>
                   <span className="text-gray-400 text-sm">Knowledge Assets</span>
                </div>
                <div className="text-2xl font-bold text-white">{rows.reduce((a, b) => a + (b.count||0), 0)} <span className="text-sm text-gray-500 font-normal">total</span></div>
             </div>

             {/* Leaderboard List */}
             <div className="flex-1 bg-[#0a0f26]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 bg-white/5">
                   <h3 className="text-sm font-semibold text-white">Top Contributors</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   {leaderboardData.map((user) => (
                      <div 
                        key={user.rank}
                        className={`
                           flex items-center justify-between p-4 border-b border-white/5 
                           ${user.isUser ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-white/5'}
                        `}
                      >
                         <div className="flex items-center space-x-3">
                            <span className={`text-sm font-mono w-8 ${user.isUser ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                               #{user.rank}
                            </span>
                            <div>
                               <div className={`text-sm font-medium ${user.isUser ? 'text-white' : 'text-gray-300'}`}>
                                  {user.name}
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-bold text-gray-200">{user.score}</div>
                            <div className={`text-xs flex items-center justify-end ${user.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                               {user.change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                               {Math.abs(user.change)}%
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

          </div>

        </div>

      </div>
    </div>
  );
};