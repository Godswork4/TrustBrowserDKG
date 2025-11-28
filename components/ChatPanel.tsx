import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from '../types';
import { streamChatResponse, planDomActions } from '../services/geminiService';

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hello. I'm TrustShield. I can help you analyze this page or answer questions securely." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      const data = evt.data || {};
      if (data.type === 'PAGE_SUMMARY' && data.summary) {
        const aiMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: String(data.summary) }]);
      }
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, []);

  const detectIntent = (text: string): 'new_tab' | 'summarize' | 'signup' | null => {
    const t = text.toLowerCase();
    if (t.includes('new tab') || t.includes('open tab')) return 'new_tab';
    if (t.includes('summarize') || t.includes('summary')) return 'summarize';
    if (t.includes('create account') || t.includes('sign up') || t.includes('signup')) return 'signup';
    return null;
  };

  const handleAttachImage = async (file: File | null) => {
    if (!file) return;
    try {
      const { verifyImageAuthenticity } = await import('../services/geminiService');
      const res = await verifyImageAuthenticity(file);
      const msg = `Image check:\n- Hash: ${res.hash || 'n/a'}\n- Verdict: ${res.assessment || 'n/a'}\n- Confidence: ${Math.round((res.score || 0) * 100)}%${res.ual ? `\n- UAL: ${res.ual}` : ''}`;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: msg }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Unable to verify image authenticity right now.' }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Create a placeholder for AI response
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '' }]);

    try {
      const history = messages; // Current history before new message
      const stream = streamChatResponse(history, userMsg.text);
      
      let fullText = '';
      for await (const chunk of stream) {
        if (chunk) {
          fullText += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }
      const intent = detectIntent(userMsg.text);
      if (intent === 'new_tab') {
        try { window.postMessage({ type: 'NEW_TAB' }, '*'); } catch {}
      }
      if (intent === 'summarize') {
        try { window.postMessage({ type: 'REQUEST_SUMMARY' }, '*'); } catch {}
      }
      if (intent === 'signup') {
        const follow = "To help you sign up safely, please provide:\n- First name\n- Last name\n- Desired username/email\n- Password (we will not store it; used only to type in the page)\n- Recovery email/phone (optional).\n\nSay 'Use my details: ...' or answer step-by-step.";
        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: `${fullText}\n\n${follow}` } : msg));
      }
      const steps = await planDomActions(userMsg.text);
      if (steps && steps.length) {
        try { window.postMessage({ type: 'AGENT_ACTION_PLAN', steps }, '*'); } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 md:w-96 bg-[#0a0f26]/95 backdrop-blur-xl border-l border-white/5 flex flex-col h-full shadow-2xl relative z-20">
      
      {/* Header */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#050b1e]/60">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span className="text-base font-semibold text-blue-100 tracking-wide">Talk with Trust AI</span>
        </div>
        <div className="flex items-center">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAttachImage(e.target.files?.[0] || null)} />
          <button className="p-2 rounded-lg hover:bg-white/10 text-blue-300" title="Check image authenticity" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`
                max-w-[85%] rounded-2xl px-5 py-3.5 text-[0.95rem] leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white/5 text-gray-200 rounded-bl-sm border border-white/10'}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-3 rounded-bl-sm flex space-x-1 items-center">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#050b1e]/80 border-t border-white/5">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-[#020410] border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            placeholder="Ask TrustShield… e.g. ‘Open a new tab’, ‘Summarize’, ‘Create an account’"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400 disabled:opacity-50"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};