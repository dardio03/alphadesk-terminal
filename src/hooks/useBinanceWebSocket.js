import { useState, useEffect, useCallback } from 'react';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export const useBinanceWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);

  const connect = useCallback(() => {
    const websocket = new WebSocket(BINANCE_WS_URL);

    websocket.onopen = () => {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth20@100ms`],
        id: 1
      };
      websocket.send(JSON.stringify(subscribeMessage));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bids && data.asks) {
          const formattedData = {
            bids: data.bids.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            })),
            asks: data.asks.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }))
          };
          onData(formattedData);
        }
      } catch (error) {
        onError(`Failed to parse Binance data: ${error.message}`);
      }
    };

    websocket.onerror = (error) => {
      onError(`Binance WebSocket error: ${error.message}`);
    };

    websocket.onclose = () => {
      onError('Binance WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
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