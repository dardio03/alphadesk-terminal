import React, { useState, useRef, useEffect } from 'react';

interface WidgetHeaderProps {
  title: string;
  widgetId?: string;
  onClose?: () => void;
  onSettingsClick?: () => void;
  onRefresh?: () => void;
  onMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  settingsContent?: React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  title,
  widgetId,
  onClose,
  onSettingsClick,
  onRefresh,
  onMove,
  settingsContent,
  isDraggable = false,
  isResizable = false
}) => {
  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (onMove) {
      onMove(direction);
    }
  };
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      setShowSettings(!showSettings);
    }
  };

  return (
    <div className={`widget-header ${isDraggable ? 'draggable' : ''}`}>
      <div className="title">
        {title}
        {widgetId && <span className="widget-id">#{widgetId}</span>}
      </div>
      
      <div className="actions" ref={settingsRef}>
        {onMove && (
          <div className="move-controls">
            <button onClick={() => handleMove('up')}>⬆️</button>
            <button onClick={() => handleMove('down')}>⬇️</button>
            <button onClick={() => handleMove('left')}>⬅️</button>
            <button onClick={() => handleMove('right')}>➡️</button>
          </div>
        )}
        
        {onRefresh && (
          <button className="refresh-button" onClick={onRefresh}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        )}

        {(onSettingsClick || settingsContent) && (
          <button className="settings-button" onClick={handleSettingsClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}

        {onClose && (
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {showSettings && settingsContent && (
          <>
            <div className="settings-menu-backdrop" onClick={() => setShowSettings(false)} />
            <div className="settings-menu">
              {settingsContent}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WidgetHeader;