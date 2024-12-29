import { useState, useEffect, useCallback } from 'react';
import { OrderBookData, ExchangeHookResult, CoinbaseWebSocketMessage } from '../types/exchange';
import useCoinbaseWebSocket from './useCoinbaseWebSocket';

const formatCoinbaseSymbol = (symbol: string): string => {
  if (symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)}-USDT`;
  } else if (symbol.endsWith('USD')) {
    return `${symbol.slice(0, -3)}-USD`;
  } else if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
  }
  return symbol;
};

const useCoinbaseOrderBook = (symbol: string): ExchangeHookResult => {
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [error, setError] = useState<string | null>(null);

  const handleData = useCallback((data: OrderBookData) => {
    setOrderBook(data);
    setError(null);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);

  const { connectionState, reconnect } = useCoinbaseWebSocket({
    symbol,
    onData: handleData,
    onError: handleError
  });

  // Function to fetch initial order book snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const formattedSymbol = formatCoinbaseSymbol(symbol);
      const response = await fetch(`https://api.pro.coinbase.com/products/${formattedSymbol}/book?level=2`);
      if (!response.ok) {
        throw new Error('Failed to fetch order book snapshot');
      }
      const data: CoinbaseWebSocketMessage = await response.json();
      if (data.bids && data.asks) {
        return {
          bids: data.bids.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })),
          asks: data.asks.slice(0, 20).map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }))
        };
      }
      throw new Error('Invalid snapshot data');
    } catch (err) {
      console.error('Error fetching Coinbase snapshot:', err);
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

export default useCoinbaseOrderBook;