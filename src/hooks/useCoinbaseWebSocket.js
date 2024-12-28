import { useState, useEffect, useCallback, useRef } from 'react';

const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';

const formatCoinbaseSymbol = (symbol) => {
  // Handle common formats
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)}-USDT`;
  } else if (symbol.endsWith('USD')) {
    return `${symbol.slice(0, -3)}-USD`;
  } else if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
  }
  return symbol;
};

export const useCoinbaseWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const reconnectTimeout = useRef(null);
  const maxRetries = 5;
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    if (onData.toString() === '() => false') {
      return () => {};
    }

    try {
      setConnectionState('connecting');
      const websocket = new WebSocket(COINBASE_WS_URL);

      websocket.onopen = () => {
        setConnectionState('connected');
        retryCount.current = 0;
        const coinbaseSymbol = formatCoinbaseSymbol(symbol);
        
        const subscribeMessage = {
          type: 'subscribe',
          product_ids: [coinbaseSymbol],
          channels: ['level2']
        };
        websocket.send(JSON.stringify(subscribeMessage));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'snapshot') {
            const formattedData = {
              bids: data.bids.slice(0, 20).map(([price, size]) => ({
                price: parseFloat(price),
                quantity: parseFloat(size)
              })),
              asks: data.asks.slice(0, 20).map(([price, size]) => ({
                price: parseFloat(price),
                quantity: parseFloat(size)
              }))
            };
            onData(formattedData);
          } else if (data.type === 'l2update') {
            // For l2update messages, we should update the local order book
            // but since we're getting frequent snapshots, we can ignore updates
            // and wait for the next snapshot for simplicity
          }
        } catch (error) {
          onError(`Failed to parse Coinbase data: ${error.message}`);
        }
      };

      websocket.onerror = (error) => {
        setConnectionState('error');
        onError(`Coinbase WebSocket error: ${error.message}`);
        websocket.close();
      };

      websocket.onclose = (event) => {
        setConnectionState('disconnected');
        onError(`Coinbase WebSocket connection closed: ${event.code}`);
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        
        if (retryCount.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current += 1;
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          onError('Max reconnection attempts reached');
        }
      };

      setWs(websocket);

      return () => {
        if (websocket.readyState === WebSocket.OPEN) {
          const coinbaseSymbol = formatCoinbaseSymbol(symbol);
          const unsubscribeMessage = {
            type: 'unsubscribe',
            product_ids: [coinbaseSymbol],
            channels: ['level2']
          };
          websocket.send(JSON.stringify(unsubscribeMessage));
          websocket.close();
        }
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
      };
    } catch (error) {
      setConnectionState('error');
      onError(`Failed to connect to Coinbase: ${error.message}`);
      return () => {};
    }
  }, [symbol, onData, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup();
    };
  }, [connect]);

  return ws;
};