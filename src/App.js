import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const App = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <div className="scrollable-content">
        <Rnd
          default={{
            x: 16,
            y: 16,
            width: Math.min(800, windowSize.width - 32),
            height: 400,
          }}
          minWidth={600}
          minHeight={300}
          bounds="parent"
          className="trading-view-widget"
        >
          <div className="widget-container">
            <div className="widget-header">Trading View</div>
            <TradingViewWidget />
          </div>
        </Rnd>
        <Rnd
          default={{
            x: Math.min(832, windowSize.width - 416),
            y: 16,
            width: 400,
            height: 300,
          }}
          minWidth={300}
          minHeight={150}
          bounds="parent"
          className="price-range-widget"
        >
          <div className="widget-container">
            <div className="widget-header">Price Range</div>
            <PriceRange symbol="BTCUSDT" />
          </div>
        </Rnd>
        <Rnd
          default={{
            x: 16,
            y: 432,
            width: 400,
            height: 500,
          }}
          minWidth={300}
          minHeight={400}
          bounds="parent"
          className="order-book-widget"
        >
          <div className="widget-container">
            <div className="widget-header">Order Book</div>
            <OrderBook symbol="BTCUSDT" />
          </div>
        </Rnd>
        <Rnd
          default={{
            x: Math.min(432, windowSize.width - 396),
            y: 432,
            width: 380,
            height: 500,
          }}
          minWidth={300}
          minHeight={400}
          bounds="parent"
          className="order-book-changes-widget"
        >
          <div className="widget-container">
            <div className="widget-header">Order Book Changes</div>
            <OrderBookChanges symbol="BTCUSDT" />
          </div>
        </Rnd>
      </div>
    </div>
  );
};

export default App;