import { useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { WebSocketHookProps, OrderBookData, WebSocketMessage, BinanceWebSocketMessage } from '../types/exchange';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export const useBinanceWebSocket = ({ symbol, onData, onError }: WebSocketHookProps) => {
  const handleMessage = useCallback((message: WebSocketMessage) => {
    try {
      const data = message as BinanceWebSocketMessage;
      
      // Handle subscription response
      if (data.result === null && data.id) {
        console.log('Binance subscription successful');
        return;
      }

      // Handle order book updates
      if (data.stream?.endsWith('@depth@100ms') && data.data) {
        const { b: bids = [], a: asks = [] } = data.data;
        
        // Only process if we have both bids and asks
        if (Array.isArray(bids) && Array.isArray(asks)) {
          try {
            const formattedData: OrderBookData = {
              bids: bids.map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity)
              })),
              asks: asks.map(([price, quantity]: [string, string]) => ({
                price: parseFloat(price),
                quantity: parseFloat(quantity)
              }))
            };
            onData(formattedData);
          } catch (err) {
            console.error('Failed to process Binance order book data:', {
              error: err,
              bids,
              asks,
              data: data.data
            });
            onError(`Failed to process order book data: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        } else {
          console.warn('Invalid Binance order book data:', {
            hasBids: Array.isArray(bids),
            hasAsks: Array.isArray(asks),
            data: data.data
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse Binance message:', message);
      onError(`Failed to parse Binance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onData, onError]);

  const { connectionState, sendMessage, reconnect } = useWebSocket({
    url: BINANCE_WS_URL,
    onMessage: handleMessage,
    onError,
    onConnected: () => {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth@100ms`],
        id: Date.now()
      };
      sendMessage(subscribeMessage);
    },
    onDisconnected: () => {
      onError('Binance WebSocket connection closed');
    }
  });

  return {
    connectionState,
    sendMessage,
    reconnect
  };
};

export default useBinanceWebSocket;