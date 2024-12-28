import { useState, useEffect } from 'react';

const useBybitPrice = (symbol) => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [`tickers.${symbol}`]
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.data && data.data.lastPrice) {
        setPrice(parseFloat(data.data.lastPrice));
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return price;
};

export default useBybitPrice;