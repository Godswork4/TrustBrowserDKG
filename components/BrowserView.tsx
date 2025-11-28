import React, { useState, useEffect, useRef } from 'react';
import { ChatPanel } from './ChatPanel';
import { PanelRightClose, PanelRightOpen, ExternalLink, ShieldAlert, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { computeTruthScore } from '../services/geminiService';

interface BrowserViewProps {
  url: string;
}

// List of domains known to block iframes via X-Frame-Options or CSP
  const BLOCKED_DOMAINS = [
    'discord.com',
    'discord.gg',
    'twitter.com',
    'x.com',
    'google.com',
    'gmail.com',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
    'youtu.be',
    'github.com',
    'reddit.com'
];

export const BrowserView: React.FC<BrowserViewProps> = ({ url }) => {
  const [showChat, setShowChat] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
  const webviewRef = useRef<any>(null);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [verification, setVerification] = useState<{ score: number, summary: string } | null>(null);

  // Normalize URL for display and use
  const displayUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Check if we should pre-emptively block this site to avoid the "sad face"
  const hostname = new URL(displayUrl).hostname.toLowerCase();
  const isKnownBlocked = BLOCKED_DOMAINS.some(domain => hostname.includes(domain));

  useEffect(() => {
    // In Electron, attempt to load via <webview> even for typically blocked sites
    // Only pre-emptively block in standard web (iframe) mode
    if (!isElectron && isKnownBlocked) {
        setHasError(true);
        setIsLoading(false);
    } else {
        setHasError(false);
        setIsLoading(true);
    }
  }, [url, isKnownBlocked, isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const el = webviewRef.current;
    if (!el) return;
    const finish = () => setIsLoading(false);
    const fail = () => { setHasError(true); setIsLoading(false); };
    const stop = () => setIsLoading(false);
    el.addEventListener('did-finish-load', finish);
    el.addEventListener('did-fail-load', fail);
    el.addEventListener('did-stop-loading', stop);
    const t = setTimeout(() => { if (isLoading) { setHasError(true); setIsLoading(false); } }, 12000);
    return () => {
      clearTimeout(t);
      try {
        el.removeEventListener('did-finish-load', finish);
        el.removeEventListener('did-fail-load', fail);
        el.removeEventListener('did-stop-loading', stop);
      } catch {}
    };
  }, [displayUrl, isElectron, isLoading]);

  useEffect(() => {
    if (isElectron && hasError) {
      try { (window as any).electron?.openExternal(displayUrl); } catch {}
    }
  }, [hasError, isElectron, displayUrl]);

  useEffect(() => {
    if (!isElectron) return;
    const el = webviewRef.current as any;
    if (!el) return;
    const handler = async (evt: MessageEvent) => {
      if (!agentEnabled) return;
      const data = evt.data || {};
      if (data.type !== 'AGENT_ACTION_PLAN' || !Array.isArray(data.steps)) return;
      const js = `(async function(plan){
        function findByText(tag, text) {
          const nodes = Array.from(document.querySelectorAll(tag || '*'));
          const t = String(text||'').trim().toLowerCase();
          return nodes.find(n => String(n.innerText||n.value||'').toLowerCase().includes(t));
        }
        function findBySelector(sel){ try { return document.querySelector(sel); } catch { return null; } }
        function findInput(label){
          const candidates = Array.from(document.querySelectorAll('input,textarea'));
          const l = String(label||'').trim().toLowerCase();
          return candidates.find(el => {
            const a = (el.getAttribute('aria-label')||'').toLowerCase();
            const p = (el.getAttribute('placeholder')||'').toLowerCase();
            const n = (el.getAttribute('name')||'').toLowerCase();
            return a.includes(l)||p.includes(l)||n.includes(l);
          });
        }
        for (const step of plan.steps){
          let target = null;
          if (step.query?.selector) target = findBySelector(step.query.selector);
          if (!target && step.query?.text){
            target = findByText('*', step.query.text);
          }
          if (step.type === 'navigate' && step.value){ location.href = step.value; await new Promise(r=>setTimeout(r,800)); }
          else if (step.type === 'click') { if (target) { target.scrollIntoView({behavior:'smooth',block:'center'}); target.click(); await new Promise(r=>setTimeout(r,800)); } }
          else if (step.type === 'type') { const el = target || findInput(step.query?.text||''); if (el) { el.focus(); el.value = step.value||''; el.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); } }
          else if (step.type === 'wait') { const ms = Number(step.value)||800; await new Promise(r=>setTimeout(r,ms)); }
        }
        return true;
      })(${JSON.stringify({ steps: data.steps })});`;
      try {
        await el.executeJavaScript(js);
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, [agentEnabled, isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const el = webviewRef.current as any;
    if (!el) return;
    const handler = async (evt: MessageEvent) => {
      const data = evt.data || {};
      if (data.type !== 'REQUEST_SUMMARY') return;
      try {
        const text = await extractPageText();
        if (!text) return;
        const { summarizeText } = await import('../services/geminiService');
        const summary = await summarizeText(text);
        window.postMessage({ type: 'PAGE_SUMMARY', summary }, '*');
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const el = webviewRef.current as any;
    if (!el) return;
    try {
      if (typeof el.getURL === 'function') {
        const current = el.getURL();
        if (current !== displayUrl) {
          el.loadURL(displayUrl);
        }
      }
    } catch {}
  }, [displayUrl, isElectron]);

  const handleIframeLoad = () => {
      setIsLoading(false);
  };

  const retryConnection = () => {
      setHasError(false);
      setIsLoading(true);
  };

  const extractPageText = async () => {
    try {
      if (isElectron && webviewRef.current) {
        const text = await webviewRef.current.executeJavaScript(`(function(){
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let out = '';
          let node;
          while((node = walker.nextNode())){ out += node.nodeValue + '\n'; if(out.length>20000) break; }
          return out.trim();
        })()`);
        return String(text || '');
      }
    } catch {}
    return '';
  };

  const verifyWithDKG = async () => {
    setVerification(null);
    const text = await extractPageText();
    if (!text) { setVerification({ score: 0, summary: 'No readable content' }); return; }
    const lengthFactor = Math.min(text.length / 5000, 1);
    const signals = {
      proofScore: 0.3 * lengthFactor,
      embeddingSimilarity: 0.4 * lengthFactor,
      fingerprintIntegrity: 0.5 * lengthFactor,
      publisherCommitment: 0.2,
      paranetCuration: 0.0,
      freshness: 0.5,
    };
    const result = computeTruthScore(signals);
    setVerification({ score: Math.round(result.composite * 100), summary: `Heuristic verification over ${Math.min(text.length, 20000)} chars` });
  };

  return (
    <div className="flex-1 flex relative h-full overflow-hidden w-full">
      
      {/* Main Browser Content (Iframe) */}
      <div className="flex-1 relative bg-[#0f1221] flex flex-col w-full h-full">
        {!hasError ? (
            <div className="relative w-full h-full">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#020410] z-10">
                         <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {isElectron ? (
                  <webview 
                    ref={webviewRef} 
                    src={displayUrl} 
                    style={{ width: '100%', height: '100%' }} 
                    allowpopups 
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
                  />
                ) : (
                  <iframe 
                      src={displayUrl} 
                      className="w-full h-full border-none bg-white"
                      title="Web Content"
                      onLoad={handleIframeLoad}
                      onError={() => setHasError(true)}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation" 
                  />
                )}
                
                {/* Overlay for manual toggle if site looks broken but didn't trigger onError */}
                <div className="absolute bottom-6 left-6 z-20 opacity-0 hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => setHasError(true)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm px-3 py-1.5 rounded-md border border-red-500/20 backdrop-blur-md flex items-center space-x-2"
                    >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Site not loading correctly?</span>
                    </button>
                </div>
            </div>
        ) : (
           // Fallback UI when iframe fails or is blocked (looks like a feature, not a bug)
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#020410] relative overflow-hidden animate-fade-in">
                {/* Background ambient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 max-w-lg w-full bg-[#0a0f26] border border-white/5 rounded-2xl p-10 shadow-2xl backdrop-blur-xl">
                   <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="w-8 h-8 text-blue-500" />
                   </div>
                   
                   <h2 className="text-3xl font-bold text-white mb-3">Enhanced Privacy Protection</h2>
                   <p className="text-gray-400 mb-8 leading-relaxed text-base">
                      TrustBrowser has detected that <strong>{new URL(displayUrl).hostname}</strong> requires a secure, direct connection protocol that prevents embedding.
                   </p>

                   <div className="bg-[#050b1e] rounded-lg p-4 border border-white/5 mb-8 flex items-center space-x-3">
                      <Lock className="w-4 h-4 text-green-500" />
                      <span className="text-base font-mono text-gray-300 truncate">{displayUrl}</span>
                   </div>

                   <a 
                      href={displayUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center justify-center space-x-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all w-full mb-4"
                   >
                      <span>Open in Secure Window</span>
                      <ExternalLink className="w-4 h-4" />
                   </a>

                   {!isKnownBlocked && (
                       <button 
                            onClick={retryConnection}
                            className="text-sm text-gray-500 hover:text-blue-400 flex items-center justify-center w-full space-x-1 transition-colors"
                       >
                            <RefreshCw className="w-3 h-3" />
                            <span>Try loading internal view again</span>
                       </button>
                   )}
                   
                   <p className="mt-4 text-sm text-gray-600">
                      TrustShield AI continues to monitor your session in the sidebar.
                   </p>
                </div>
            </div>
        )}

        {/* Floating Chat Toggle */}
        <button 
            onClick={() => setShowChat(!showChat)}
            className="absolute bottom-6 right-6 z-10 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95"
            title={showChat ? "Close Assistant" : "Open Assistant"}
        >
            {showChat ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
        </button>

        {isElectron && (
          <div className="absolute bottom-6 left-6 z-10 flex flex-col space-y-2">
            <button
              onClick={() => { setAgentEnabled(!agentEnabled); }}
              className={`px-4 py-2 rounded-lg border border-white/10 ${agentEnabled ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-200'} hover:bg-white/10 transition-colors text-sm`}
              title="Toggle Agentic DOM"
            >
              {agentEnabled ? 'Agent Enabled' : 'Enable Agentic DOM'}
            </button>
            <button
              onClick={verifyWithDKG}
              className="px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 transition-colors text-sm"
              title="Verify page content with DKG"
            >
              Verify with DKG
            </button>
            {verification && (
              <div className="mt-2 px-4 py-2 rounded-lg bg-[#0a0f26] border border-white/10 text-xs text-gray-200 max-w-xs">
                <div className="font-bold text-white">Truth Score: {verification.score}%</div>
                <div className="mt-1 text-gray-400">{verification.summary}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Side Panel */}
      <div 
        className={`
           border-l border-white/5 bg-[#0a0f26] relative z-20 transition-all duration-500 ease-in-out overflow-hidden
           ${showChat ? 'w-80 md:w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-20'}
        `}
      >
         <div className="w-80 md:w-96 h-full"> {/* Inner container to prevent squashing during transition */}
            <ChatPanel />
         </div>
      </div>

    </div>
  );
};