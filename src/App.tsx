import React, { useState } from 'react';
import { Responsive, WidthProvider, ResponsiveProps, Layout } from 'react-grid-layout';
import OrderBook from './components/OrderBook';
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
      { i: 'orderbook', x: 0, y: 0, w: 3, h: 32, minW: 3, minH: 16 },
      { i: 'pricerange', x: 3, y: 8, w: 3, h: 8, minW: 3, minH: 6 },
      { i: 'chart', x: 6, y: 0, w: 6, h: 32, minW: 6, minH: 16 }
    ],
    md: [
      { i: 'orderbook', x: 0, y: 0, w: 4, h: 32, minW: 4, minH: 16 },
      { i: 'pricerange', x: 4, y: 8, w: 4, h: 8, minW: 4, minH: 6 },
      { i: 'chart', x: 8, y: 0, w: 4, h: 18, minW: 4, minH: 16 }
    ],
    sm: [
      { i: 'orderbook', x: 0, y: 0, w: 6, h: 32, minW: 4, minH: 16 },
      { i: 'pricerange', x: 6, y: 8, w: 6, h: 8, minW: 4, minH: 6 },
      { i: 'chart', x: 6, y: 16, w: 6, h: 18, minW: 4, minH: 16 }
    ],
    xs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 32, minW: 6, minH: 16 },
      { i: 'pricerange', x: 0, y: 40, w: 12, h: 8, minW: 6, minH: 6 },
      { i: 'chart', x: 0, y: 48, w: 12, h: 18, minW: 6, minH: 16 }
    ],
    xxs: [
      { i: 'orderbook', x: 0, y: 0, w: 12, h: 32, minW: 6, minH: 16 },
      { i: 'pricerange', x: 0, y: 40, w: 12, h: 8, minW: 6, minH: 6 },
      { i: 'chart', x: 0, y: 48, w: 12, h: 18, minW: 6, minH: 16 }
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
        breakpoints={{ lg: 1440, md: 1200, sm: 996, xs: 768, xxs: 480 } as Breakpoints}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 } as Cols}
        rowHeight={28}
        margin={[16, 16]}
        containerPadding={[24, 24]}
        onLayoutChange={handleLayoutChange}
        onLayoutsChange={onLayoutChange}
        draggableHandle=".widget-header"
      >
        <div key="orderbook" className="widget">
          <div className="widget-content">
            <OrderBook symbol={symbol} />
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