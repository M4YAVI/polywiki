
import React, { useState, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  onImageUpload: (file: File) => void;
  onSettings: () => void;
  onFavorites: () => void;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onRandom,
  onImageUpload,
  onSettings,
  onFavorites,
  isLoading,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onHome
}) => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="search-container">
      {/* Navigation Controls */}
      <div className="nav-controls">
        <button onClick={onHome} className="nav-button" aria-label="Go Home" title="Reset (Clear History)">
          ⌂
        </button>
        <button onClick={onBack} disabled={!canGoBack} className="nav-button" aria-label="Go Back">
          ←
        </button>
        <button onClick={onForward} disabled={!canGoForward} className="nav-button" aria-label="Go Forward">
          →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="search-form" role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="search-input"
          aria-label="Search for a topic"
          disabled={isLoading}
        />
      </form>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <div className="search-actions">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="icon-button"
          disabled={isLoading}
          title="Upload Image"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <button onClick={onRandom} className="text-button" disabled={isLoading}>
          Random
        </button>

        <button
          onClick={onFavorites}
          className="icon-button"
          title="Favorites Database"
          aria-label="Favorites"
        >
          ♥
        </button>
        <button
          onClick={onSettings}
          className="icon-button"
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
