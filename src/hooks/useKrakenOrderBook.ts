import { useState, useEffect, useCallback } from 'react';
import { OrderBookEntry } from '../types/exchange';
import useWebSocket from './useWebSocket';

interface KrakenOrderBookData {
  asks: [string, string, number][];
  bids: [string, string, number][];
}

interface KrakenMessage {
  event?: string;
  pair?: string[];
  status?: string;
  channelID?: number;
  channelName?: string;
  subscription?: {
    name: string;
  };
}

const useKrakenOrderBook = (symbol: string) => {
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({
    bids: [],
    asks: [],
  });

  // Convert Kraken pair format (e.g., BTCUSDT -> XBT/USD)
  const getKrakenPair = useCallback((symbol: string) => {
    const base = symbol.slice(0, -4);
    const quote = symbol.slice(-4);
    const krakenBase = base === 'BTC' ? 'XBT' : base;
    const krakenQuote = quote === 'USDT' ? 'USD' : quote;
    return `${krakenBase}/${krakenQuote}`;
  }, []);

  const krakenPair = getKrakenPair(symbol);

  // Subscribe message
  const subscribeMessage = {
    event: 'subscribe',
    pair: [krakenPair],
    subscription: {
      name: 'book',
      depth: 100
    }
  };

  // Process message from WebSocket
  const processMessage = useCallback((message: any) => {
    try {
      // Handle subscription confirmation
      if (message.event === 'subscriptionStatus' && message.status === 'subscribed') {
        console.log('Subscribed to Kraken orderbook:', message);
        return;
      }

      // Handle orderbook updates
      if (Array.isArray(message) && message.length >= 4) {
        const [channelId, data, channelName, pair] = message;
        
        if (channelName === 'book') {
          const processOrders = (orders: [string, string, number][]) => {
            return orders.map(([price, volume]) => ({
              price: parseFloat(price),
              quantity: parseFloat(volume),
            }));
          };

          setOrderBook(prev => {
            const newBook = { ...prev };

            if (data.a) { // asks update
              const asks = processOrders(data.a);
              newBook.asks = [...prev.asks, ...asks]
                .sort((a, b) => a.price - b.price)
                .slice(0, 100);
            }

            if (data.b) { // bids update
              const bids = processOrders(data.b);
              newBook.bids = [...prev.bids, ...bids]
                .sort((a, b) => b.price - a.price)
                .slice(0, 100);
            }

            return newBook;
          });
        }
      }
    } catch (error) {
      console.error('Error processing Kraken message:', error);
    }
  }, []);

  // Initialize WebSocket connection
  const { connectionState, error, reconnect, sendMessage } = useWebSocket({
    url: 'wss://ws.kraken.com',
    onMessage: processMessage,
    onConnected: () => {
      sendMessage(subscribeMessage);
    }
  });

  return {
    orderBook,
    connectionState,
    error,
    reconnect
  };
};

export default useKrakenOrderBook;