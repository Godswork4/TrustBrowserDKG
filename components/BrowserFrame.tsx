import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ShieldCheck, ArrowLeft, ArrowRight, RotateCcw, MoreVertical, Globe, Clock, ChevronRight, Wallet } from 'lucide-react';
import { Tab, HistoryItem } from '../types';
import { TrustLogo } from './TrustLogo';

interface BrowserFrameProps {
  children: React.ReactNode;
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onOpenLeaderboard: () => void;
  onHistorySelect: (tabId: string, item: HistoryItem) => void;
  onSearch: (query: string) => void;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({ 
  children, 
  tabs, 
  activeTabId, 
  onSwitchTab, 
  onCloseTab,
  onNewTab,
  onOpenLeaderboard,
  onHistorySelect,
  onSearch
}) => {
  // Find active tab to display its URL in address bar
  const activeTab = tabs.find(t => t.id === activeTabId);
  const currentUrl = activeTab?.searchState.url;
  const currentFavicon = activeTab?.searchState.favicon;
  const displayUrl = currentUrl || "trust://dkg-node/v1/secure-search";
  const isWebUrl = !!currentUrl;

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string | null;
  }>({ visible: false, x: 0, y: 0, tabId: null });

  // Input State
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  // Sync input value with active tab URL when not editing
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(currentUrl || '');
    }
  }, [currentUrl, activeTabId, isInputFocused]);

  useEffect(() => {
    const env = import.meta.env.VITE_DKG_ENVIRONMENT || 'testnet';
  }, []);
  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      const data = evt.data || {};
      if (data.type === 'PROMPT_CONNECT_WALLET') connectWallet();
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('walletAddress');
      if (saved) setWalletAddress(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const loadBalance = async () => {
      if (!walletAddress) return;
      try {
        const trac = import.meta.env.VITE_TRAC_TESTNET_ADDRESS || '';
        if (!trac) return;
        const { ethers } = await import('ethers');
        const eth = (window as any).ethereum;
        const provider = eth ? new ethers.BrowserProvider(eth) : null;
        if (!provider) return;
        const abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function symbol() view returns (string)"];
        const contract = new ethers.Contract(trac, abi, provider);
        const [raw, decimals, symbol] = await Promise.all([contract.balanceOf(walletAddress), contract.decimals(), contract.symbol()]);
        const formatted = Number(ethers.formatUnits(raw, decimals)).toFixed(4);
        const el = document.getElementById('trac-balance');
        if (el) el.textContent = `${formatted} ${symbol}`;
      } catch {}
    };
    loadBalance();
  }, [walletAddress]);

  const connectWallet = async () => {
    try {
      const eth = (window as any).ethereum;
      let accounts: string[] | null = null;
      if (eth) {
        accounts = await eth.request({ method: 'eth_requestAccounts' });
      } else {
        try {
          const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
          const provider = await EthereumProvider.init({ projectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''), showQrModal: true });
          accounts = await provider.request({ method: 'eth_requestAccounts' });
        } catch (e) {
          accounts = null;
        }
      }
      if (accounts && accounts.length) {
        setWalletAddress(accounts[0]);
        try { localStorage.setItem('walletAddress', accounts[0]); } catch {}
        try { window.postMessage({ type: 'WALLET_CONNECTED', address: accounts[0] }, '*'); } catch {}
      }
    } catch {}
  };

  const disconnectWallet = () => {
    try { localStorage.removeItem('walletAddress'); } catch {}
    setWalletAddress(null);
    try { window.postMessage({ type: 'WALLET_DISCONNECTED' }, '*'); } catch {}
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    if (contextMenu.tabId) {
      onHistorySelect(contextMenu.tabId, item);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const getTabHistory = (tabId: string | null) => {
    if (!tabId) return [];
    const tab = tabs.find(t => t.id === tabId);
    return tab?.history || [];
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(inputValue);
      inputRef.current?.blur();
    }
  };

  const handleAddressBarClick = () => {
    setIsInputFocused(true);
    setTimeout(() => {
      inputRef.current?.focus();
      if (!currentUrl) {
         // If it's a new tab page, select nothing or clear? keeping value is better for now if empty
      } else {
         inputRef.current?.select();
      }
    }, 0);
  };

  return (
    <div className="w-full h-full bg-[#050b1e] flex flex-col relative font-sans overflow-hidden">
      
      {/* Browser Tabs Area */}
      <div className="h-10 bg-[#020410] flex items-end px-2 space-x-1 pt-2 select-none overflow-x-auto no-scrollbar border-b border-white/5">
        
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div 
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={`
                h-8 rounded-t-lg px-3 md:px-4 flex items-center min-w-[160px] max-w-[240px] relative group cursor-pointer transition-all duration-200
                ${isActive 
                  ? 'bg-[#0a0f26] border-t border-l border-r border-white/5 shadow-[-5px_-5px_20px_rgba(0,0,0,0.5)] z-10' 
                  : 'bg-[#050b1e] hover:bg-[#0a0f26]/50 opacity-60 hover:opacity-100 border-t border-transparent hover:border-white/5'
                }
              `}
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center overflow-hidden">
                  <div className={`w-4 h-4 mr-2 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity flex-shrink-0`}>
                      {tab.searchState.favicon ? (
                        <img src={tab.searchState.favicon} alt="icon" className="w-full h-full object-contain rounded-sm" />
                      ) : (
                        <TrustLogo className="w-full h-full" />
                      )}
                  </div>
                  <span className={`text-sm font-medium truncate tracking-wide ${isActive ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {tab.title}
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id, e);
                  }}
                  className={`p-0.5 rounded-md hover:bg-white/10 transition-colors ml-2 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X className="w-3 h-3 text-gray-500 hover:text-white" />
                </button>
              </div>
              {/* Connector to body for active tab */}
              {isActive && <div className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-[#0a0f26] z-20" />}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button 
          onClick={onNewTab}
          className="h-8 w-8 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors ml-1"
          title="New Tab"
        >
          <Plus className="w-4 h-4 text-gray-500 hover:text-gray-300" />
        </button>
      </div>

      {/* Address Bar Area */}
      <div className="h-14 bg-[#0a0f26] border-b border-white/5 flex items-center px-4 space-x-4 shadow-sm z-10 relative">
        <div className="flex space-x-3 text-gray-500">
            <ArrowLeft className="w-4 h-4 cursor-pointer hover:text-blue-400 transition-colors" />
            <ArrowRight className="w-4 h-4 cursor-pointer hover:text-blue-400 transition-colors opacity-50" />
            <RotateCcw className="w-4 h-4 cursor-pointer hover:text-blue-400 transition-colors ml-1" />
        </div>

        {/* URL Input Display */}
        <div 
          className="flex-1 h-9 bg-[#020410] rounded-lg border border-white/10 flex items-center px-4 relative group focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all overflow-hidden cursor-text"
          onClick={handleAddressBarClick}
        >
          {/* Left Icon */}
          {!isInputFocused && (
            <div className="mr-2.5 flex-shrink-0">
              {isWebUrl ? (
                currentFavicon ? (
                  <img src={currentFavicon} alt="site-icon" className="w-3.5 h-3.5 object-contain opacity-80" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                )
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              )}
            </div>
          )}
          
          {/* Input / Display */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
              {isInputFocused ? (
                  <input 
                    ref={inputRef}
                    className="w-full bg-transparent border-none text-white text-sm focus:outline-none font-mono placeholder-gray-700"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Search Trust Graph or enter address"
                    autoComplete="off"
                  />
              ) : (
                  <div className="flex items-center text-sm tracking-wide truncate w-full">
                  {isWebUrl ? (
                    <span className="text-gray-300 font-mono">{displayUrl}</span>
                  ) : (
                    <>
                      <span className="text-blue-400/60 font-mono selection:bg-blue-500/30">trust://</span>
                      <span className="text-gray-400 font-mono ml-0.5 selection:bg-blue-500/30">{displayUrl.replace('trust://', '')}</span>
                    </>
                  )}
                </div>
              )}
          </div>
          
          {/* Right side icons in search bar (only show when not typing) */}
          {!isInputFocused && (
            <div className="absolute right-3 flex items-center space-x-2 pointer-events-none">
                {isWebUrl && <Globe className="w-3.5 h-3.5 text-gray-600" />}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4 pl-2 border-l border-white/5">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs text-gray-500 font-medium leading-none">Connected</span>
              <span className="text-xs text-blue-500 font-bold leading-tight">{(import.meta.env.VITE_DKG_ENVIRONMENT || 'testnet').toUpperCase() === 'MAINNET' ? 'DKG Mainnet' : 'DKG Testnet'}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={connectWallet}
                className="px-3 h-9 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center space-x-2"
                title={walletAddress ? walletAddress : 'Connect Wallet'}
              >
                <Wallet className="w-4 h-4" />
                <span>{walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}</span>
              </button>
              {walletAddress && (
                <div className="px-2 h-9 rounded-md bg-white/5 border border-white/10 text-sm text-gray-300 flex items-center" title="TRAC Testnet Balance">
                  <span className="font-mono" id="trac-balance">— TRAC</span>
                </div>
              )}
              {walletAddress && (
                <button
                  onClick={disconnectWallet}
                  className="px-2 h-9 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-200 text-sm border border-red-500/30 flex items-center"
                  title="Disconnect Wallet"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {walletAddress && (
                <div 
                  className="flex items-center space-x-3 cursor-pointer group"
                  onClick={onOpenLeaderboard}
                >
                  <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-400">Rank</div>
                      <div className="text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors">View</div>
                </div>
                </div>
              )}
            </div>

            <MoreVertical className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Browser Viewport (Content) - where children are injected */}
      <div className="flex-1 bg-[#020410] relative overflow-hidden flex flex-col">
          {children}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          ref={contextMenuRef}
          className="fixed z-50 w-64 bg-[#0a0f26]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-sm font-semibold text-white tracking-wide">Tab History</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {getTabHistory(contextMenu.tabId).length > 0 ? (
              getTabHistory(contextMenu.tabId).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryItemClick(item)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-md transition-colors flex items-center justify-between group"
                >
                  <div className="flex flex-col truncate pr-2">
                    <div className="flex items-center space-x-2">
                        {item.favicon && <img src={item.favicon} alt="" className="w-3 h-3 object-contain opacity-70" />}
                        <span className="text-sm text-gray-300 truncate group-hover:text-white font-medium">{item.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 truncate font-mono pl-5">{item.url || item.query}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                No history for this tab
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};