import React from 'react';
import { Rnd } from 'react-rnd';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';


const App = () => {
  return (
    <div className="app-container">
      <Rnd
        default={{
          x: 16,
          y: 16,
          width: 800,
          height: 400,
        }}
        minWidth={600}
        minHeight={300}
        bounds="window"
        className="trading-view-widget"
      >
        <div className="widget-container">
          <div className="widget-header">Trading View</div>
          <TradingViewWidget />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: 832,
          y: 16,
          width: 400,
          height: 300,
        }}
        minWidth={300}
        minHeight={150}
        bounds="window"
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
        bounds="window"
        className="order-book-widget"
      >
        <div className="widget-container">
          <div className="widget-header">Order Book</div>
          <OrderBook symbol="BTCUSDT" />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: 432,
          y: 432,
          width: 380,
          height: 500,
        }}
        minWidth={300}
        minHeight={400}
        bounds="window"
        className="order-book-changes-widget"
      >
        <div className="widget-container">
          <div className="widget-header">Order Book Changes</div>
          <OrderBookChanges symbol="BTCUSDT" />
        </div>
      </Rnd>
    </div>
  );
};

export default App;