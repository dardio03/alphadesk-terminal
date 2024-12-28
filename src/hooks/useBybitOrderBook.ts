import { useState } from 'react';
import { ExchangeHookResult } from '../types/exchange';

const useBybitOrderBook = (symbol: string): ExchangeHookResult => {
  const [orderBook] = useState({ bids: [], asks: [] });
  const [error] = useState<string | null>(null);
  const [connectionState] = useState<'disconnected'>('disconnected');

  // TODO: Implement Bybit integration
  return { orderBook, error, connectionState };
};

export default useBybitOrderBook;