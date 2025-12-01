
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { streamDefinition, streamImageDescription } from './services/aiService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import HistoryBar from './components/HistoryBar';

import SettingsModal from './components/SettingsModal';
import FavoritesModal from './components/FavoritesModal';

// --- Types ---
export interface HistoryItem {
  id: string; // timestamp
  label: string; // The topic name
  type: 'text' | 'image';
  file?: File; // Only if type is image (for historical reference, though logic uses rootImage mostly)
  content?: string; // Cached content to prevent re-fetching
}

const App: React.FC = () => {
  // --- State: API Key ---
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>(() => {
    return localStorage.getItem('openrouter_api_key') || '';
  });
  const [cerebrasApiKey, setCerebrasApiKey] = useState<string>(() => {
    return localStorage.getItem('cerebras_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('selected_model') || 'gemini';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  // --- State: History & Navigation ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // --- State: Persistent Root Image (The "Reason" everything is connected) ---
  const [rootImage, setRootImage] = useState<File | null>(null);
  const [rootImageUrl, setRootImageUrl] = useState<string | null>(null);

  // Computed current item
  const currentItem = currentIndex >= 0 ? history[currentIndex] : null;

  // --- State: Content Generation ---
  // We derive 'content' directly from the current history item to support background streaming.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We use a ref to track active streams if we ever want to cancel them, 
  // but for now we let them run to support background streaming.
  // const isCancelled = useRef<boolean>(false); 

  // --- Helpers ---
  const updateHistoryContent = useCallback((index: number, text: string) => {
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[index]) {
        newHistory[index] = { ...newHistory[index], content: text };
      }
      return newHistory;
    });
  }, []);

  // --- Favorites Logic ---
  const checkFavoriteStatus = useCallback(async (label: string) => {
    try {
      const res = await fetch(`/api/favorites/check/${encodeURIComponent(label)}`);
      const data = await res.json();
      setIsFavorite(data.isFavorite);
      if (data.favorite) {
        setFavoriteId(data.favorite.id);
      } else {
        setFavoriteId(null);
      }
    } catch (err) {
      console.error('Failed to check favorite status', err);
    }
  }, []);

  const toggleFavorite = async () => {
    if (!currentItem) return;

    try {
      if (isFavorite) {
        // Remove
        const idToDelete = favoriteId;
        if (idToDelete) {
          await fetch(`/api/favorites/${idToDelete}`, { method: 'DELETE' });
          setIsFavorite(false);
          setFavoriteId(null);
        } else {
          // Fallback if ID is missing
          const res = await fetch(`/api/favorites/check/${encodeURIComponent(currentItem.label)}`);
          const data = await res.json();
          if (data.favorite) {
            await fetch(`/api/favorites/${data.favorite.id}`, { method: 'DELETE' });
            setIsFavorite(false);
            setFavoriteId(null);
          }
        }
      } else {
        // Add
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: currentItem.label,
            content: currentItem.content,
            type: currentItem.type
          })
        });
        if (res.ok) {
          const newFav = await res.json();
          if (newFav && newFav.id) {
            setIsFavorite(true);
            setFavoriteId(newFav.id);
          }
        } else {
          console.error('Failed to add favorite');
          let errorMessage = 'Failed to save favorite.';
          try {
            const errorData = await res.json();
            if (errorData && errorData.error) {
              errorMessage += ` Server says: ${errorData.error}`;
            }
          } catch (e) {
            errorMessage += ' Could not parse server error.';
          }
          alert(`${errorMessage}\n\nCheck Netlify Logs if this persists.`);
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      alert('Error saving favorite. Check console for details.');
    }
  };

  // Check status when item changes
  useEffect(() => {
    if (currentItem) {
      checkFavoriteStatus(currentItem.label);
    } else {
      setIsFavorite(false);
      setFavoriteId(null);
    }
  }, [currentItem, checkFavoriteStatus]);

  const handleApiKeySave = (key: string, openRouterKey: string, cerebrasKey: string, model: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);

    setOpenRouterApiKey(openRouterKey);
    localStorage.setItem('openrouter_api_key', openRouterKey);

    setCerebrasApiKey(cerebrasKey);
    localStorage.setItem('cerebras_api_key', cerebrasKey);

    setSelectedModel(model);
    localStorage.setItem('selected_model', model);

    setIsSettingsOpen(false);
  };

  // --- Streaming Logic ---
  const startStreaming = async (item: HistoryItem, index: number, forceActive: boolean = false) => {
    // Only set loading/error state if this is the currently viewed item OR if we are forcing it (e.g. new search)
    if (index === currentIndex || forceActive) {
      setIsLoading(true);
      setError(null);
    }

    let accumulatedContent = '';
    try {
      const streamSource = item.type === 'image' && item.file
        ? streamImageDescription(item.file, apiKey)
        : streamDefinition(item.label, apiKey, openRouterApiKey, cerebrasApiKey, selectedModel);

      for await (const chunk of streamSource) {
        if (chunk.startsWith('Error:')) throw new Error(chunk);
        accumulatedContent += chunk;
        updateHistoryContent(index, accumulatedContent);
      }

      // Final update to ensure everything is captured
      updateHistoryContent(index, accumulatedContent);

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      // Only set main error if this is the current item
      if (index === currentIndex) {
        setError(errorMessage);
      }
      updateHistoryContent(index, `Error: ${errorMessage}`);

      if (errorMessage.includes('API_KEY') || errorMessage.includes('API Key')) {
        setIsSettingsOpen(true);
      }
    } finally {
      if (index === currentIndex) {
        setIsLoading(false);
      }
    }
  };

  const addItemAndStream = (newItem: HistoryItem) => {
    // 1. Add to history
    // We need to calculate the new index based on *current* state
    // Note: This assumes we are appending to the *end* of the current history stack (truncating forward history)
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newItem);
      const newIndex = newHistory.length - 1;
      setCurrentIndex(newIndex);
      // 2. Start streaming for this specific item and index
      // We pass forceActive=true because we just set the index to this item
      startStreaming(newItem, newIndex, true);
      return newHistory;
    });
  };

  // --- Cleanup for Object URL ---
  useEffect(() => {
    return () => {
      if (rootImageUrl) URL.revokeObjectURL(rootImageUrl);
    };
  }, [rootImageUrl]);

  // --- Event Handlers ---

  const handleWordClick = useCallback((word: string) => {
    const newLabel = word.trim();
    if (!currentItem || newLabel.toLowerCase() !== currentItem.label.toLowerCase()) {
      addItemAndStream({
        id: Date.now().toString(),
        label: newLabel,
        type: 'text'
      });
    }
  }, [currentItem, currentIndex, apiKey, openRouterApiKey, cerebrasApiKey, selectedModel]);

  const handleSearch = useCallback((query: string, savedContent?: string, savedType?: 'text' | 'image') => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      label: query,
      type: savedType || 'text',
      content: savedContent
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newItem);
      const newIndex = newHistory.length - 1;
      setCurrentIndex(newIndex);

      // Only stream if we DON'T have saved content
      if (!savedContent) {
        startStreaming(newItem, newIndex, true);
      }

      return newHistory;
    });
  }, [currentIndex, apiKey, openRouterApiKey, cerebrasApiKey, selectedModel]);

  const handleImageUpload = useCallback((file: File) => {
    // 1. Set the root image which triggers the Split View
    setRootImage(file);
    const url = URL.createObjectURL(file);
    setRootImageUrl(url);

    // 2. Add the initial analysis to history
    addItemAndStream({
      id: Date.now().toString(),
      label: 'Visual Analysis',
      type: 'image',
      file: file
    });
  }, [currentIndex, apiKey]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRandom = useCallback(() => {
    const concepts = ['Paradox', 'Entropy', 'Recursion', 'Silence', 'Chaos', 'Void'];
    const randomWord = concepts[Math.floor(Math.random() * concepts.length)];
    addItemAndStream({
      id: Date.now().toString(),
      label: randomWord,
      type: 'text'
    });
  }, [currentIndex, apiKey, openRouterApiKey, cerebrasApiKey, selectedModel]);

  const handleHistoryJump = (index: number) => {
    setCurrentIndex(index);
    // Update loading state based on the target item
    const item = history[index];
    if (item && (!item.content || item.content.length === 0)) {
      // It might be streaming in background, or just empty. 
      // Since we don't track background loading state per item in this simple version,
      // we might not show a spinner if we jump back to a streaming item.
      // But the content will update live.
      // For now, we assume if content is empty, it's loading or errored.
      // If it's currently streaming, isLoading will be true.
      // If it's not streaming and content is empty, it means it hasn't started or errored.
      // We can re-trigger streaming if needed, but for now, we rely on the background stream.
      // If we jump to an item that hasn't started streaming yet, we should start it.
      // This is a simplification for now.
      // For a more robust solution, each history item would need its own loading/error state.
      setIsLoading(true); // Assume loading if content is empty
      setError(null); // Clear error when jumping
      startStreaming(item, index); // Re-trigger stream if content is empty
    } else {
      setIsLoading(false); // Not loading if content is already there
      setError(null); // Clear error when jumping
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(false); // Clear loading state when navigating
      setError(null); // Clear error state when navigating
    }
  };

  const handleForward = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(false); // Clear loading state when navigating
      setError(null); // Clear error state when navigating
    }
  };

  const handleHome = () => {
    // Strict confirmation dialog
    if (window.confirm("WARNING: RESET TERMINAL?\n\nThis will wipe the current session, clear all history, and remove the uploaded image.")) {
      setHistory([]);
      setCurrentIndex(-1);
      setRootImage(null);
      if (rootImageUrl) URL.revokeObjectURL(rootImageUrl);
      setRootImageUrl(null);
      // Ensure completely fresh state
      setError(null);
      setIsLoading(false);
    }
  };

  return (
    <>
      {isSettingsOpen && (
        <SettingsModal
          currentKey={apiKey}
          currentOpenRouterKey={openRouterApiKey}
          currentCerebrasKey={cerebrasApiKey}
          currentModel={selectedModel}
          onSave={handleApiKeySave}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isFavoritesOpen && (
        <FavoritesModal
          onClose={() => setIsFavoritesOpen(false)}
          onSelect={(fav) => handleSearch(fav.label, fav.content, fav.type as 'text' | 'image')}
        />
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <div className="app-header">
        <SearchBar
          onSearch={handleSearch}
          onRandom={handleRandom}
          onImageUpload={handleImageUpload}
          onSettings={() => setIsSettingsOpen(true)}
          onFavorites={() => setIsFavoritesOpen(true)}
          isLoading={isLoading}
          canGoBack={currentIndex > 0}
          canGoForward={currentIndex < history.length - 1}
          onBack={handleBack}
          onForward={handleForward}
          onHome={handleHome}
        />

        {history.length > 0 && (
          <HistoryBar
            history={history}
            currentIndex={currentIndex}
            onJump={handleHistoryJump}
          />
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      {history.length === 0 ? (
        // --- EMPTY STATE ---
        <div className="initial-prompt">
          <h1 style={{ marginBottom: '2rem' }}>VISUAL LEARNING TERMINAL</h1>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button onClick={() => fileInputRef.current?.click()}>
              [ UPLOAD IMAGE ]
            </button>
            <button onClick={handleRandom} style={{ fontSize: '1.2rem', padding: '1rem' }}>
              [ RANDOM CONCEPT ]
            </button>
          </div>
          <p style={{ marginTop: '2rem', maxWidth: '40ch', opacity: 0.7 }}>
            Upload an image to extract its essence, or search to begin a text session.
          </p>
        </div>
      ) : rootImage ? (
        // --- SPLIT VIEW (IMAGE ACTIVE) ---
        <div className="layout-split">
          <div className="pane-image">
            {rootImageUrl && <img src={rootImageUrl} alt="Source Analysis" />}
          </div>
          <div className="pane-content">
            <h2 style={{ marginBottom: '2rem', textTransform: 'uppercase', borderBottom: '2px solid white', display: 'inline-block' }}>
              {currentItem?.label}
            </h2>

            {error && <ErrorDisplay error={error} />}
            {isLoading && (!currentItem?.content || currentItem.content.length < 20) && !error && <LoadingSkeleton />}
            {currentItem?.content && currentItem.content.length >= 20 && !error && (
              <ContentDisplay
                content={currentItem.content}
                isLoading={isLoading}
                onWordClick={handleWordClick}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </div>
        </div>
      ) : (
        // --- CENTERED VIEW (TEXT ONLY) ---
        <div className="layout-centered-wrapper">
          <div className="layout-centered">
            <h2 style={{ marginBottom: '2rem', textTransform: 'uppercase', borderBottom: '2px solid white', display: 'inline-block' }}>
              {currentItem?.label}
            </h2>

            {error && <ErrorDisplay error={error} />}
            {isLoading && (!currentItem?.content || currentItem.content.length < 20) && !error && <LoadingSkeleton />}
            {currentItem?.content && currentItem.content.length >= 20 && !error && (
              <ContentDisplay
                content={currentItem.content}
                isLoading={isLoading}
                onWordClick={handleWordClick}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <div style={{ border: '2px solid white', padding: '1rem', color: 'white', marginBottom: '1rem' }}>
    <p style={{ margin: 0, fontWeight: 'bold' }}>SYSTEM ERROR</p>
    <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
  </div>
);

export default App;