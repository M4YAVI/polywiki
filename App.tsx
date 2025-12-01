
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { streamDefinition, streamImageDescription } from './services/aiService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import HistoryBar from './components/HistoryBar';
import SettingsModal from './components/SettingsModal';

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

  // --- State: History & Navigation ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // --- State: Persistent Root Image (The "Reason" everything is connected) ---
  const [rootImage, setRootImage] = useState<File | null>(null);
  const [rootImageUrl, setRootImageUrl] = useState<string | null>(null);

  // Computed current item
  const currentItem = currentIndex >= 0 ? history[currentIndex] : null;

  // --- State: Content Generation ---
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const addToHistory = (newItem: HistoryItem) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newItem);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const updateHistoryContent = useCallback((index: number, text: string) => {
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[index]) {
        newHistory[index] = { ...newHistory[index], content: text };
      }
      return newHistory;
    });
  }, []);

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

  // --- Cleanup for Object URL ---
  useEffect(() => {
    return () => {
      if (rootImageUrl) URL.revokeObjectURL(rootImageUrl);
    };
  }, [rootImageUrl]);

  // --- Main Effect: Fetch Content ---
  useEffect(() => {
    if (!currentItem) return;

    // 1. Check Cache
    if (currentItem.content) {
      setContent(currentItem.content);
      setIsLoading(false);
      setError(null);
      return;
    }

    // 2. If no cache, fetch fresh content
    let isCancelled = false;

    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      setContent('');

      let accumulatedContent = '';
      try {
        // If it's an image type item, we use the streamImageDescription
        // NOTE: Even if we have a rootImage, if the history item is text (clicked word), we fetch definition.
        // We only fetch image description if the history item specifically says it's the image analysis step.
        const streamSource = currentItem.type === 'image' && currentItem.file
          ? streamImageDescription(currentItem.file, apiKey)
          : streamDefinition(currentItem.label, apiKey, openRouterApiKey, cerebrasApiKey, selectedModel);

        for await (const chunk of streamSource) {
          if (isCancelled) break;
          if (chunk.startsWith('Error:')) throw new Error(chunk);
          accumulatedContent += chunk;
          if (!isCancelled) setContent(accumulatedContent);
        }

        // Cache the result if successful and not cancelled
        if (!isCancelled) {
          updateHistoryContent(currentIndex, accumulatedContent);
        }

      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(errorMessage);

          if (errorMessage.includes('API_KEY') || errorMessage.includes('API Key')) {
            setIsSettingsOpen(true);
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchContent();

    return () => { isCancelled = true; };
  }, [currentItem, apiKey, currentIndex, updateHistoryContent]);

  // --- Event Handlers ---

  const handleWordClick = useCallback((word: string) => {
    const newLabel = word.trim();
    if (!currentItem || newLabel.toLowerCase() !== currentItem.label.toLowerCase()) {
      addToHistory({
        id: Date.now().toString(),
        label: newLabel,
        type: 'text'
      });
    }
  }, [currentItem, history, currentIndex]);

  const handleSearch = useCallback((query: string) => {
    addToHistory({
      id: Date.now().toString(),
      label: query,
      type: 'text'
    });
  }, [history, currentIndex]);

  const handleImageUpload = useCallback((file: File) => {
    // 1. Set the root image which triggers the Split View
    setRootImage(file);
    const url = URL.createObjectURL(file);
    setRootImageUrl(url);

    // 2. Add the initial analysis to history
    addToHistory({
      id: Date.now().toString(),
      label: 'Visual Analysis',
      type: 'image',
      file: file
    });
  }, [history, currentIndex]);

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
    addToHistory({
      id: Date.now().toString(),
      label: randomWord,
      type: 'text'
    });
  }, [history, currentIndex]);

  const handleHistoryJump = (index: number) => {
    setCurrentIndex(index);
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleForward = () => {
    if (currentIndex < history.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleHome = () => {
    // Strict confirmation dialog
    if (window.confirm("WARNING: RESET TERMINAL?\n\nThis will wipe the current session, clear all history, and remove the uploaded image.")) {
      setHistory([]);
      setCurrentIndex(-1);
      setContent('');
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
            {isLoading && content.length === 0 && !error && <LoadingSkeleton />}
            {content.length > 0 && !error && (
              <ContentDisplay content={content} isLoading={isLoading} onWordClick={handleWordClick} />
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
            {isLoading && content.length === 0 && !error && <LoadingSkeleton />}
            {content.length > 0 && !error && (
              <ContentDisplay content={content} isLoading={isLoading} onWordClick={handleWordClick} />
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
