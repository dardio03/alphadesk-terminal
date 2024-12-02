import React from 'react';
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
        <label className="exchange-toggle">
          <input
            type="checkbox"
            checked={enabledExchanges.includes('binance')}
            onChange={() => onToggleExchange('binance')}
          />
          <span className="toggle-label">Binance</span>
        </label>
        <label className="exchange-toggle">
          <input
            type="checkbox"
            checked={enabledExchanges.includes('bybit')}
            onChange={() => onToggleExchange('bybit')}
          />
          <span className="toggle-label">Bybit</span>
        </label>
        <label className="exchange-toggle">
          <input
            type="checkbox"
            checked={enabledExchanges.includes('coinbase')}
            onChange={() => onToggleExchange('coinbase')}
          />
          <span className="toggle-label">Coinbase</span>
        </label>
      </div>
    </div>
  );
};

export default OrderBookSettings;