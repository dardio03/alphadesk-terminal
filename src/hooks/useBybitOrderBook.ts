import { useState } from 'react';
import { ExchangeHookResult } from '../types/exchange';

const useBybitOrderBook = (symbol: string): ExchangeHookResult => {
  const [orderBook] = useState({ bids: [], asks: [] });
  const [error] = useState<string | null>(null);
  const [connectionState] = useState<'disconnected'>('disconnected');

  // TODO: Implement Bybit integration
  const reconnect = () => {
    // TODO: Implement Bybit reconnection
    console.log('Bybit reconnection not implemented yet');
  };

  return { orderBook, error, connectionState, reconnect };
};

export default useBybitOrderBook;