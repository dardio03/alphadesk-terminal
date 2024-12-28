import { useState, useEffect, useCallback } from 'react';

const useCoinbaseOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  // Convert Binance/Bybit style symbol to Coinbase format (e.g., BTCUSDT -> BTC-USDT)
  const formatSymbol = (sym) => {
    // Extract the trading pair (assuming standard format like BTCUSDT)
    const base = sym.slice(0, -4); // BTC
    const quote = sym.slice(-4); // USDT
    return `${base}-${quote}`;
  };

  // Function to fetch initial order book snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const formattedSymbol = formatSymbol(symbol);
      const response = await fetch(`https://api.pro.coinbase.com/products/${formattedSymbol}/book?level=2`);
      if (!response.ok) {
        throw new Error('Failed to fetch order book snapshot');
      }
      const data = await response.json();
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
    } catch (err) {
      console.error('Error fetching Coinbase snapshot:', err);
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
        setConnectionState('connecting');
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

        ws.onopen = () => {
          console.log('Coinbase WebSocket connected');
          setConnectionState('connected');
          const formattedSymbol = formatSymbol(symbol);
          ws.send(JSON.stringify({
            type: 'subscribe',
            product_ids: [formattedSymbol],
            channels: ['level2']
          }));
          isSubscribed = true;
          retryCount = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'snapshot') {
              setOrderBook({
                bids: data.bids.slice(0, 20).map(([price, size]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(size)
                })),
                asks: data.asks.slice(0, 20).map(([price, size]) => ({
                  price: parseFloat(price),
                  quantity: parseFloat(size)
                }))
              });
            } else if (data.type === 'l2update') {
              setOrderBook(prev => {
                const newBook = {
                  bids: [...prev.bids],
                  asks: [...prev.asks]
                };

                data.changes.forEach(([side, price, size]) => {
                  const list = side === 'buy' ? newBook.bids : newBook.asks;
                  const priceNum = parseFloat(price);
                  const sizeNum = parseFloat(size);

                  const index = list.findIndex(item => item.price === priceNum);

                  if (sizeNum === 0) {
                    // Remove the price level
                    if (index !== -1) {
                      list.splice(index, 1);
                    }
                  } else {
                    // Update or add the price level
                    if (index !== -1) {
                      list[index].quantity = sizeNum;
                    } else {
                      list.push({ price: priceNum, quantity: sizeNum });
                    }
                  }
                });

                // Sort and limit to 20 levels
                return {
                  bids: newBook.bids.sort((a, b) => b.price - a.price).slice(0, 20),
                  asks: newBook.asks.sort((a, b) => a.price - b.price).slice(0, 20)
                };
              });
            }
          } catch (err) {
            console.error('Error processing Coinbase order book data:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('Coinbase WebSocket error:', err);
          setConnectionState('error');
          setError('Failed to connect to Coinbase');
        };

        ws.onclose = () => {
          console.log('Coinbase WebSocket closed');
          setConnectionState('disconnected');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(connect, 1000 * retryCount);
          } else {
            setError('Failed to maintain connection to Coinbase');
          }
        };
      } catch (err) {
        console.error('Error in Coinbase connection:', err);
        setError('Failed to connect to Coinbase');
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
          const formattedSymbol = formatSymbol(symbol);
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: [formattedSymbol],
            channels: ['level2']
          }));
        }
        ws.close();
      }
    };
  }, [symbol, fetchSnapshot]);

  return { orderBook, error, connectionState };
};

export default useCoinbaseOrderBook;