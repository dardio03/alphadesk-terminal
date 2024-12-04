import React from 'react';
import { EXCHANGES } from './OrderBook';
import './OrderBookSettings.css';

const OrderBookSettings = ({ 
  enabledExchanges, 
  onToggleExchange,
  symbol
}) => {
  return (
    <div className="orderbook-settings">
      <div className="settings-header">
        <span className="settings-title">Order Book Settings</span>
        <span className="settings-symbol">{symbol}</span>
      </div>
      <div className="exchange-toggles">
        {Object.entries(EXCHANGES).map(([key, value]) => (
          <label key={value} className="exchange-toggle">
            <input
              type="checkbox"
              checked={enabledExchanges.includes(value)}
              onChange={() => onToggleExchange(value)}
            />
            <span className="toggle-label">{key.charAt(0) + key.slice(1).toLowerCase()}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default OrderBookSettings;