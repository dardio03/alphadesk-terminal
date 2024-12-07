import React from 'react';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const App = () => {
  return (
    <div className="app-container">
      <div className="scrollable-content">
        <div className="trading-view-widget">
          <div className="widget-container">
            <div className="widget-header">Trading View</div>
            <TradingViewWidget />
          </div>
        </div>
        <div className="price-range-widget">
          <div className="widget-container">
            <div className="widget-header">Price Range</div>
            <PriceRange symbol="BTCUSDT" />
          </div>
        </div>
        <div className="order-book-widget">
          <div className="widget-container">
            <div className="widget-header">Order Book</div>
            <OrderBook symbol="BTCUSDT" />
          </div>
        </div>
        <div className="order-book-changes-widget">
          <div className="widget-container">
            <div className="widget-header">Order Book Changes</div>
            <OrderBookChanges symbol="BTCUSDT" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;