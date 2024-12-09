import React, { useState, useEffect, useRef } from 'react';
import useOrderBookData from '../hooks/useOrderBookData';
import OrderBookSettings from './OrderBookSettings';
import './OrderBook.css';

export const EXCHANGES = {
  BINANCE: 'BINANCE',
  BYBIT: 'BYBIT',
  COINBASE: 'COINBASE'
};

const OrderBook = ({ symbol = 'BTCUSDT' }) => {
  const [enabledExchanges, setEnabledExchanges] = useState([EXCHANGES.BINANCE]);
  const { exchangeData, error } = useOrderBookData(symbol, enabledExchanges);
  const [setExchangeData] = useState({});
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [, setError] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    if (!workerRef.current) return;
    try {
      workerRef.current = new Worker(new URL('../worker/worker.ts', import.meta.url));
    } catch (error) {
      console.error('Failed to initialize web worker:', error);
      setError('Failed to initialize web worker');
    }

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log('Received message from worker:', type, payload);
      if (type === 'ORDER_BOOK_UPDATE') {
        const { exchange, data } = payload;
        setExchangeData(prev => ({
          ...prev,
          [exchange]: data
        }));
      } else if (type === 'ERROR') {
        setError(payload.message);
      }
    };

    workerRef.current.postMessage({
      type: 'INIT',
      payload: { symbol, exchanges: enabledExchanges }
    });

    return () => {
      workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    workerRef.current.postMessage({
      type: 'UPDATE_EXCHANGES',
      payload: { exchanges: enabledExchanges }
    });
  }, [enabledExchanges]);

  useEffect(() => {
    workerRef.current.postMessage({
      type: 'UPDATE_SYMBOL',
      payload: { symbol }
    });
  }, [symbol]);

  const handleToggleExchange = (exchange) => {
    setEnabledExchanges(prev => {
      if (prev.includes(exchange)) {
        return prev.filter(e => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  // Aggregate order book data from all enabled exchanges
  useEffect(() => {
    const allBids = [];
    const allAsks = [];

    enabledExchanges.forEach(exchange => {
      const { bids: exchangeBids, asks: exchangeAsks } = exchangeData[exchange];
      allBids.push(...exchangeBids.map(bid => ({ ...bid, exchange })));
      allAsks.push(...exchangeAsks.map(ask => ({ ...ask, exchange })));
    });

    // Sort and aggregate orders at the same price level
    const aggregatedBids = allBids
      .reduce((acc, bid) => {
        const existingBid = acc.find(b => b.price === bid.price);
        if (existingBid) {
          existingBid.quantity += bid.quantity;
          existingBid.exchanges = [...existingBid.exchanges, bid.exchange];
        } else {
          acc.push({ ...bid, exchanges: [bid.exchange] });
        }
        return acc;
      }, [])
      .sort((a, b) => b.price - a.price)
      .slice(0, 50);

    const aggregatedAsks = allAsks
      .reduce((acc, ask) => {
        const existingAsk = acc.find(a => a.price === ask.price);
        if (existingAsk) {
          existingAsk.quantity += ask.quantity;
          existingAsk.exchanges = [...existingAsk.exchanges, ask.exchange];
        } else {
          acc.push({ ...ask, exchanges: [ask.exchange] });
        }
        return acc;
      }, [])
      .sort((a, b) => a.price - b.price)
      .slice(0, 50);

    setBids(aggregatedBids);
    setAsks(aggregatedAsks);
  }, [enabledExchanges, exchangeData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="orderbook">
      {error && <div className="orderbook-error">{error}</div>}
      <OrderBookSettings
        enabledExchanges={enabledExchanges}
        onToggleExchange={handleToggleExchange}
        symbol={symbol}
      />
      
      <div className="orderbook-content">
        <div className="orderbook-header">
          <div className="column-headers">
            <div className="amount">Amount</div>
            <div className="total">Total</div>
            <div className="price">Price</div>
          </div>
        </div>
        <div className="orderbook-body">
          <div className="orderbook-section asks-section">
            {asks.slice(0, 16).map((ask, index) => {
              const totalUpToHere = asks
                .slice(0, index + 1)
                .reduce((sum, a) => sum + a.quantity, 0);
              return (
                <div key={`ask-${index}`} className="order-row ask">
                  <div className="amount">{formatNumber(ask.quantity)}</div>
                  <div className="total">{formatNumber(totalUpToHere)}</div>
                  <div className="price sell">{formatNumber(ask.price)}</div>
                  <div className="depth-visualization" style={{
                    width: `${(ask.quantity / Math.max(...asks.map(a => a.quantity))) * 100}%`
                  }} />
                </div>
              );
            })}
          </div>

          <div className="spread">
            {asks.length > 0 && bids.length > 0 && (
              <div>
                Spread: {formatNumber(asks[0].price - bids[0].price)} (
                {((asks[0].price - bids[0].price) / bids[0].price * 100).toFixed(3)}%)
              </div>
            )}
          </div>

          <div className="orderbook-section bids-section">
            {bids.slice(0, 16).map((bid, index) => {
              const totalUpToHere = bids
                .slice(0, index + 1)
                .reduce((sum, b) => sum + b.quantity, 0);
              return (
                <div key={`bid-${index}`} className="order-row bid">
                  <div className="amount">{formatNumber(bid.quantity)}</div>
                  <div className="total">{formatNumber(totalUpToHere)}</div>
                  <div className="price buy">{formatNumber(bid.price)}</div>
                  <div className="depth-visualization" style={{
                    width: `${(bid.quantity / Math.max(...bids.map(b => b.quantity))) * 100}%`
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;