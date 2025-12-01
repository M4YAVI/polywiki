import React from 'react';

const LoadingSkeleton: React.FC = () => {
  const barStyle: React.CSSProperties = {
    height: '1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Dark mode friendly
    marginBottom: '0.75rem',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite ease-in-out',
  };

  return (
    <div aria-label="Loading content..." role="progressbar" style={{ marginTop: '1rem' }}>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.3; }
            50% { opacity: 0.7; }
            100% { opacity: 0.3; }
          }
        `}
      </style>
      <div style={{ ...barStyle, width: '100%' }}></div>
      <div style={{ ...barStyle, width: '90%' }}></div>
      <div style={{ ...barStyle, width: '95%' }}></div>
      <div style={{ ...barStyle, width: '80%' }}></div>
      <div style={{ ...barStyle, width: '85%' }}></div>
    </div>
  );
};

export default LoadingSkeleton;
