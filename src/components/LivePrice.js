// LivePrice Component
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './OrderBook.css';

const AggregatedOrderBook = () => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [binancePrice, setBinancePrice] = useState(null);
  const [bybitPrice, setBybitPrice] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Initiales Abrufen des Binance Preises
        const binanceResponse = await axios.get('https://api.binance.com/api/v3/ticker/price', {
          params: { symbol: 'BTCUSDT' },
        });
        setBinancePrice(binanceResponse.data.price);

        // Initiales Abrufen des Bybit Preises
        const bybitResponse = await axios.get('https://api.bybit.com/v2/public/tickers', {
          params: { symbol: 'BTCUSDT' },
        });
        if (bybitResponse.data.result && bybitResponse.data.result.length > 0) {
          setBybitPrice(bybitResponse.data.result[0].last_price);
        }

        // Initiales Abrufen des Binance Order Books
        const binanceOrderBookResponse = await axios.get('https://api.binance.com/api/v3/depth', {
          params: { symbol: 'BTCUSDT', limit: 10 },
        });
        const binanceOrderBook = binanceOrderBookResponse.data;

        // Initiales Abrufen des Bybit Order Books
        const bybitOrderBookResponse = await axios.get('https://api.bybit.com/v2/public/orderBook/L2', {
          params: { symbol: 'BTCUSDT' },
        });
        const bybitOrderBook = bybitOrderBookResponse.data.result;

        // Transformation der Bybit-Daten in das gleiche Format wie Binance
        const bybitBids = bybitOrderBook
          .filter((order) => order.side === 'Buy')
          .map((order) => [parseFloat(order.price), parseFloat(order.size)]);
        const bybitAsks = bybitOrderBook
          .filter((order) => order.side === 'Sell')
          .map((order) => [parseFloat(order.price), parseFloat(order.size)]);

        // Aggregation der Bids
        const aggregatedBids = [...binanceOrderBook.bids, ...bybitBids]
          .map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)])
          .sort((a, b) => b[0] - a[0]) // Sortiere nach Preis absteigend
          .slice(0, 10); // Begrenze auf Top 10

        // Aggregation der Asks
        const aggregatedAsks = [...binanceOrderBook.asks, ...bybitAsks]
          .map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)])
          .sort((a, b) => a[0] - b[0]) // Sortiere nach Preis aufsteigend
          .slice(0, 10); // Begrenze auf Top 10

        setOrderBook({ bids: aggregatedBids, asks: aggregatedAsks });
      } catch (error) {
        console.error('Fehler beim Abrufen der initialen Daten:', error);
      }
    };

    fetchInitialData();

    // WebSocket-Verbindung für Binance Order Book-Updates
    const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth');
    binanceSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.b || data.a) {
        setOrderBook((prevOrderBook) => ({
          bids: data.b ? [...data.b, ...prevOrderBook.bids].slice(0, 10) : prevOrderBook.bids,
          asks: data.a ? [...data.a, ...prevOrderBook.asks].slice(0, 10) : prevOrderBook.asks,
        }));
      }
    };

    // WebSocket-Verbindung für Bybit Order Book-Updates
    const bybitSocket = new WebSocket('wss://stream.bybit.com/realtime_public');
    bybitSocket.onopen = () => {
      bybitSocket.send(
        JSON.stringify({
          op: 'subscribe',
          args: ['orderBookL2_25.BTCUSDT'],
        })
      );
    };
    bybitSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === 'orderBookL2_25.BTCUSDT' && data.data) {
        const bybitBids = data.data
          .filter((order) => order.side === 'Buy')
          .map((order) => [parseFloat(order.price), parseFloat(order.size)]);
        const bybitAsks = data.data
          .filter((order) => order.side === 'Sell')
          .map((order) => [parseFloat(order.price), parseFloat(order.size)]);

        setOrderBook((prevOrderBook) => ({
          bids: [...bybitBids, ...prevOrderBook.bids].slice(0, 10),
          asks: [...bybitAsks, ...prevOrderBook.asks].slice(0, 10),
        }));
      }
    };

    return () => {
      binanceSocket.close();
      bybitSocket.close();
    };
  }, []);

  return (
    <div>
      <div>
        <p>Binance Price: {binancePrice ? `${binancePrice} USDT` : 'Loading...'}</p>
        <p>Bybit Price: {bybitPrice ? `${bybitPrice} USDT` : 'Loading...'}</p>
      </div>
      <div className="order-book-container">
        <h2>Aggregated Order Book (Top 10)</h2>
        <div className="order-book">
          <div className="order-book-side">
            <h3>Bids</h3>
            <table className="order-book-table">
              <thead>
                <tr>
                  <th>Price (USDT)</th>
                  <th>Quantity (BTC)</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.bids.map((bid, index) => (
                  <tr key={index} className="bid-row">
                    <td>{typeof bid[0] === 'number' ? bid[0].toFixed(2) : 'N/A'}</td>
                    <td>{typeof bid[1] === 'number' ? bid[1].toFixed(4) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-book-side">
            <h3>Asks</h3>
            <table className="order-book-table">
              <thead>
                <tr>
                  <th>Price (USDT)</th>
                  <th>Quantity (BTC)</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.asks.map((ask, index) => (
                  <tr key={index} className="ask-row">
                    <td>{typeof ask[0] === 'number' ? ask[0].toFixed(2) : 'N/A'}</td>
                    <td>{typeof ask[1] === 'number' ? ask[1].toFixed(4) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AggregatedOrderBook;
