import { useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { WebSocketHookProps, OrderBookData, BinanceWebSocketMessage } from '../types/exchange';

const BINANCE_WS_URL = 'wss://stream.binance.com/ws';

export const useBinanceWebSocket = ({ symbol, onData, onError }: WebSocketHookProps) => {
  const handleMessage = useCallback((message: BinanceWebSocketMessage) => {
    try {
      if (message.bids && message.asks) {
        const formattedData: OrderBookData = {
          bids: message.bids.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          asks: message.asks.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }))
        };
        onData(formattedData);
      }
    } catch (error) {
      onError(`Failed to parse Binance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onData, onError]);

  const { connectionState, sendMessage } = useWebSocket({
    url: BINANCE_WS_URL,
    onMessage: handleMessage,
    onError,
    onConnected: () => {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth20@100ms`],
        id: 1
      };
      sendMessage(subscribeMessage);
    },
    onDisconnected: () => {
      onError('Binance WebSocket connection closed');
    }
  });

  return {
    connectionState,
    sendMessage
  };
};

export default useBinanceWebSocket;