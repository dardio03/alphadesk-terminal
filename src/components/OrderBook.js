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
        return symbol.replace('USDT', 'USDT').toUpperCase();
      case EXCHANGES.COINBASE:
        // Handle different quote currencies
        let base, quote;
        if (symbol.endsWith('USDT')) {
          [base, quote] = [symbol.slice(0, -4), 'USD'];
        } else if (symbol.endsWith('USD')) {
          [base, quote] = [symbol.slice(0, -3), 'USD'];
        } else if (symbol.endsWith('BTC')) {
          [base, quote] = [symbol.slice(0, -3), 'BTC'];
        } else {
          [base, quote] = [symbol.slice(0, -4), 'USD']; // Default to USD
        }
        return `${base}-${quote}`.toUpperCase();
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
        const bybitSymbol = getExchangeSymbol(EXCHANGES.BYBIT);
        const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${bybitSymbol}&limit=20`);
        const data = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(data.retMsg);
        }
        
        if (data.result && data.result.b && data.result.a) {
          const bids = data.result.b.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));
          
          const asks = data.result.a.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));
          
          updateExchangeData(EXCHANGES.BYBIT, bids, asks);
        }
        setError(null);
      } catch (error) {
        console.error('Error loading Bybit order book:', error);
        setError('Failed to load Bybit order book');
      }
    };

    const fetchCoinbaseOrderBook = async () => {
      try {
        const exchangeSymbol = getExchangeSymbol(EXCHANGES.COINBASE);
        console.log('Fetching Coinbase orderbook for symbol:', exchangeSymbol);
        const response = await fetch(`https://api.exchange.coinbase.com/products/${exchangeSymbol}/book?level=2`);
        const data = await response.json();
        
        if (data.message) {
          throw new Error(data.message);
        }
        
        if (data.bids && data.asks) {
          const bids = data.bids.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }));
          
          const asks = data.asks.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }));
          
          updateExchangeData(EXCHANGES.COINBASE, bids, asks);
          setError(null);
        } else {
          throw new Error('Invalid order book data structure');
        }
      } catch (error) {
        console.error('Error loading Coinbase order book:', error);
        setError('Failed to load Coinbase order book');
      }
    };

    const setupBinanceWebSocket = () => {
      connections.binance = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth@100ms`);

      connections.binance.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const bids = data.b.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }));
        const asks = data.a.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }));
        updateExchangeData(EXCHANGES.BINANCE, bids, asks);
      };

      connections.binance.onerror = () => {
        setError('Binance WebSocket connection failed');
      };
    };

    const setupBybitWebSocket = () => {
      const bybitSymbol = getExchangeSymbol(EXCHANGES.BYBIT);
      connections.bybit = new WebSocket('wss://stream.bybit.com/v5/public/spot');

      connections.bybit.onopen = () => {
        connections.bybit.send(JSON.stringify({
          op: 'subscribe',
          args: [`orderbook.20.${bybitSymbol}`]
        }));
      };

      connections.bybit.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.topic && data.topic.startsWith('orderbook') && data.data) {
          const orderData = data.data;
          if (orderData.b && orderData.a) {
            const bids = orderData.b.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }));
            const asks = orderData.a.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }));
            updateExchangeData(EXCHANGES.BYBIT, bids, asks);
          }
        }
      };

      connections.bybit.onerror = (error) => {
        console.error('Bybit WebSocket error:', error);
        setError('Bybit WebSocket connection failed');
      };
    };

    const setupCoinbaseWebSocket = () => {
      const exchangeSymbol = getExchangeSymbol(EXCHANGES.COINBASE);
      console.log('Setting up Coinbase WebSocket for symbol:', exchangeSymbol);
      connections.coinbase = new WebSocket('wss://ws-feed.exchange.coinbase.com');

      let orderBook = {
        bids: new Map(),
        asks: new Map()
      };

      const updateLocalOrderBook = () => {
        // Convert Maps to arrays and sort
        const bids = Array.from(orderBook.bids.entries())
          .map(([price, quantity]) => ({ price: parseFloat(price), quantity }))
          .sort((a, b) => b.price - a.price)
          .slice(0, 20);

        const asks = Array.from(orderBook.asks.entries())
          .map(([price, quantity]) => ({ price: parseFloat(price), quantity }))
          .sort((a, b) => a.price - b.price)
          .slice(0, 20);

        if (bids.length > 0 || asks.length > 0) {
          updateExchangeData(EXCHANGES.COINBASE, bids, asks);
        }
      };

      connections.coinbase.onopen = () => {
        console.log('Coinbase WebSocket connected, subscribing to:', exchangeSymbol);
        connections.coinbase.send(JSON.stringify({
          type: 'subscribe',
          product_ids: [exchangeSymbol],
          channels: ['level2']
        }));
      };

      connections.coinbase.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'snapshot') {
          console.log('Received Coinbase snapshot');
          // Reset the order book
          orderBook.bids = new Map();
          orderBook.asks = new Map();

          // Initialize with snapshot data
          data.bids.forEach(([price, size]) => {
            orderBook.bids.set(price, parseFloat(size));
          });
          data.asks.forEach(([price, size]) => {
            orderBook.asks.set(price, parseFloat(size));
          });

          updateLocalOrderBook();
        } else if (data.type === 'l2update') {
          // Update order book with changes
          data.changes.forEach(([side, price, size]) => {
            const sizeFloat = parseFloat(size);
            const targetBook = side === 'buy' ? orderBook.bids : orderBook.asks;

            if (sizeFloat === 0) {
              targetBook.delete(price);
            } else {
              targetBook.set(price, sizeFloat);
            }
          });

          updateLocalOrderBook();
        }
      };

      connections.coinbase.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error);
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

    // Initialize enabled exchanges
    enabledExchanges.forEach(exchangeId => {
      switch (exchangeId) {
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
          break;
      }
    });

    return () => {
      Object.values(connections).forEach(connection => {
        if (connection && connection.readyState === WebSocket.OPEN) {
          connection.close();
        }
      });
    };
  }, [symbol, enabledExchanges]);

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
