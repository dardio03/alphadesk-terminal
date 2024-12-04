import React, { useState, useEffect, useCallback } from 'react';
import { useBinanceWebSocket } from '../hooks/useBinanceWebSocket';
import { useBybitWebSocket } from '../hooks/useBybitWebSocket';
import { useCoinbaseWebSocket } from '../hooks/useCoinbaseWebSocket';
import { EXCHANGES } from './OrderBook';
import './PriceRange.css';

// Exchange icons using emoji for simplicity
// In a real app, you might want to use SVG icons instead
const EXCHANGE_ICONS = {
  [EXCHANGES.BINANCE]: '🟡', // Yellow circle for Binance
  [EXCHANGES.BYBIT]: '🔵',   // Blue circle for Bybit
  [EXCHANGES.COINBASE]: '🟢', // Green circle for Coinbase
};

const PriceRange = ({ symbol = 'BTCUSDT' }) => {
  const [prices, setPrices] = useState({
    [EXCHANGES.BINANCE]: null,
    [EXCHANGES.BYBIT]: null,
    [EXCHANGES.COINBASE]: null,
  });

  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 0,
    range: 0,
  });

  // Calculate the position for an exchange's price marker
  const calculatePosition = (price) => {
    if (!price || priceRange.range === 0) return 0;
    return ((price - priceRange.min) / priceRange.range) * 100;
  };

  // Update price range when prices change
  useEffect(() => {
    const validPrices = Object.values(prices).filter(price => price !== null);
    if (validPrices.length > 0) {
      const min = Math.min(...validPrices);
      const max = Math.max(...validPrices);
      // Add a small buffer to min/max for visual padding
      const buffer = (max - min) * 0.1;
      setPriceRange({
        min: min - buffer,
        max: max + buffer,
        range: (max + buffer) - (min - buffer),
      });
    }
  }, [prices]);

  // Handle price updates from each exchange
  const createPriceHandler = (exchange) => (data) => {
    if (data.bids && data.bids.length > 0 && data.asks && data.asks.length > 0) {
      // Calculate mid price between best bid and best ask
      const midPrice = (data.bids[0].price + data.asks[0].price) / 2;
      setPrices(prev => ({
        ...prev,
        [exchange]: midPrice,
      }));
    }
  };

  const handleError = useCallback((error) => {
    console.error('PriceRange error:', error);
  }, []);

  // Use WebSocket hooks for each exchange
  useBinanceWebSocket(symbol, createPriceHandler(EXCHANGES.BINANCE), handleError);
  useBybitWebSocket(symbol, createPriceHandler(EXCHANGES.BYBIT), handleError);
  useCoinbaseWebSocket(symbol, createPriceHandler(EXCHANGES.COINBASE), handleError);

  const formatPrice = (price) => {
    return price?.toFixed(2) || '-';
  };

  return (
    <div className="price-range">
      <div className="price-range-header">
        <h3>Price Range - {symbol}</h3>
        <div className="exchange-legend">
          {Object.entries(EXCHANGE_ICONS).map(([exchange, icon]) => (
            <div key={exchange} className="legend-item">
              <span className="icon">{icon}</span>
              <span className="exchange-name">
                {exchange.charAt(0) + exchange.slice(1).toLowerCase()}
              </span>
              <span className="price">${formatPrice(prices[exchange])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="price-range-content">
        <div className="price-bar">
          <div className="price-scale">
            <span className="min-price">${formatPrice(priceRange.min)}</span>
            <span className="max-price">${formatPrice(priceRange.max)}</span>
          </div>
          <div className="price-track">
            {Object.entries(prices).map(([exchange, price]) => (
              price !== null && (
                <div
                  key={exchange}
                  className="price-marker"
                  style={{
                    left: `${calculatePosition(price)}%`,
                  }}
                  title={`${exchange}: $${formatPrice(price)}`}
                >
                  {EXCHANGE_ICONS[exchange]}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceRange;