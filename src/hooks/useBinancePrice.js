import { useState, useEffect } from 'react';

const useBinancePrice = (symbol) => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@trade`],
        id: 1
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.p) {
        setPrice(parseFloat(data.p));
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return price;
};

export default useBinancePrice;