import { useState, useEffect, useCallback } from 'react';
import { OrderBookData, ExchangeHookResult, BinanceDepthResponse } from '../types/exchange';
import useBinanceWebSocket from './useBinanceWebSocket';

const useBinanceOrderBook = (symbol: string): ExchangeHookResult => {
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [error, setError] = useState<string | null>(null);

  const handleData = useCallback((data: OrderBookData) => {
    setOrderBook(data);
    setError(null);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);

  const { connectionState, reconnect } = useBinanceWebSocket({
    symbol,
    onData: handleData,
    onError: handleError
  });

  // Function to fetch initial order book snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch order book snapshot');
      }
      const data: BinanceDepthResponse = await response.json();
      if (data.bids && data.asks) {
        return {
          bids: data.bids.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          asks: data.asks.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }))
        };
      }
      throw new Error('Invalid snapshot data');
    } catch (err) {
      console.error('Error fetching Binance snapshot:', err);
      throw err;
    }
  }, [symbol]);

  useEffect(() => {
    fetchSnapshot()
      .then(snapshot => {
        setOrderBook(snapshot);
        setError(null);
      })
      .catch(err => {
        setError(`Failed to fetch initial snapshot: ${err instanceof Error ? err.message : 'Unknown error'}`);
      });
  }, [fetchSnapshot]);

  return { orderBook, error, connectionState, reconnect };
};

export default useBinanceOrderBook;