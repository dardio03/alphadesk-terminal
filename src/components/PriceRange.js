import React, { useState, useEffect, useCallback, useRef } from 'react';
import useBinancePrice from '../hooks/useBinancePrice';
import useBybitPrice from '../hooks/useBybitPrice';
import useCoinbasePrice from '../hooks/useCoinbasePrice';
import { EXCHANGES } from './OrderBook';
import './PriceRange.css';

// Import SVG icons
import { ReactComponent as BinanceIcon } from '../assets/exchanges/BINANCE.svg';
import { ReactComponent as BybitIcon } from '../assets/exchanges/BYBIT.svg';
import { ReactComponent as CoinbaseIcon } from '../assets/exchanges/COINBASE.svg';

// Exchange icons using SVG components
const EXCHANGE_ICONS = {
  [EXCHANGES.BINANCE]: BinanceIcon,
  [EXCHANGES.BYBIT]: BybitIcon,
  [EXCHANGES.COINBASE]: CoinbaseIcon,
};

const PriceRange = ({ symbol = 'BTCUSDT' }) => {
  const binancePrice = useBinancePrice ? useBinancePrice(symbol) : null;
  const [setPrices] = useState({});
  const bybitPrice = useBybitPrice(symbol);
  const coinbasePrice = useCoinbasePrice(symbol);

  const prices = {
    [EXCHANGES.BINANCE]: binancePrice,
    [EXCHANGES.BYBIT]: bybitPrice,
    [EXCHANGES.COINBASE]: coinbasePrice,
  };

  const error = null; // Handle errors from individual hooks if needed

  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 0,
    range: 0,
  });

  const workerRef = useRef(null);

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

  useEffect(() => {
    // Create a new worker
    workerRef.current = new Worker(new URL('../worker/worker.ts', import.meta.url));

    // Set up message handler
    workerRef.current.onmessage = (event) => {
      if (event.data.op === 'price') {
        const { exchange, price } = event.data.data;
        setPrices(prev => ({
          ...prev,
          [exchange]: price,
        }));
      }
    };

    // Initialize the worker with the symbol
    workerRef.current.postMessage({ op: 'INIT', data: { symbol } });

    // Clean up the worker when the component unmounts
    return () => {
      workerRef.current.terminate();
    };
  }, [symbol]);

  // Log prices when they change
  useEffect(() => {
    console.log('Current prices:', prices);
  }, [prices]);

  const handleError = useCallback((error) => {
    console.error('PriceRange error:', error);
  }, []);

  const formatPrice = (price) => {
    return price?.toFixed(2) || '-';
  };

  return (
    <div className="price-range">
      <div className="price-range-header">
        <h3>Price Range - {symbol}</h3>
        <div className="exchange-legend">
          {Object.entries(EXCHANGE_ICONS).map(([exchange, Icon]) => (
            <div key={exchange} className="legend-item">
              <span className="icon"><Icon width={16} height={16} /></span>
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
            {Object.entries(prices).map(([exchange, price]) => {
              const Icon = EXCHANGE_ICONS[exchange];
              return price !== null && (
                <div
                  key={exchange}
                  className="price-marker"
                  style={{
                    left: `${calculatePosition(price)}%`,
                  }}
                  title={`${exchange}: $${formatPrice(price)}`}
                >
                  <Icon width={16} height={16} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceRange;