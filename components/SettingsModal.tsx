
import React, { useState } from 'react';

interface SettingsModalProps {
  currentKey: string;
  currentOpenRouterKey?: string;
  currentCerebrasKey?: string;
  currentModel?: string;
  onSave: (key: string, openRouterKey: string, cerebrasKey: string, model: string) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  currentKey,
  currentOpenRouterKey,
  currentCerebrasKey,
  currentModel,
  onSave,
  onClose
}) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState(currentOpenRouterKey || '');
  const [cerebrasKeyInput, setCerebrasKeyInput] = useState(currentCerebrasKey || '');
  const [modelInput, setModelInput] = useState(currentModel || 'gemini');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keyInput.trim(), openRouterKeyInput.trim(), cerebrasKeyInput.trim(), modelInput);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <h3>SETTINGS</h3>
        <form onSubmit={handleSubmit}>
          {/* GEMINI SECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              GEMINI API KEY
            </label>
            <input
              id="apiKey"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="ENTER GEMINI KEY"
              className="settings-input"
              autoFocus
            />
          </div>

          {/* OPENROUTER SECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="openRouterKey" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              OPENROUTER API KEY
            </label>
            <input
              id="openRouterKey"
              type="password"
              value={openRouterKeyInput}
              onChange={(e) => setOpenRouterKeyInput(e.target.value)}
              placeholder="ENTER OPENROUTER KEY"
              className="settings-input"
            />
          </div>

          {/* CEREBRAS SECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="cerebrasKey" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              CEREBRAS API KEY
            </label>
            <input
              id="cerebrasKey"
              type="password"
              value={cerebrasKeyInput}
              onChange={(e) => setCerebrasKeyInput(e.target.value)}
              placeholder="ENTER CEREBRAS KEY"
              className="settings-input"
            />
          </div>

          {/* MODEL SELECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="modelSelect" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              PREFERRED MODEL
            </label>
            <select
              id="modelSelect"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="settings-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="gemini">Gemini 2.5 Flash Lite (Google)</option>
              <option value="grok">Grok 2 (xAI via OpenRouter)</option>
              <option value="cerebras-gpt">Cerebras GPT-OSS 120B</option>
              <option value="cerebras-zai">Cerebras Zai GLM 4.6</option>
            </select>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            KEYS STORED LOCALLY IN BROWSER
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="settings-button secondary">
              CANCEL
            </button>
            <button type="submit" className="settings-button primary">
              SAVE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
