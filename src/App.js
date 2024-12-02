import React from 'react';
import { Rnd } from 'react-rnd';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook, { EXCHANGES } from './components/OrderBook';
import LivePrice from './components/LivePrice';
import './App.css';


const App = () => {
  return (
    <div>
      <h1>AlphaDesk Terminal</h1>
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
          x: 100,
          y: 200,
          width: 400,
          height: 300,
        }}
        minWidth={300}
        minHeight={200}
        bounds="window"
      >
        <div className="widget-container">
          <LivePrice />
        </div>
      </Rnd>
      <Rnd
        default={{
          x: 200,
          y: 300,
          width: 500,
          height: 400,
        }}
        minWidth={300}
        minHeight={200}
        bounds="window"
      >
        <div className="widget-container dark">
          <OrderBook symbol="BTCUSDT" exchange={EXCHANGES.BINANCE} />
        </div>
      </Rnd>
    </div>
  );
};

export default App;
