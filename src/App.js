import React from 'react';
import { Rnd } from 'react-rnd';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';


const App = () => {
  return (
    <div>
      <Rnd
        default={{
          x: 50,
          y: 50,
          width: 800,
          height: 600,
        }}
        minWidth={400}
        minHeight={300}
        bounds="window"
      >
        <div className="widget-container">
          <TradingViewWidget />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: 0,
          y: 0,
          width: 400,
          height: 300,
        }}
        minWidth={300}
        minHeight={200}
        bounds="window"
      >
        <div className="widget-container">
          <OrderBook symbol="BTCUSDT" />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: '0',
          y: 50,
          width: 400,
          height: 300,
        }}
        minWidth={300}
        minHeight={200}
        bounds="window"
      >
        <div className="widget-container">
          <OrderBookChanges symbol="BTCUSDT" />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: 50,
          y: 50,
          width: 600,
          height: 200,
        }}
        minWidth={400}
        minHeight={150}
        bounds="window"
      >
        <div className="widget-container">
          <PriceRange symbol="BTCUSDT" />
        </div>
      </Rnd>
    </div>
  );
};

export default App;
