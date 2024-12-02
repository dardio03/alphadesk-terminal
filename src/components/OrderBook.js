// LivePrice Component
import React, { useEffect, useState } from 'react';
import './OrderBook.css';

const LivePrice = () => {
  const [binancePrice, setBinancePrice] = useState(null);
  const [bybitPrice, setBybitPrice] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Initiales Abrufen des Binance Preises
        const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const binanceData = await binanceResponse.json();
        setBinancePrice(binanceData.price);

        // Initiales Abrufen des Bybit Preises
        const bybitResponse = await fetch('https://api.bybit.com/v2/public/tickers?symbol=BTCUSDT');
        const bybitData = await bybitResponse.json();
        if (bybitData.result && bybitData.result.length > 0) {
          setBybitPrice(bybitData.result[0].last_price);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der initialen Daten:', error);
      }
    };

    fetchInitialData();

    // Set up WebSocket connection for Binance live price updates
    const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

    binanceSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setBinancePrice(data.p); // 'p' is the price in the WebSocket data
    };

    // Set up WebSocket connection for Bybit live price updates
    const bybitSocket = new WebSocket('wss://stream.bybit.com/realtime_public');

    bybitSocket.onopen = () => {
      // Subscribe to BTCUSDT trades
      bybitSocket.send(JSON.stringify({
        op: 'subscribe',
        args: ['trade.BTCUSDT'],
      }));
    };

    bybitSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === 'trade.BTCUSDT' && data.data && data.data.length > 0) {
        setBybitPrice(data.data[0].price); // Get the latest price from Bybit trade data
      }
    };

    return () => {
      binanceSocket.close();
      bybitSocket.close();
    };
  }, []);

  return (
    <div>
      <p>Binance Price: {binancePrice ? `${binancePrice} USDT` : 'Loading...'}</p>
      <p>Bybit Price: {bybitPrice ? `${bybitPrice} USDT` : 'Loading...'}</p>
    </div>
  );
};

export default LivePrice;
