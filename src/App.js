import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const layout = [
    { i: 'chart', x: 0, y: 0, w: 8, h: 20, static: true },
    { i: 'price', x: 8, y: 0, w: 4, h: 10, static: true },
    { i: 'orderbook', x: 8, y: 10, w: 4, h: 10, static: true },
    { i: 'changes', x: 0, y: 20, w: 12, h: 10, static: true }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const onLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
    localStorage.setItem('tradingLayoutState', JSON.stringify(layouts));
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={30}
        width={1200}
        margin={[10, 10]}
        containerPadding={[0, 0]}
        isDraggable={false}
        isResizable={false}
      >
        <div key="chart" className="widget">
          <div className="widget-header">Chart</div>
          <div className="widget-content">
            <TradingViewWidget />
          </div>
        </div>

        <div key="price" className="widget">
          <div className="widget-header">Price</div>
          <div className="widget-content">
            <PriceRange symbol="BTCUSDT" />
          </div>
        </div>

        <div key="orderbook" className="widget">
          <div className="widget-header">Order Book</div>
          <div className="widget-content">
            <OrderBook symbol="BTCUSDT" />
          </div>
        </div>

        <div key="changes" className="widget">
          <div className="widget-header">Order Book Changes</div>
          <div className="widget-content">
            <OrderBookChanges symbol="BTCUSDT" />
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default App;