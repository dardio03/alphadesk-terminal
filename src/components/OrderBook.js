import React, { useEffect, useState } from 'react';
import './OrderBook.css';

const OrderBook = ({ symbol = 'BTCUSDT' }) => {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [lastUpdateId, setLastUpdateId] = useState(0);

  useEffect(() => {
    // Initiales Laden des Order Books
    const fetchOrderBook = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
        const data = await response.json();
        
        setBids(data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })));
        
        setAsks(data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })));
        
        setLastUpdateId(data.lastUpdateId);
      } catch (error) {
        console.error('Fehler beim Laden des Order Books:', error);
      }
    };

    fetchOrderBook();

    // WebSocket für Live Updates
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth@100ms`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update Bids
      const newBids = [...bids];
      data.b.forEach(([price, quantity]) => {
        const priceFloat = parseFloat(price);
        const quantityFloat = parseFloat(quantity);
        
        const index = newBids.findIndex(bid => bid.price === priceFloat);
        
        if (quantityFloat === 0) {
          if (index !== -1) newBids.splice(index, 1);
        } else {
          if (index !== -1) {
            newBids[index].quantity = quantityFloat;
          } else {
            newBids.push({ price: priceFloat, quantity: quantityFloat });
          }
        }
      });
      newBids.sort((a, b) => b.price - a.price);
      setBids(newBids.slice(0, 20));

      // Update Asks
      const newAsks = [...asks];
      data.a.forEach(([price, quantity]) => {
        const priceFloat = parseFloat(price);
        const quantityFloat = parseFloat(quantity);
        
        const index = newAsks.findIndex(ask => ask.price === priceFloat);
        
        if (quantityFloat === 0) {
          if (index !== -1) newAsks.splice(index, 1);
        } else {
          if (index !== -1) {
            newAsks[index].quantity = quantityFloat;
          } else {
            newAsks.push({ price: priceFloat, quantity: quantityFloat });
          }
        }
      });
      newAsks.sort((a, b) => a.price - b.price);
      setAsks(newAsks.slice(0, 20));
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <div className="price">Price</div>
        <div className="quantity">Amount</div>
        <div className="total">Total</div>
      </div>
      
      <div className="asks">
        {asks.map((ask, index) => (
          <div key={`ask-${index}`} className="order-row ask">
            <div className="price">{formatNumber(ask.price)}</div>
            <div className="quantity">{formatNumber(ask.quantity)}</div>
            <div className="total">{formatNumber(ask.price * ask.quantity)}</div>
          </div>
        ))}
      </div>
      
      <div className="spread">
        {asks.length > 0 && bids.length > 0 && (
          <div>
            Spread: {formatNumber(asks[0].price - bids[0].price)} (
            {((asks[0].price - bids[0].price) / bids[0].price * 100).toFixed(3)}%)
          </div>
        )}
      </div>
      
      <div className="bids">
        {bids.map((bid, index) => (
          <div key={`bid-${index}`} className="order-row bid">
            <div className="price">{formatNumber(bid.price)}</div>
            <div className="quantity">{formatNumber(bid.quantity)}</div>
            <div className="total">{formatNumber(bid.price * bid.quantity)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
