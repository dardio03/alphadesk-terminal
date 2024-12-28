import { useState, useEffect } from 'react';

const useCoinbasePrice = (symbol) => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://ws-feed.pro.coinbase.com');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [symbol],
        channels: ['ticker']
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticker' && data.price) {
        setPrice(parseFloat(data.price));
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return price;
};

export default useCoinbasePrice;