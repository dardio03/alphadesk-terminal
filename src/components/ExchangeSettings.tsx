import React, { useEffect, useRef, useState } from 'react';
import { ExchangeId } from '../types/exchange';
import './ExchangeSettings.css';
import { EXCHANGES } from '../constants/exchanges';

// Define available exchanges
const AVAILABLE_EXCHANGES = EXCHANGES;

export interface ExchangeSettingsProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  activeExchanges: ExchangeId[];
  onExchangeToggle: (exchangeId: string) => void;
  getExchangeStatus: (exchangeId: string) => string;
}

const ExchangeSettings: React.FC<ExchangeSettingsProps> = ({
  open,
  anchorEl,
  onClose,
  activeExchanges,
  onExchangeToggle,
  getExchangeStatus
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      updatePosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, anchorEl]);

  const updatePosition = () => {
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const popoverHeight = 400; // max-height of popover
    const popoverWidth = 280; // min-width of popover

    let top = rect.bottom;
    let left = rect.left;

    // Check if popover would go below viewport
    if (top + popoverHeight > viewportHeight) {
      top = rect.top - popoverHeight;
    }

    // Check if popover would go beyond right edge
    if (left + popoverWidth > viewportWidth) {
      left = viewportWidth - popoverWidth - 10; // 10px padding from edge
    }

    setPosition({ top, left });
  };

  if (!open || !anchorEl) return null;

  const handleExchangeToggle = (event: React.MouseEvent, exchangeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    onExchangeToggle(exchangeId);
  };

  return (
    <div 
      className="exchange-settings-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      <div 
        ref={popoverRef}
        className="exchange-settings-popover"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exchange-list">
          {AVAILABLE_EXCHANGES.map((exchangeId) => {
            const isActive = activeExchanges.includes(exchangeId as ExchangeId);
            return (
              <div
                key={exchangeId}
                className={`exchange-item ${isActive ? 'active' : ''} ${getExchangeStatus(exchangeId)}`}
                onClick={(e) => handleExchangeToggle(e, exchangeId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleExchangeToggle(e as unknown as React.MouseEvent, exchangeId);
                  }
                }}
              >
                <div className="exchange-item-content">
                  <span className="exchange-name">{exchangeId}</span>
                  <span className="exchange-status">{getExchangeStatus(exchangeId)}</span>
                </div>
                <div className="exchange-item-right">
                  <div 
                    className="toggle-switch"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExchangeToggle(e, exchangeId);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleExchangeToggle(e as unknown as React.MouseEvent, exchangeId);
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExchangeSettings; 