import { useState, useEffect, useCallback } from 'react';

const useBybitOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);

  // Function to fetch initial order book snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${symbol}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch order book snapshot');
      }
      const data = await response.json();
      if (data.retCode === 0 && data.result) {
        return {
          bids: data.result.b.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          asks: data.result.a.map(([price, quantity]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }))
        };
      } else {
        throw new Error(data.retMsg || 'Failed to fetch order book data');
      }
    } catch (err) {
      console.error('Error fetching Bybit snapshot:', err);
      throw err;
    }
  }, [symbol]);

  useEffect(() => {
    let ws = null;
    let isSubscribed = false;
    let retryCount = 0;
    const maxRetries = 3;

    const connect = async () => {
      try {
        // First get a snapshot of the order book
        const snapshot = await fetchSnapshot();
        setOrderBook(snapshot);
        setError(null);

        // Then connect to WebSocket for updates
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

        ws.onopen = () => {
          console.log('Bybit WebSocket connected');
          // Subscribe to orderbook stream
          ws.send(JSON.stringify({
            op: 'subscribe',
            args: [`orderbook.20.${symbol}`]
          }));
          isSubscribed = true;
          retryCount = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.topic && data.topic.startsWith('orderbook') && data.data) {
              const { b: bids, a: asks } = data.data;
              if (bids && asks) {
                setOrderBook({
                  bids: bids.map(([price, quantity]) => ({
                    price: parseFloat(price),
                    quantity: parseFloat(quantity)
                  })),
                  asks: asks.map(([price, quantity]) => ({
                    price: parseFloat(price),
                    quantity: parseFloat(quantity)
                  }))
                });
              }
            }
          } catch (err) {
            console.error('Error processing Bybit order book data:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('Bybit WebSocket error:', err);
          setError('Failed to connect to Bybit');
        };

        ws.onclose = () => {
          console.log('Bybit WebSocket closed');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(connect, 1000 * retryCount);
          } else {
            setError('Failed to maintain connection to Bybit');
          }
        };
      } catch (err) {
        console.error('Error in Bybit connection:', err);
        setError('Failed to connect to Bybit');
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connect, 1000 * retryCount);
        }
      }
    };

    connect();

    return () => {
      if (ws) {
        if (isSubscribed) {
          ws.send(JSON.stringify({
            op: 'unsubscribe',
            args: [`orderbook.20.${symbol}`]
          }));
        }
        ws.close();
      }
    };
  }, [symbol, fetchSnapshot]);

  return { orderBook, error };
};

export default useBybitOrderBook;