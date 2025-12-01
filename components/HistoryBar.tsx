
import React, { useRef, useEffect } from 'react';
import { HistoryItem } from '../App';

interface HistoryBarProps {
  history: HistoryItem[];
  currentIndex: number;
  onJump: (index: number) => void;
}

const HistoryBar: React.FC<HistoryBarProps> = ({ history, currentIndex, onJump }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the active item
  useEffect(() => {
    if (scrollRef.current) {
      // Find the active element
      const activeEl = scrollRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        const container = scrollRef.current;
        const scrollLeft = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [currentIndex, history.length]);

  return (
    <div className="history-bar-container">
      <div className="history-scroll-area" ref={scrollRef}>
        {history.map((item, index) => {
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <div key={item.id} className="history-checkpoint-wrapper">
              {/* Connector Line (Left) */}
              {index > 0 && (
                <div className={`history-line ${isFuture ? 'future' : ''}`} />
              )}
              
              {/* Checkpoint Dot */}
              <button
                className={`history-checkpoint ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''} ${item.type === 'image' ? 'is-image' : ''}`}
                onClick={() => onJump(index)}
                title={item.label}
                aria-label={`Go to ${item.label}`}
              >
                {/* Visual indicator inside */}
                <span className="checkpoint-inner" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="history-label-display">
        {history[currentIndex]?.label}
      </div>
    </div>
  );
};

export default HistoryBar;
