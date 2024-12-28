import React, { useState } from 'react';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="grid-layout">
        <div className="widget tradingView-widget">
          <div className="widget-container">
            <div className="widget-header">
              <span className="widget-title">Chart</span>
            </div>
            <TradingViewWidget />
          </div>
        </div>

        <div className="widget priceRange-widget">
          <div className="widget-container">
            <div className="widget-header">
              <span className="widget-title">Price</span>
            </div>
            <PriceRange symbol="BTCUSDT" />
          </div>
        </div>

        <div className="widget orderBook-widget">
          <div className="widget-container">
            <div className="widget-header">
              <span className="widget-title">Order Book</span>
              <div className="widget-settings">
                <select className="settings-select">
                  <option value="settings">Settings</option>
                  <option value="exchange">Exchange</option>
                  <option value="pair">Pair</option>
                </select>
              </div>
            </div>
            <OrderBook symbol="BTCUSDT" />
          </div>
        </div>

        <div className="widget orderBookChanges-widget">
          <div className="widget-container">
            <div className="widget-header">
              <span className="widget-title">Order Book Changes</span>
              <div className="widget-settings">
                <select className="settings-select">
                  <option value="settings">Settings</option>
                  <option value="exchange">Exchange</option>
                  <option value="pair">Pair</option>
                </select>
              </div>
            </div>
            <OrderBookChanges symbol="BTCUSDT" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;