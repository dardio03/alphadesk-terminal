import React, { useState, useEffect, useCallback } from 'react';
import { useBinanceWebSocket } from '../hooks/useBinanceWebSocket';
import { useBybitWebSocket } from '../hooks/useBybitWebSocket';
import { useCoinbaseWebSocket } from '../hooks/useCoinbaseWebSocket';
import { EXCHANGES } from './OrderBook';
import './OrderBookChanges.css';

const OrderBookChanges = ({ symbol = 'BTCUSDT' }) => {
  const [enabledExchanges, setEnabledExchanges] = useState([EXCHANGES.BINANCE]);
  const [previousData, setPreviousData] = useState({
    [EXCHANGES.BINANCE]: { bids: new Map(), asks: new Map() },
    [EXCHANGES.BYBIT]: { bids: new Map(), asks: new Map() },
    [EXCHANGES.COINBASE]: { bids: new Map(), asks: new Map() }
  });
  const [changes, setChanges] = useState({
    asks: { added: 0, subtracted: 0 },
    bids: { added: 0, subtracted: 0 }
  });

  // Reset changes periodically to avoid bars growing indefinitely
  useEffect(() => {
    const interval = setInterval(() => {
      setChanges({
        asks: { added: 0, subtracted: 0 },
        bids: { added: 0, subtracted: 0 }
      });
    }, 10000); // Reset every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOrderBookUpdate = useCallback((exchange, data) => {
    setPreviousData(prevState => {
      const prevBids = prevState[exchange].bids;
      const prevAsks = prevState[exchange].asks;
      const newBids = new Map(data.bids.map(bid => [bid.price, bid.quantity]));
      const newAsks = new Map(data.asks.map(ask => [ask.price, ask.quantity]));

      // Count changes in bids
      let bidsAdded = 0;
      let bidsSubtracted = 0;
      newBids.forEach((quantity, price) => {
        if (!prevBids.has(price)) bidsAdded++;
      });
      prevBids.forEach((quantity, price) => {
        if (!newBids.has(price)) bidsSubtracted++;
      });

      // Count changes in asks
      let asksAdded = 0;
      let asksSubtracted = 0;
      newAsks.forEach((quantity, price) => {
        if (!prevAsks.has(price)) asksAdded++;
      });
      prevAsks.forEach((quantity, price) => {
        if (!newAsks.has(price)) asksSubtracted++;
      });

      // Update changes
      setChanges(prev => ({
        asks: {
          added: prev.asks.added + asksAdded,
          subtracted: prev.asks.subtracted + asksSubtracted
        },
        bids: {
          added: prev.bids.added + bidsAdded,
          subtracted: prev.bids.subtracted + bidsSubtracted
        }
      }));

      // Return new state
      return {
        ...prevState,
        [exchange]: {
          bids: newBids,
          asks: newAsks
        }
      };
    });
  }, []);

  const handleError = useCallback((error) => {
    console.error('OrderBookChanges error:', error);
  }, []);

  // Use WebSocket hooks for each exchange
  useBinanceWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.BINANCE) && handleOrderBookUpdate(EXCHANGES.BINANCE, data),
    handleError
  );

  useBybitWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.BYBIT) && handleOrderBookUpdate(EXCHANGES.BYBIT, data),
    handleError
  );

  useCoinbaseWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.COINBASE) && handleOrderBookUpdate(EXCHANGES.COINBASE, data),
    handleError
  );

  // Calculate the maximum value for scaling
  const maxValue = Math.max(
    changes.asks.added,
    changes.asks.subtracted,
    changes.bids.added,
    changes.bids.subtracted
  );

  const getBarWidth = (value) => {
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  };

  return (
    <div className="orderbook-changes">
      <div className="changes-header">
        <h3>Order Book Changes - {symbol}</h3>
        <div className="exchange-toggles">
          {Object.entries(EXCHANGES).map(([key, value]) => (
            <label key={value} className="exchange-toggle">
              <input
                type="checkbox"
                checked={enabledExchanges.includes(value)}
                onChange={() => {
                  setEnabledExchanges(prev => 
                    prev.includes(value)
                      ? prev.filter(e => e !== value)
                      : [...prev, value]
                  );
                }}
              />
              <span>{key.charAt(0) + key.slice(1).toLowerCase()}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="changes-content">
        <div className="asks-section">
          <div className="bar-container">
            <div className="bar-label">Added</div>
            <div className="bar added" style={{ width: `${getBarWidth(changes.asks.added)}%` }}>
              {changes.asks.added}
            </div>
          </div>
          <div className="bar-container">
            <div className="bar-label">Subtracted</div>
            <div className="bar subtracted" style={{ width: `${getBarWidth(changes.asks.subtracted)}%` }}>
              {changes.asks.subtracted}
            </div>
          </div>
        </div>

        <div className="separator" />

        <div className="bids-section">
          <div className="bar-container">
            <div className="bar-label">Added</div>
            <div className="bar added" style={{ width: `${getBarWidth(changes.bids.added)}%` }}>
              {changes.bids.added}
            </div>
          </div>
          <div className="bar-container">
            <div className="bar-label">Subtracted</div>
            <div className="bar subtracted" style={{ width: `${getBarWidth(changes.bids.subtracted)}%` }}>
              {changes.bids.subtracted}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBookChanges;