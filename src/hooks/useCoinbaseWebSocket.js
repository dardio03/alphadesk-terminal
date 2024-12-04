import { useState, useEffect, useCallback } from 'react';

const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';

export const useCoinbaseWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);

  const connect = useCallback(() => {
    const websocket = new WebSocket(COINBASE_WS_URL);

    websocket.onopen = () => {
      // Convert symbol format from BTCUSDT to BTC-USDT for Coinbase
      const coinbaseSymbol = symbol.replace(/^(.{3})(.*)$/, '$1-$2');
      
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
      onError(`Coinbase WebSocket error: ${error.message}`);
    };

    websocket.onclose = () => {
      onError('Coinbase WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        const coinbaseSymbol = symbol.replace(/^(.{3})(.*)$/, '$1-$2');
        const unsubscribeMessage = {
          type: 'unsubscribe',
          product_ids: [coinbaseSymbol],
          channels: ['level2']
        };
        websocket.send(JSON.stringify(unsubscribeMessage));
        websocket.close();
      }
    };
  }, [symbol, onData, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup();
    };
  }, [connect]);

  return ws;
};