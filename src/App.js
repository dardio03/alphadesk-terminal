import React from 'react';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const App = () => {
  const renderWidget = (key, content, title, hasSettings = false) => (
    <div className={`widget ${key}-widget`}>
      <div className="widget-container">
        <div className="widget-header">
          <span className="widget-title">{title}</span>
          {hasSettings && (
            <div className="widget-settings">
              <select className="settings-select">
                <option value="settings">Settings</option>
                <option value="exchange">Exchange</option>
                <option value="pair">Pair</option>
              </select>
            </div>
          )}
        </div>
        {content}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="grid-layout">
        {renderWidget('tradingView', <TradingViewWidget />, 'Chart')}
        {renderWidget('priceRange', <PriceRange symbol="BTCUSDT" />, 'Price')}
        {renderWidget('orderBook', <OrderBook symbol="BTCUSDT" />, 'Order Book', true)}
        {renderWidget('orderBookChanges', <OrderBookChanges symbol="BTCUSDT" />, 'Order Book Changes', true)}
      </div>
    </div>
  );
};

export default App;