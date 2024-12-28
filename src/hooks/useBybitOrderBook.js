import { useState, useEffect } from 'react';

const useBybitOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
    let isSubscribed = false;

    ws.onopen = () => {
      // Subscribe to orderbook stream
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [`orderbook.20.${symbol}`]
      }));
      isSubscribed = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data && data.data.b && data.data.a) {
          setOrderBook({
            bids: data.data.b.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            })),
            asks: data.data.a.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }))
          });
        }
      } catch (err) {
        console.error('Error processing Bybit order book data:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Bybit WebSocket error:', err);
      setError('Failed to connect to Bybit');
    };

    return () => {
      if (isSubscribed) {
        ws.send(JSON.stringify({
          op: 'unsubscribe',
          args: [`orderbook.20.${symbol}`]
        }));
      }
      ws.close();
    };
  }, [symbol]);

  return { orderBook, error };
};

export default useBybitOrderBook;