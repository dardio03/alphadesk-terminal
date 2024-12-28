import { useState, useEffect, useCallback, useRef } from 'react';

const BINANCE_WS_URL = 'wss://stream.binance.com/ws';

export const useBinanceWebSocket = (symbol, onData, onError) => {
  const [ws, setWs] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const reconnectTimeout = useRef(null);
  const maxRetries = 5;
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    try {
      setConnectionState('connecting');
      const websocket = new WebSocket(BINANCE_WS_URL);

      websocket.onopen = () => {
        setConnectionState('connected');
        retryCount.current = 0;
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
        setConnectionState('error');
        onError(`Binance WebSocket error: ${error.message}`);
        websocket.close();
      };

      websocket.onclose = (event) => {
        setConnectionState('disconnected');
        onError(`Binance WebSocket connection closed: ${event.code}`);
        setWs(null);
        
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
      setConnectionState('error');
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