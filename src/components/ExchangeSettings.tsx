import React, { useState, useCallback } from 'react';
import { ExchangeId } from '../types/exchange';
import './ExchangeSettings.css';

// Define available exchanges
const AVAILABLE_EXCHANGES = [
  'binance',
  'binance_futures',
  'binance_us',
  'bitfinex',
  'bitget',
  'bitmart',
  'bitmex',
  'bitstamp',
  'bitunix',
  'bybit',
  'coinbase',
  'cryptocom',
  'deribit',
  'dydx',
  'gateio',
  'hitbtc',
  'huobi',
  'kraken',
  'kucoin',
  'mexc',
  'okex',
  'phemex',
  'poloniex',
  'uniswap'
] as const;

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
      >
        Exchange Settings
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