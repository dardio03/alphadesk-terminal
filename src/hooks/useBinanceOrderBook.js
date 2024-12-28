import { useState, useEffect } from 'react';

const useBinanceOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws');
    let isSubscribed = false;

    ws.onopen = () => {
      // First, subscribe to depth stream
      ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth20@100ms`],
        id: 1
      }));
      isSubscribed = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bids && data.asks) {
          setOrderBook({
            bids: data.bids.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            })),
            asks: data.asks.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }))
          });
        }
      } catch (err) {
        console.error('Error processing Binance order book data:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Binance WebSocket error:', err);
      setError('Failed to connect to Binance');
    };

    return () => {
      if (isSubscribed) {
        ws.send(JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth20@100ms`],
          id: 2
        }));
      }
      ws.close();
    };
  }, [symbol]);

  return { orderBook, error };
};

export default useBinanceOrderBook;