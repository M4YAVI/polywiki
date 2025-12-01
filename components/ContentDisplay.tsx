import React, { useState, useEffect, useMemo } from 'react';

interface ContentDisplayProps {
  content: string;
  isLoading: boolean;
  onWordClick: (word: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

interface Section {
  title: string;
  content: string;
}

const InteractiveContent: React.FC<{
  content: string;
  onWordClick: (word: string) => void;
  isStreaming?: boolean;
}> = ({ content, onWordClick, isStreaming }) => {
  // Hide trailing partial headers to prevent "flashing"
  // If the content ends with a newline followed by '##' and optional text, hide it until it becomes a full section
  const displayContent = useMemo(() => {
    if (!isStreaming) return content;
    return content.replace(/\n## ?[a-zA-Z0-9 ]*$/, '');
  }, [content, isStreaming]);

  const words = displayContent.split(/(\s+)/).filter(Boolean); // Keep whitespace for spacing

  return (
    <p style={{ margin: 0, lineHeight: '1.6' }}>
      {words.map((word, index) => {
        // Only make non-whitespace words clickable
        if (/\S/.test(word)) {
          const cleanWord = word.replace(/[.,!?;:()"']/g, '');
          if (cleanWord) {
            return (
              <button
                key={index}
                onClick={() => onWordClick(cleanWord)}
                className="interactive-word"
                aria-label={`Learn more about ${cleanWord}`}
              >
                {word}
              </button>
            );
          }
        }
        // Render whitespace as-is
        return <span key={index}>{word}</span>;
      })}
      {isStreaming && <span className="blinking-cursor">|</span>}
    </p>
  );
};

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, isLoading, onWordClick, isFavorite, onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState<string>('General');

  // Parse content into sections
  const { sections, relatedTopics } = useMemo(() => {
    const parts = content.split(/^##\s+(.+)$/gm);
    const parsedSections: Section[] = [];
    let related: string[] = [];

    // If no headers found, treat entire content as "General"
    if (parts.length === 1) {
      parsedSections.push({ title: 'General', content: parts[0].trim() });
    } else {
      // Handle preamble if any (before first header)
      if (parts[0].trim()) {
        parsedSections.push({ title: 'General', content: parts[0].trim() });
      }

      // Iterate through pairs of (Title, Content)
      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i].trim();
        const body = parts[i + 1] ? parts[i + 1].trim() : '';

        if (title.toLowerCase() === 'related') {
          // Parse bullet points for related topics
          related = body
            .split('\n')
            .map(line => line.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean);
        } else {
          // Check if we already have a section with this title (case-insensitive)
          const existingSectionIndex = parsedSections.findIndex(s => s.title.toLowerCase() === title.toLowerCase());

          if (existingSectionIndex !== -1) {
            // Append content to existing section
            parsedSections[existingSectionIndex].content += '\n\n' + body;
          } else {
            parsedSections.push({ title, content: body });
          }
        }
      }
    }
    return { sections: parsedSections, relatedTopics: related };
  }, [content]);

  // Auto-select first tab if active tab doesn't exist (e.g. on new search)
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.title === activeTab)) {
      setActiveTab(sections[0].title);
    }
  }, [sections, activeTab]);

  // Find active section content
  const activeSection = sections.find(s => s.title === activeTab) || sections[0];

  // Determine if the active section is the one currently receiving data
  // We assume the last section is the one streaming if isLoading is true
  const isSectionStreaming = isLoading && activeSection === sections[sections.length - 1];

  if (!content) return null;

  return (
    <div className="content-display" style={{ position: 'relative' }}>
      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={onToggleFavorite}
          style={{
            position: 'absolute',
            top: '-3.5rem', // Align with tabs or header
            right: 0,
            background: 'none',
            border: 'none',
            color: isFavorite ? '#ff4444' : 'rgba(255,255,255,0.3)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          title={isFavorite ? "Remove from database" : "Save to database"}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      )}

      {/* Tabs - Always render to prevent layout shift */}
      <div className="tabs-container" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        minHeight: '42px' // Reserve height
      }}>
        {sections.map((section) => (
          <button
            key={section.title}
            onClick={() => setActiveTab(section.title)}
            className={`tab-button ${activeTab === section.title ? 'active' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === section.title ? 'white' : '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === section.title ? 'bold' : 'normal',
              padding: '0.5rem 0',
              textTransform: 'uppercase',
              borderBottom: activeTab === section.title ? '2px solid white' : '2px solid transparent',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="tab-content">
        <InteractiveContent
          content={activeSection.content}
          onWordClick={onWordClick}
          isStreaming={isSectionStreaming}
        />
      </div>

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <div className="related-topics" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>
            Down the Rabbit Hole
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {relatedTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => onWordClick(topic)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '0.5rem 1rem',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#ccc';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;