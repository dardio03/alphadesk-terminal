import { useState, useEffect, useCallback } from 'react';

const useBinanceOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  // Function to fetch initial order book snapshot
  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch order book snapshot');
      }
      const data = await response.json();
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
    } catch (err) {
      console.error('Error fetching Binance snapshot:', err);
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
        ws = new WebSocket('wss://stream.binance.com/ws');

        ws.onopen = () => {
          console.log('Binance WebSocket connected');
          setConnectionState('connected');
          ws.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: [`${symbol.toLowerCase()}@depth@100ms`],
            id: 1
          }));
          isSubscribed = true;
          retryCount = 0; // Reset retry count on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.e === 'depthUpdate') {
              setOrderBook(prev => {
                // Update bids
                const newBids = [...prev.bids];
                data.b.forEach(([price, quantity]) => {
                  const priceNum = parseFloat(price);
                  const quantityNum = parseFloat(quantity);
                  const index = newBids.findIndex(bid => bid.price === priceNum);
                  
                  if (quantityNum === 0) {
                    if (index !== -1) newBids.splice(index, 1);
                  } else {
                    if (index !== -1) {
                      newBids[index].quantity = quantityNum;
                    } else {
                      newBids.push({ price: priceNum, quantity: quantityNum });
                    }
                  }
                });

                // Update asks
                const newAsks = [...prev.asks];
                data.a.forEach(([price, quantity]) => {
                  const priceNum = parseFloat(price);
                  const quantityNum = parseFloat(quantity);
                  const index = newAsks.findIndex(ask => ask.price === priceNum);
                  
                  if (quantityNum === 0) {
                    if (index !== -1) newAsks.splice(index, 1);
                  } else {
                    if (index !== -1) {
                      newAsks[index].quantity = quantityNum;
                    } else {
                      newAsks.push({ price: priceNum, quantity: quantityNum });
                    }
                  }
                });

                // Sort and limit to 20 levels
                return {
                  bids: newBids.sort((a, b) => b.price - a.price).slice(0, 20),
                  asks: newAsks.sort((a, b) => a.price - b.price).slice(0, 20)
                };
              });
            }
          } catch (err) {
            console.error('Error processing Binance order book data:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('Binance WebSocket error:', err);
          setConnectionState('error');
          setError('Failed to connect to Binance');
        };

        ws.onclose = () => {
          console.log('Binance WebSocket closed');
          setConnectionState('disconnected');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(connect, 1000 * retryCount); // Exponential backoff
          } else {
            setError('Failed to maintain connection to Binance');
          }
        };
      } catch (err) {
        console.error('Error in Binance connection:', err);
        setError('Failed to connect to Binance');
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
            method: 'UNSUBSCRIBE',
            params: [`${symbol.toLowerCase()}@depth@100ms`],
            id: 2
          }));
        }
        ws.close();
      }
    };
  }, [symbol, fetchSnapshot]);

  return { orderBook, error, connectionState };
};

export default useBinanceOrderBook;