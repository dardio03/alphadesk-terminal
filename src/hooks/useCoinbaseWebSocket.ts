import { useCallback } from 'react';
import useWebSocket from './useWebSocket';
import { WebSocketHookProps, OrderBookData, CoinbaseWebSocketMessage } from '../types/exchange';

const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';

const formatCoinbaseSymbol = (symbol: string): string => {
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

export const useCoinbaseWebSocket = ({ symbol, onData, onError }: WebSocketHookProps) => {
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const coinbaseMessage = message as CoinbaseWebSocketMessage;
    try {
      if (coinbaseMessage.type === 'snapshot' && coinbaseMessage.bids && coinbaseMessage.asks) {
        const formattedData: OrderBookData = {
          bids: coinbaseMessage.bids.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })),
          asks: coinbaseMessage.asks.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }))
        };
        onData(formattedData);
      } else if (coinbaseMessage.type === 'l2update' && coinbaseMessage.changes) {
        // For l2update messages, we should update the local order book
        // but since we're getting frequent snapshots, we can ignore updates
        // and wait for the next snapshot for simplicity
      }
    } catch (error) {
      onError(`Failed to parse Coinbase data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onData, onError]);

  const { connectionState, sendMessage } = useWebSocket({
    url: COINBASE_WS_URL,
    onMessage: handleMessage,
    onError,
    onConnected: () => {
      const formattedSymbol = formatCoinbaseSymbol(symbol);
      const subscribeMessage = {
        type: 'subscribe',
        product_ids: [formattedSymbol],
        channels: ['level2']
      };
      sendMessage(subscribeMessage);
    },
    onDisconnected: () => {
      onError('Coinbase WebSocket connection closed');
    }
  });

  return {
    connectionState,
    sendMessage
  };
};

export default useCoinbaseWebSocket;