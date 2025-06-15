import React, { useState, useCallback } from 'react';
import { ExchangeId } from '../types/exchange';
import './ExchangeSettings.css';
import { EXCHANGES } from '../constants/exchanges';

// Define available exchanges
const AVAILABLE_EXCHANGES = EXCHANGES;

export interface ExchangeSettingsProps {
  activeExchanges: ExchangeId[];
  onExchangeToggle: (exchangeId: string) => void;
  getExchangeStatus: (exchangeId: string) => string;
}

const ExchangeSettings: React.FC<ExchangeSettingsProps> = ({
  activeExchanges,
  onExchangeToggle,
  getExchangeStatus
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleExchangeToggle = useCallback((exchangeId: string) => {
    onExchangeToggle(exchangeId);
  }, [onExchangeToggle]);

  return (
    <div className="exchange-settings">
      <button
        className="settings-button"
        onClick={toggleDropdown}
        aria-label="Exchange settings"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="exchange-dropdown">
          <div className="exchange-list">
            {AVAILABLE_EXCHANGES.map((exchangeId) => (
              <div
                key={exchangeId}
                className={`exchange-item ${activeExchanges.includes(exchangeId as ExchangeId) ? 'active' : ''} ${getExchangeStatus(exchangeId)}`}
                onClick={() => handleExchangeToggle(exchangeId)}
              >
                <span className="exchange-name">{exchangeId}</span>
                <span className="exchange-status">{getExchangeStatus(exchangeId)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeSettings; 