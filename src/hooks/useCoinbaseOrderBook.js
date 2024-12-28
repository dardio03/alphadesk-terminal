import { useState, useEffect } from 'react';

const useCoinbaseOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://ws-feed.pro.coinbase.com');
    let isSubscribed = false;

    ws.onopen = () => {
      // Subscribe to level2 orderbook
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [symbol],
        channels: ['level2']
      }));
      isSubscribed = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'snapshot') {
          setOrderBook({
            bids: data.bids.slice(0, 20).map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            })),
            asks: data.asks.slice(0, 20).map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity)
            }))
          });
        } else if (data.type === 'l2update') {
          setOrderBook(prev => {
            const newBook = { ...prev };
            data.changes.forEach(([side, price, quantity]) => {
              const list = side === 'buy' ? newBook.bids : newBook.asks;
              const priceNum = parseFloat(price);
              const quantityNum = parseFloat(quantity);

              // Remove price level if quantity is 0
              if (quantityNum === 0) {
                const index = list.findIndex(item => item.price === priceNum);
                if (index !== -1) {
                  list.splice(index, 1);
                }
              } else {
                // Update or add price level
                const index = list.findIndex(item => item.price === priceNum);
                if (index !== -1) {
                  list[index].quantity = quantityNum;
                } else {
                  list.push({ price: priceNum, quantity: quantityNum });
                }
              }

              // Sort and limit to 20 levels
              newBook.bids.sort((a, b) => b.price - a.price).slice(0, 20);
              newBook.asks.sort((a, b) => a.price - b.price).slice(0, 20);
            });
            return newBook;
          });
        }
      } catch (err) {
        console.error('Error processing Coinbase order book data:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Coinbase WebSocket error:', err);
      setError('Failed to connect to Coinbase');
    };

    return () => {
      if (isSubscribed) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          product_ids: [symbol],
          channels: ['level2']
        }));
      }
      ws.close();
    };
  }, [symbol]);

  return { orderBook, error };
};

export default useCoinbaseOrderBook;