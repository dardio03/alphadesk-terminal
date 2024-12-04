import React, { useState, useCallback, useEffect } from 'react';
import OrderBookSettings from './OrderBookSettings';
import { useBinanceWebSocket } from '../hooks/useBinanceWebSocket';
import { useBybitWebSocket } from '../hooks/useBybitWebSocket';
import { useCoinbaseWebSocket } from '../hooks/useCoinbaseWebSocket';
import './OrderBook.css';

export const EXCHANGES = {
  BINANCE: 'BINANCE',
  BYBIT: 'BYBIT',
  COINBASE: 'COINBASE'
};

const OrderBook = ({ symbol = 'BTCUSDT' }) => {
  const [enabledExchanges, setEnabledExchanges] = useState([EXCHANGES.BINANCE]);
  const [exchangeData, setExchangeData] = useState({
    [EXCHANGES.BINANCE]: { bids: [], asks: [] },
    [EXCHANGES.BYBIT]: { bids: [], asks: [] },
    [EXCHANGES.COINBASE]: { bids: [], asks: [] }
  });
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [error, setError] = useState(null);

  const handleToggleExchange = (exchange) => {
    setEnabledExchanges(prev => {
      if (prev.includes(exchange)) {
        return prev.filter(e => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  const createHandleOrderBookUpdate = useCallback((exchange) => (data) => {
    setExchangeData(prev => ({
      ...prev,
      [exchange]: data
    }));
  }, []);

  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  // Use WebSocket hooks for each exchange
  useBinanceWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.BINANCE) && createHandleOrderBookUpdate(EXCHANGES.BINANCE)(data),
    handleError
  );

  useBybitWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.BYBIT) && createHandleOrderBookUpdate(EXCHANGES.BYBIT)(data),
    handleError
  );

  useCoinbaseWebSocket(
    symbol,
    (data) => enabledExchanges.includes(EXCHANGES.COINBASE) && createHandleOrderBookUpdate(EXCHANGES.COINBASE)(data),
    handleError
  );

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
      .slice(0, 20);

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
      .slice(0, 20);

    setBids(aggregatedBids);
    setAsks(aggregatedAsks);
  }, [enabledExchanges, exchangeData]);



  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const handleScroll = (event) => {
    const sections = document.querySelectorAll('.section-content');
    const scrolledSection = event.target;
    const scrollTop = scrolledSection.scrollTop;

    sections.forEach(section => {
      if (section !== scrolledSection) {
        section.scrollTop = scrollTop;
      }
    });
  };

  if (error) {
    return <div className="orderbook-error">{error}</div>;
  }

  return (
    <div className="orderbook">
      <OrderBookSettings
        enabledExchanges={enabledExchanges}
        onToggleExchange={handleToggleExchange}
        symbol={symbol}
      />
      
      <div className="orderbook-content">
        <div className="orderbook-sections">
          <div className="orderbook-section asks-section">
            <div className="section-header">
              <div className="section-title">Ask (Sell)</div>
              <div className="column-headers">
                <div className="amount">Amount</div>
                <div className="total">Total</div>
                <div className="price">Price</div>
              </div>
            </div>
            <div className="section-content" onScroll={handleScroll}>
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
            <div className="section-header">
              <div className="section-title">Bid (Buy)</div>
              <div className="column-headers">
                <div className="amount">Amount</div>
                <div className="total">Total</div>
                <div className="price">Price</div>
              </div>
            </div>
            <div className="section-content" onScroll={handleScroll}>
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
    </div>
  );
};

export default OrderBook;