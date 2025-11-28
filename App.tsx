import React, { useState, useEffect } from 'react';
import { AppPhase, SearchState, Tab, HistoryItem } from './types';
import { queryDKGNode } from './services/geminiService';
import { IntroAnimation } from './components/IntroAnimation';
import { BrowserFrame } from './components/BrowserFrame';
import { LandingView } from './components/LandingView';
import { LoadingView } from './components/LoadingView';
import { ResponseView } from './components/ResponseView';
import { BrowserView } from './components/BrowserView';
import { LeaderboardView } from './components/LeaderboardView';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  
  // Initialize with one tab
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'tab-1',
      title: 'New Tab',
      phase: AppPhase.LANDING,
      searchState: {
        query: '',
        isSearching: false,
        data: null,
        url: undefined
      },
      history: [],
      timestamp: Date.now()
    }
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const createNewTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      title: 'New Tab',
      phase: AppPhase.LANDING,
      searchState: {
        query: '',
        isSearching: false,
        data: null,
        url: undefined
      },
      history: [],
      timestamp: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't close the last tab, just reset it
    if (tabs.length === 1) {
      updateTab(id, {
        title: 'New Tab',
        phase: AppPhase.LANDING,
        searchState: { query: '', isSearching: false, data: null, url: undefined, favicon: undefined },
        history: [] // Reset history for the "last" tab if closed
      });
      return;
    }

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    // If we closed the active tab, switch to the last available tab
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      const data = evt.data || {};
      if (data.type === 'NEW_TAB') {
        createNewTab();
      }
      if (data.type === 'SEARCH_QUERY' && typeof data.query === 'string') {
        handleSearch(data.query);
      }
    };
    window.addEventListener('message', handler);
    return () => { window.removeEventListener('message', handler); };
  }, [tabs, activeTabId]);

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    ));
  };

  const addToHistory = (tabId: string, item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      
      const newItem: HistoryItem = {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
      
      // Keep last 20 items
      const newHistory = [newItem, ...tab.history].slice(0, 20);
      return { ...tab, history: newHistory };
    }));
  };

  const handleHistorySelect = (tabId: string, item: HistoryItem) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Restore state based on history item
    if (item.phase === AppPhase.BROWSER_VIEW && item.url) {
      updateTab(tabId, {
        title: item.title,
        phase: AppPhase.BROWSER_VIEW,
        searchState: {
          ...tab.searchState,
          url: item.url,
          query: item.url,
          favicon: item.favicon
        }
      });
    } else if (item.phase === AppPhase.RESPONSE && item.query) {
      handleSearch(item.query); 
    } else if (item.phase === AppPhase.LEADERBOARD) {
        updateTab(tabId, {
            title: 'Leaderboard',
            phase: AppPhase.LEADERBOARD
        });
    }
  };

  const handleSearch = async (query: string) => {
    // Determine if query is a URL
    const urlRegex = /^(https?:\/\/)|(www\.)|(\.[a-z]{2,}(\/.*)?)$/i;
    const isUrl = urlRegex.test(query);
    const currentTab = tabs.find(t => t.id === activeTabId);

    if (!currentTab) return;

    if (isUrl) {
      let formattedUrl = query;
      if (!/^https?:\/\//i.test(query)) {
        formattedUrl = 'https://' + query;
      }
      
      let host = '';
      try {
        host = new URL(formattedUrl).hostname;
      } catch (e) {
        host = formattedUrl; // Fallback
      }

      // Generate Favicon URL using Google's service
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;

      // Add to history
      addToHistory(activeTabId, {
        title: host,
        url: formattedUrl,
        phase: AppPhase.BROWSER_VIEW,
        favicon: faviconUrl
      });

      updateTab(activeTabId, {
        title: host,
        phase: AppPhase.LOADING,
        searchState: { 
          ...currentTab.searchState, 
          query, 
          url: formattedUrl, 
          favicon: faviconUrl,
          isSearching: true 
        }
      });
      return;
    }

    // Standard DKG Query
    // Add to history
    addToHistory(activeTabId, {
        title: query,
        query: query,
        phase: AppPhase.RESPONSE
    });

    updateTab(activeTabId, {
      title: query,
      phase: AppPhase.LOADING,
      searchState: { ...currentTab.searchState, query, isSearching: true }
    });

    // Query DKG; fallback to AI when DKG returns nothing
    const data = await queryDKGNode(query);

    updateTab(activeTabId, {
      searchState: { ...currentTab.searchState, data, isSearching: false }
    });
  };

  const handleLoadingComplete = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.searchState.url) {
      updateTab(tabId, { phase: AppPhase.BROWSER_VIEW });
    } else {
      updateTab(tabId, { phase: AppPhase.RESPONSE });
    }
  };

  const openLeaderboard = () => {
    // Check if there is already a leaderboard tab
    const existingLeaderboardTab = tabs.find(t => t.phase === AppPhase.LEADERBOARD);
    
    if (existingLeaderboardTab) {
      setActiveTabId(existingLeaderboardTab.id);
      return;
    }

    // If current tab is new/empty, use it. Otherwise create new.
    const currentTab = tabs.find(t => t.id === activeTabId);
    
    if (currentTab && currentTab.phase === AppPhase.LANDING && !currentTab.searchState.query) {
        updateTab(activeTabId, {
            title: 'Leaderboard',
            phase: AppPhase.LEADERBOARD
        });
        addToHistory(activeTabId, {
            title: 'Leaderboard',
            phase: AppPhase.LEADERBOARD
        });
    } else {
        const newTabId = `tab-${Date.now()}`;
        const newTab: Tab = {
          id: newTabId,
          title: 'Leaderboard',
          phase: AppPhase.LEADERBOARD,
          searchState: {
            query: '',
            isSearching: false,
            data: null,
            url: undefined
          },
          history: [{
             id: 'init-lb',
             title: 'Leaderboard',
             phase: AppPhase.LEADERBOARD,
             timestamp: Date.now()
          }],
          timestamp: Date.now()
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
    }
  };

  return (
    <div className="font-sans antialiased text-white selection:bg-blue-500/30 w-screen h-screen overflow-hidden bg-[#020410]">
      
      {/* 1. Intro Overlay */}
      {showIntro && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}

      {/* 2. Main Browser Interface */}
      <BrowserFrame 
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={setActiveTabId}
        onCloseTab={closeTab}
        onNewTab={createNewTab}
        onOpenLeaderboard={openLeaderboard}
        onHistorySelect={handleHistorySelect}
        onSearch={handleSearch}
      >
        
        {/* Render ALL tabs to preserve state, toggle visibility via CSS */}
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className="w-full h-full"
            style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
          >
            {tab.phase === AppPhase.LANDING && (
              <LandingView onSearch={handleSearch} onOpenProfile={openLeaderboard} />
            )}

            {tab.phase === AppPhase.LOADING && (
              <LoadingView onLoadComplete={() => handleLoadingComplete(tab.id)} />
            )}

            {tab.phase === AppPhase.RESPONSE && (
              <ResponseView data={tab.searchState.data} query={tab.searchState.query} />
            )}

            {tab.phase === AppPhase.BROWSER_VIEW && tab.searchState.url && (
              <BrowserView url={tab.searchState.url} />
            )}

            {tab.phase === AppPhase.LEADERBOARD && (
              <LeaderboardView />
            )}
          </div>
        ))}

      </BrowserFrame>
    </div>
  );
};

export default App;