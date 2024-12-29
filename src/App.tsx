import React, { useState } from 'react';
import { Responsive, WidthProvider, ResponsiveProps, Layout } from 'react-grid-layout';
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

type Breakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

interface Layouts {
  [key: string]: Layout[];
  lg: Layout[];
  md: Layout[];
  sm: Layout[];
  xs: Layout[];
  xxs: Layout[];
}

type Breakpoints = { [key in Breakpoint]: number };
type Cols = { [key in Breakpoint]: number };

const App: React.FC = () => {
  const [symbol] = useState('BTCUSDT');
  const [layouts, setLayouts] = useState<Layouts>({
    lg: [
      { i: 'orderbook', x: 0, y: 0, w: 4, h: 24, minW: 3, minH: 12 },
      { i: 'liveprice', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'pricerange', x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'chart', x: 4, y: 6, w: 8, h: 18, minW: 6, minH: 12 }
    ],
    md: [
      { i: 'orderbook', x: 0, y: 0, w: 5, h: 24, minW: 4 },
      { i: 'liveprice', x: 5, y: 0, w: 7, h: 6, minW: 4 },
      { i: 'pricerange', x: 5, y: 6, w: 7, h: 6, minW: 4 },
      { i: 'chart', x: 5, y: 12, w: 7, h: 12, minW: 6 }
    ],
    sm: [
      { i: 'orderbook', x: 0, y: 0, w: 6, h: 24, minW: 4 },
      { i: 'liveprice', x: 6, y: 0, w: 6, h: 6, minW: 4 },
      { i: 'pricerange', x: 6, y: 6, w: 6, h: 6, minW: 4 },
      { i: 'chart', x: 0, y: 24, w: 12, h: 18, minW: 6 }
    ],
    xs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 24, minW: 6 },
      { i: 'liveprice', x: 0, y: 24, w: 12, h: 6, minW: 6 },
      { i: 'pricerange', x: 0, y: 30, w: 12, h: 6, minW: 6 },
      { i: 'chart', x: 0, y: 36, w: 12, h: 18, minW: 6 }
    ],
    xxs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 24, minW: 6 },
      { i: 'liveprice', x: 0, y: 24, w: 12, h: 6, minW: 6 },
      { i: 'pricerange', x: 0, y: 30, w: 12, h: 6, minW: 6 },
      { i: 'chart', x: 0, y: 36, w: 12, h: 18, minW: 6 }
    ]
  });

  const onLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts as Layouts);
  };

  const handleLayoutChange = (layout: Layout[]) => {
    // Handle single layout change if needed
  };

  return (
    <div className="app">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as Breakpoints}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 } as Cols}
        rowHeight={32}
        margin={[12, 12]}
        containerPadding={[16, 16]}
        onLayoutChange={handleLayoutChange}
        onLayoutsChange={onLayoutChange}
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