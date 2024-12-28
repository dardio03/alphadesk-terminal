import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import OrderBook from './components/OrderBook';
import LivePrice from './components/LivePrice';
import PriceRange from './components/PriceRange';
import TradingViewWidget from './components/TradingViewWidget';
import WidgetHeader from './components/WidgetHeader';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';

const ResponsiveGridLayout = WidthProvider(Responsive) as React.ComponentType<ResponsiveProps>;

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

interface Layouts {
  lg: LayoutItem[];
  md: LayoutItem[];
  sm: LayoutItem[];
  xs: LayoutItem[];
  xxs: LayoutItem[];
}

const App: React.FC = () => {
  const [symbol] = useState('BTCUSDT');
  const [layouts, setLayouts] = useState<Layouts>({
    lg: [
      { i: 'orderbook', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 6 },
      { i: 'liveprice', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'pricerange', x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'chart', x: 3, y: 4, w: 9, h: 8, minW: 4, minH: 6 }
    ],
    md: [
      { i: 'orderbook', x: 0, y: 0, w: 4, h: 12 },
      { i: 'liveprice', x: 4, y: 0, w: 4, h: 4 },
      { i: 'pricerange', x: 8, y: 0, w: 4, h: 4 },
      { i: 'chart', x: 4, y: 4, w: 8, h: 8 }
    ],
    sm: [
      { i: 'orderbook', x: 0, y: 0, w: 6, h: 10 },
      { i: 'liveprice', x: 6, y: 0, w: 6, h: 4 },
      { i: 'pricerange', x: 0, y: 10, w: 6, h: 4 },
      { i: 'chart', x: 0, y: 14, w: 12, h: 8 }
    ],
    xs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 10 },
      { i: 'liveprice', x: 0, y: 10, w: 12, h: 4 },
      { i: 'pricerange', x: 0, y: 14, w: 12, h: 4 },
      { i: 'chart', x: 0, y: 18, w: 12, h: 8 }
    ],
    xxs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 10 },
      { i: 'liveprice', x: 0, y: 10, w: 12, h: 4 },
      { i: 'pricerange', x: 0, y: 14, w: 12, h: 4 },
      { i: 'chart', x: 0, y: 18, w: 12, h: 8 }
    ]
  });

  const onLayoutChange = (layout: LayoutItem[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
  };

  return (
    <div className="app">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={30}
        margin={[10, 10]}
        onLayoutChange={onLayoutChange}
        draggableHandle=".widget-header"
      >
        <div key="orderbook" className="widget">
          <div className="widget-content">
            <OrderBook symbol={symbol} />
          </div>
        </div>

        <div key="liveprice" className="widget">
          <WidgetHeader title="Live Price" />
          <div className="widget-content">
            <LivePrice symbol={symbol} />
          </div>
        </div>

        <div key="pricerange" className="widget">
          <WidgetHeader title="Price Range" />
          <div className="widget-content">
            <PriceRange symbol={symbol} />
          </div>
        </div>

        <div key="chart" className="widget">
          <WidgetHeader title="Chart" />
          <div className="widget-content">
            <TradingViewWidget
              symbol={symbol}
              theme="dark"
              autosize
              interval="1"
              timezone="Etc/UTC"
              style="1"
              withdateranges={false}
              hide_side_toolbar={true}
            />
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default App;