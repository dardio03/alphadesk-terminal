import React, { useEffect, useState, useCallback } from 'react';
import OrderBookSettings from './OrderBookSettings';
import './OrderBook.css';

export const EXCHANGES = {
  BINANCE: 'binance',
  BYBIT: 'bybit',
  COINBASE: 'coinbase'
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
  const [lastUpdateId, setLastUpdateId] = useState(0);
  const [error, setError] = useState(null);

  // Convert symbol format based on exchange
  const getExchangeSymbol = (exchange) => {
    switch (exchange) {
      case EXCHANGES.BINANCE:
        return symbol;
      case EXCHANGES.BYBIT:
        return symbol;
      case EXCHANGES.COINBASE:
        return symbol.replace('USDT', '-USD');
      default:
        return symbol;
    }
  };

  const handleToggleExchange = (exchange) => {
    setEnabledExchanges(prev => {
      if (prev.includes(exchange)) {
        return prev.filter(e => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  const aggregateOrderBook = useCallback(() => {
    // Combine all enabled exchanges' order books
    const allBids = [];
    const allAsks = [];

    enabledExchanges.forEach(exchange => {
      const { bids, asks } = exchangeData[exchange];
      allBids.push(...bids.map(bid => ({ ...bid, exchange })));
      allAsks.push(...asks.map(ask => ({ ...ask, exchange })));
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

  useEffect(() => {
    aggregateOrderBook();
  }, [enabledExchanges, exchangeData, aggregateOrderBook]);

  useEffect(() => {
    const connections = {};
    
    const updateExchangeData = (exchange, bids, asks) => {
      setExchangeData(prev => ({
        ...prev,
        [exchange]: {
          bids: bids || prev[exchange].bids,
          asks: asks || prev[exchange].asks
        }
      }));
    };

    const fetchBinanceOrderBook = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
        const data = await response.json();
        
        if (data.code) {
          throw new Error(data.msg);
        }
        
        setBids(data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })));
        
        setAsks(data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })));
        
        setLastUpdateId(data.lastUpdateId);
        setError(null);
      } catch (error) {
        console.error('Error loading Binance order book:', error);
        setError('Failed to load Binance order book');
      }
    };

    const fetchBybitOrderBook = async () => {
      try {
        const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${symbol}&limit=20`);
        const data = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(data.retMsg);
        }
        
        if (data.result) {
          setBids(data.result.b.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })));
          
          setAsks(data.result.a.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })));
        }
        setError(null);
      } catch (error) {
        console.error('Error loading Bybit order book:', error);
        setError('Failed to load Bybit order book');
      }
    };

    const fetchCoinbaseOrderBook = async () => {
      try {
        const exchangeSymbol = getExchangeSymbol();
        const response = await fetch(`https://api.pro.coinbase.com/products/${exchangeSymbol}/book?level=2`);
        const data = await response.json();
        
        if (data.message) {
          throw new Error(data.message);
        }
        
        setBids(data.bids.slice(0, 20).map(([price, size]) => ({
          price: parseFloat(price),
          quantity: parseFloat(size)
        })));
        
        setAsks(data.asks.slice(0, 20).map(([price, size]) => ({
          price: parseFloat(price),
          quantity: parseFloat(size)
        })));
        setError(null);
      } catch (error) {
        console.error('Error loading Coinbase order book:', error);
        setError('Failed to load Coinbase order book');
      }
    };

    const setupBinanceWebSocket = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth@100ms`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateOrderBook(data.b, data.a);
      };

      ws.onerror = () => {
        setError('Binance WebSocket connection failed');
      };
    };

    const setupBybitWebSocket = () => {
      ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

      ws.onopen = () => {
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`orderbook.20.${symbol}`]
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.topic && data.topic.startsWith('orderbook') && data.data) {
          updateOrderBook(data.data.b, data.data.a);
        }
      };

      ws.onerror = () => {
        setError('Bybit WebSocket connection failed');
      };
    };

    const setupCoinbaseWebSocket = () => {
      const exchangeSymbol = getExchangeSymbol();
      ws = new WebSocket('wss://ws-feed.pro.coinbase.com');

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          product_ids: [exchangeSymbol],
          channels: ['level2']
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'snapshot') {
          setBids(data.bids.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })));
          setAsks(data.asks.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })));
        } else if (data.type === 'l2update') {
          const changes = data.changes;
          const bids = changes.filter(c => c[0] === 'buy').map(c => [c[1], c[2]]);
          const asks = changes.filter(c => c[0] === 'sell').map(c => [c[1], c[2]]);
          updateOrderBook(bids, asks);
        }
      };

      ws.onerror = () => {
        setError('Coinbase WebSocket connection failed');
      };
    };

    const updateOrderBook = (newBids, newAsks) => {
      if (newBids) {
        setBids(prevBids => {
          const updatedBids = [...prevBids];
          newBids.forEach(([price, quantity]) => {
            const priceFloat = parseFloat(price);
            const quantityFloat = parseFloat(quantity);
            const index = updatedBids.findIndex(bid => bid.price === priceFloat);

            if (quantityFloat === 0) {
              if (index !== -1) updatedBids.splice(index, 1);
            } else {
              if (index !== -1) {
                updatedBids[index].quantity = quantityFloat;
              } else {
                updatedBids.push({ price: priceFloat, quantity: quantityFloat });
              }
            }
          });
          return updatedBids.sort((a, b) => b.price - a.price).slice(0, 20);
        });
      }

      if (newAsks) {
        setAsks(prevAsks => {
          const updatedAsks = [...prevAsks];
          newAsks.forEach(([price, quantity]) => {
            const priceFloat = parseFloat(price);
            const quantityFloat = parseFloat(quantity);
            const index = updatedAsks.findIndex(ask => ask.price === priceFloat);

            if (quantityFloat === 0) {
              if (index !== -1) updatedAsks.splice(index, 1);
            } else {
              if (index !== -1) {
                updatedAsks[index].quantity = quantityFloat;
              } else {
                updatedAsks.push({ price: priceFloat, quantity: quantityFloat });
              }
            }
          });
          return updatedAsks.sort((a, b) => a.price - b.price).slice(0, 20);
        });
      }
    };

    // Initialize based on selected exchange
    switch (exchange) {
      case EXCHANGES.BINANCE:
        fetchBinanceOrderBook();
        setupBinanceWebSocket();
        break;
      case EXCHANGES.BYBIT:
        fetchBybitOrderBook();
        setupBybitWebSocket();
        break;
      case EXCHANGES.COINBASE:
        fetchCoinbaseOrderBook();
        setupCoinbaseWebSocket();
        break;
      default:
        setError('Unsupported exchange');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [symbol, exchange]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (error) {
    return <div className="orderbook-error">{error}</div>;
  }

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <div className="exchange">{exchange.toUpperCase()}</div>
        <div className="symbol">{getExchangeSymbol()}</div>
        <div className="price">Price</div>
        <div className="quantity">Amount</div>
        <div className="total">Total</div>
      </div>
      
      <div className="asks">
        {asks.map((ask, index) => (
          <div key={`ask-${index}`} className="order-row ask">
            <div className="price">{formatNumber(ask.price)}</div>
            <div className="quantity">{formatNumber(ask.quantity)}</div>
            <div className="total">{formatNumber(ask.price * ask.quantity)}</div>
            <div className="depth-visualization" style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 59, 48, 0.1)',
              width: `${(ask.quantity / Math.max(...asks.map(a => a.quantity))) * 100}%`,
              zIndex: 0
            }} />
          </div>
        ))}
      </div>
      
      <div className="spread">
        {asks.length > 0 && bids.length > 0 && (
          <div>
            Spread: {formatNumber(asks[0].price - bids[0].price)} (
            {((asks[0].price - bids[0].price) / bids[0].price * 100).toFixed(3)}%)
          </div>
        )}
      </div>
      
      <div className="bids">
        {bids.map((bid, index) => (
          <div key={`bid-${index}`} className="order-row bid">
            <div className="price">{formatNumber(bid.price)}</div>
            <div className="quantity">{formatNumber(bid.quantity)}</div>
            <div className="total">{formatNumber(bid.price * bid.quantity)}</div>
            <div className="depth-visualization" style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(52, 199, 89, 0.1)',
              width: `${(bid.quantity / Math.max(...bids.map(b => b.quantity))) * 100}%`,
              zIndex: 0
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
