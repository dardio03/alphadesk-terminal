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
      <div className="scrollable-content">
        <Rnd
          default={{
            x: 0,
            y: 0,
            width: '100%',
            height: '50%',
          }}
          minWidth="600px"
          minHeight="300px"
          bounds="parent"
          className="trading-view-widget"
        >
          <div className="widget-container">
            <div className="widget-header">Trading View</div>
            <TradingViewWidget />
          </div>
        </Rnd>
        <div className="bottom-widgets">
          <Rnd
            default={{
              x: 0,
              y: 0,
              width: '33%',
              height: '100%',
            }}
            minWidth="300px"
            minHeight="200px"
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
              x: '33%',
              y: 0,
              width: '33%',
              height: '100%',
            }}
            minWidth="300px"
            minHeight="200px"
            bounds="parent"
            className="order-book-widget"
          >
            <div className="widget-container">
              <div className="widget-header">
                <span>Order Book</span>
                <div className="exchange-select-container">
                  <svg className="exchange-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M21,3H3C2.21,3,1.5,3.21,1.5,4v16c0,0.79,0.71,1,1.5,1h18c0.79,0,1.5-0.21,1.5-1V4C22.5,3.21,21.79,3,21,3z M14,17h-4v-2h4V17z M20,17h-4v-2h4V17z M20,13h-4v-2h4V13z M20,9h-4V7h4V9z"/>
                  </svg>
                  <select className="exchange-select">
                    <option value="binance">Binance</option>
                    <option value="bybit">Bybit</option>
                    <option value="coinbase">Coinbase</option>
                  </select>
                </div>
              </div>
              <OrderBook symbol="BTCUSDT" />
            </div>
          </Rnd>
          <Rnd
            default={{
              x: '66%',
              y: 0,
              width: '34%',
              height: '100%',
            }}
            minWidth="300px"
            minHeight="200px"
            bounds="parent"
            className="order-book-changes-widget"
          >
            <div className="widget-container">
              <div className="widget-header">
                <span>Order Book Changes</span>
                <div className="exchange-select-container">
                  <svg className="exchange-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M21,3H3C2.21,3,1.5,3.21,1.5,4v16c0,0.79,0.71,1,1.5,1h18c0.79,0,1.5-0.21,1.5-1V4C22.5,3.21,21.79,3,21,3z M14,17h-4v-2h4V17z M20,17h-4v-2h4V17z M20,13h-4v-2h4V13z M20,9h-4V7h4V9z"/>
                  </svg>
                  <select className="exchange-select">
                    <option value="binance">Binance</option>
                    <option value="bybit">Bybit</option>
                    <option value="coinbase">Coinbase</option>
                  </select>
                </div>
              </div>
              <OrderBookChanges symbol="BTCUSDT" />
            </div>
          </Rnd>
        </div>
      </div>
    </div>
  );
};

export default App;