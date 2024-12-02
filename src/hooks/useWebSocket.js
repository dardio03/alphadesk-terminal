import React, { useEffect, useState } from 'react';

const LivePrice = () => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    // WebSocket-Verbindung zu Binance für BTC/USDT Preisbewegungen
    const socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrice(data.p); // 'p' ist der Preis in den WebSocket-Daten
    };

    // WebSocket-Verbindung schließen bei Komponentendemontage
    return () => {
      socket.close();
    };
  }, []);

  return (
    <div>
      <h2>Aktueller BTC/USDT Preis:</h2>
      <p>{price ? `${price} USDT` : 'Lade...'}</p>
    </div>
  );
};

export default LivePrice;
