import { useState, useEffect, useCallback } from 'react';

const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/public/spot';

export const useBybitWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);

  const connect = useCallback(() => {
    const websocket = new WebSocket(BYBIT_WS_URL);

    websocket.onopen = () => {
      const subscribeMessage = {
        op: 'subscribe',
        args: [`orderbook.20.${symbol}`]
      };
      websocket.send(JSON.stringify(subscribeMessage));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle initial snapshot and delta updates
        if (data.type === 'snapshot' || data.type === 'delta') {
          if (data.data && data.data.b && data.data.a) {
            const formattedData = {
              bids: data.data.b.map(([price, quantity]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity)
              })),
              asks: data.data.a.map(([price, quantity]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity)
              }))
            };
            onData(formattedData);
          }
        }
      } catch (error) {
        onError(`Failed to parse Bybit data: ${error.message}`);
      }
    };

    websocket.onerror = (error) => {
      onError(`Bybit WebSocket error: ${error.message}`);
    };

    websocket.onclose = () => {
      onError('Bybit WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = {
          op: 'unsubscribe',
          args: [`orderbook.20.${symbol}`]
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