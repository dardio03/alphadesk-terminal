import { useState, useEffect, useCallback } from 'react';

export const EXCHANGES = {
  BINANCE: 'binance',
  BYBIT: 'bybit',
  COINBASE: 'coinbase'
};

const getExchangeSymbol = (exchange, symbol) => {
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

const useBinanceWebSocket = (symbol, onUpdate, onError) => {
  useEffect(() => {
    let ws = null;
    
    const connect = async () => {
      try {
        // Initial snapshot
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
        const data = await response.json();
        
        if (data.code) {
          throw new Error(data.msg);
        }
        
        const initialBids = data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }));
        
        const initialAsks = data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }));

        onUpdate(EXCHANGES.BINANCE, initialBids, initialAsks);

        // WebSocket connection
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth@100ms`);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const bids = data.b.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));
          const asks = data.a.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));
          onUpdate(EXCHANGES.BINANCE, bids, asks);
        };

        ws.onerror = () => {
          onError('Binance WebSocket connection failed');
        };
      } catch (error) {
        console.error('Error loading Binance order book:', error);
        onError('Failed to load Binance order book');
      }
    };

    connect();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, onUpdate, onError]);
};

const useBybitWebSocket = (symbol, onUpdate, onError) => {
  useEffect(() => {
    let ws = null;
    
    const connect = async () => {
      try {
        const bybitSymbol = getExchangeSymbol(EXCHANGES.BYBIT, symbol);
        
        // Initial snapshot
        const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${bybitSymbol}&limit=20`);
        const data = await response.json();
        
        if (data.retCode !== 0) {
          throw new Error(data.retMsg);
        }
        
        if (data.result && data.result.b && data.result.a) {
          const initialBids = data.result.b.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));
          
          const initialAsks = data.result.a.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }));

          onUpdate(EXCHANGES.BYBIT, initialBids, initialAsks);
        }

        // WebSocket connection
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

        ws.onopen = () => {
          ws.send(JSON.stringify({
            op: 'subscribe',
            args: [`orderbook.20.${bybitSymbol}`]
          }));
        };

        ws.onmessage = (event) => {
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
              onUpdate(EXCHANGES.BYBIT, bids, asks);
            }
          }
        };

        ws.onerror = (error) => {
          console.error('Bybit WebSocket error:', error);
          onError('Bybit WebSocket connection failed');
        };
      } catch (error) {
        console.error('Error loading Bybit order book:', error);
        onError('Failed to load Bybit order book');
      }
    };

    connect();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, onUpdate, onError]);
};

const useCoinbaseWebSocket = (symbol, onUpdate, onError) => {
  useEffect(() => {
    let ws = null;
    let orderBook = {
      bids: new Map(),
      asks: new Map()
    };
    
    const connect = async () => {
      try {
        const exchangeSymbol = getExchangeSymbol(EXCHANGES.COINBASE, symbol);
        console.log('Setting up Coinbase WebSocket for symbol:', exchangeSymbol);

        // Initial snapshot
        const response = await fetch(`https://api.exchange.coinbase.com/products/${exchangeSymbol}/book?level=2`);
        const data = await response.json();
        
        if (data.message) {
          throw new Error(data.message);
        }

        if (data.bids && data.asks) {
          // Initialize order book with snapshot
          orderBook.bids.clear();
          orderBook.asks.clear();

          data.bids.forEach(([price, size]) => {
            orderBook.bids.set(price, parseFloat(size));
          });
          data.asks.forEach(([price, size]) => {
            orderBook.asks.set(price, parseFloat(size));
          });

          updateLocalOrderBook();
        }

        // WebSocket connection
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

        ws.onopen = () => {
          console.log('Coinbase WebSocket connected, subscribing to:', exchangeSymbol);
          ws.send(JSON.stringify({
            type: 'subscribe',
            product_ids: [exchangeSymbol],
            channels: ['level2']
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'snapshot') {
            console.log('Received Coinbase snapshot');
            // Reset the order book
            orderBook.bids.clear();
            orderBook.asks.clear();

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

        ws.onerror = (error) => {
          console.error('Coinbase WebSocket error:', error);
          onError('Coinbase WebSocket connection failed');
        };
      } catch (error) {
        console.error('Error loading Coinbase order book:', error);
        onError('Failed to load Coinbase order book');
      }
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
        onUpdate(EXCHANGES.COINBASE, bids, asks);
      }
    };

    connect();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, onUpdate, onError]);
};

export const useOrderBookWebSocket = (symbol, enabledExchanges, onUpdate, onError) => {
  useEffect(() => {
    const connections = [];

    enabledExchanges.forEach(exchange => {
      switch (exchange) {
        case EXCHANGES.BINANCE:
          connections.push(useBinanceWebSocket(symbol, onUpdate, onError));
          break;
        case EXCHANGES.BYBIT:
          connections.push(useBybitWebSocket(symbol, onUpdate, onError));
          break;
        case EXCHANGES.COINBASE:
          connections.push(useCoinbaseWebSocket(symbol, onUpdate, onError));
          break;
        default:
          break;
      }
    });

    return () => {
      connections.forEach(cleanup => cleanup && cleanup());
    };
  }, [symbol, enabledExchanges, onUpdate, onError]);
};
