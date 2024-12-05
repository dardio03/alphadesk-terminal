import { useState, useEffect, useCallback, useRef } from 'react';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export const useBinanceWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
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
      websocket.close();
    };

    websocket.onclose = () => {
      onError('Binance WebSocket connection closed');
      setWs(null);
      
      // Clear any existing reconnection timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = {
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth20@100ms`],
          id: 1
        };
        websocket.send(JSON.stringify(unsubscribeMessage));
        websocket.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  } catch (error) {
    onError(`Failed to connect to Binance: ${error.message}`);
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