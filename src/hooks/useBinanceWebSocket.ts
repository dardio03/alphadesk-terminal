import { useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { WebSocketHookProps, OrderBookData, WebSocketMessage, BinanceWebSocketMessage } from '../types/exchange';

// Create WebSocket URL with stream name directly in the URL
const getWebSocketUrl = (symbol: string) => 
  `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`;

export const useBinanceWebSocket = ({ symbol, onData, onError }: WebSocketHookProps) => {
  const handleMessage = useCallback((message: WebSocketMessage) => {
    try {
      console.log('Received Binance message:', message);
      const data = message as BinanceWebSocketMessage;

      // Extract bids and asks from the message
      const bids = data.bids || [];
      const asks = data.asks || [];
      
      // Only process if we have both bids and asks
      if (Array.isArray(bids) && Array.isArray(asks)) {
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
      } else {
        console.warn('Invalid Binance order book data:', {
          hasBids: Array.isArray(bids),
          hasAsks: Array.isArray(asks),
          data
        });
      }
    } catch (error) {
      console.error('Failed to parse Binance message:', message);
      onError(`Failed to parse Binance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onData, onError]);

  const { connectionState, reconnect } = useWebSocket({
    url: getWebSocketUrl(symbol),
    onMessage: handleMessage,
    onError,
    onConnected: () => {
      console.log('Binance WebSocket connected for symbol:', symbol);
    },
    onDisconnected: () => {
      console.log('Binance WebSocket disconnected for symbol:', symbol);
      onError('Binance WebSocket connection closed');
    }
  });

  return {
    connectionState,
    reconnect
  };
};

export default useBinanceWebSocket;