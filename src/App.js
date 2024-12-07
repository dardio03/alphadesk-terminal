import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const App = () => {
  const [widgets, setWidgets] = useState({
    tradingView: { x: 0, y: 0, width: '50%', height: '60%' },
    priceRange: { x: '50%', y: 0, width: '50%', height: '60%' },
    orderBook: { x: 0, y: '60%', width: '50%', height: '40%' },
    orderBookChanges: { x: '50%', y: '60%', width: '50%', height: '40%' },
  });

  const updateWidget = (key, newPosition) => {
    setWidgets(prev => ({ ...prev, [key]: { ...prev[key], ...newPosition } }));
  };

  const renderWidget = (key, content, title, exchangeSelect = false) => (
    <Rnd
      position={{ x: widgets[key].x, y: widgets[key].y }}
      size={{ width: widgets[key].width, height: widgets[key].height }}
      minWidth="300px"
      minHeight="200px"
      bounds="parent"
      onDragStop={(e, d) => updateWidget(key, { x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateWidget(key, {
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      className={`widget ${key}-widget`}
    >
      <div className="widget-container">
        <div className="widget-header">
          <span>{title}</span>
          {exchangeSelect && (
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
          )}
        </div>
        {content}
      </div>
    </Rnd>
  );

  return (
    <div className="app-container">
      <div className="scrollable-content">
        {renderWidget('tradingView', <TradingViewWidget />, 'Trading View')}
        {renderWidget('priceRange', <PriceRange symbol="BTCUSDT" />, 'Price Range')}
        {renderWidget('orderBook', <OrderBook symbol="BTCUSDT" />, 'Order Book', true)}
        {renderWidget('orderBookChanges', <OrderBookChanges symbol="BTCUSDT" />, 'Order Book Changes', true)}
      </div>
    </div>
  );
};

export default App;