import { OrderBook } from '../components/OrderBook';
import { OrderBookChanges } from '../components/OrderBookChanges';
import { BidAskRange } from '../components/BidAskRange';
import { LastTrades } from '../components/LastTrades';
import { PriceRange } from '../components/PriceRange';
import { Watchlist } from '../components/Watchlist';
import { TradingViewWidget } from '../components/TradingViewWidget';

type WidgetComponent = React.ComponentType<any>;
type WidgetConfig = {
  component: WidgetComponent;
  defaultProps: Record<string, any>;
  defaultSize: { width: number; height: number };
};

const widgetRegistry: Record<string, WidgetConfig> = {
  orderBook: {
    component: OrderBook,
    defaultProps: {
      symbol: 'BTCUSDT'
    },
    defaultSize: { width: 400, height: 500 }
  },
  orderBookChanges: {
    component: OrderBookChanges,
    defaultProps: {},
    defaultSize: { width: 300, height: 200 }
  },
  bidAskRange: {
    component: BidAskRange,
    defaultProps: {},
    defaultSize: { width: 300, height: 150 }
  },
  lastTrades: {
    component: LastTrades,
    defaultProps: {
      limit: 20
    },
    defaultSize: { width: 300, height: 300 }
  },
  priceRange: {
    component: PriceRange,
    defaultProps: {},
    defaultSize: { width: 300, height: 150 }
  },
  watchlist: {
    component: Watchlist,
    defaultProps: {
      symbols: ['BTCUSDT', 'ETHUSDT']
    },
    defaultSize: { width: 300, height: 400 }
  },
  tradingView: {
    component: TradingViewWidget,
    defaultProps: {
      symbol: 'BTCUSDT',
      interval: 'D'
    },
    defaultSize: { width: 800, height: 600 }
  }
};

export const getWidgetConfig = (widgetId: string): WidgetConfig => {
  const config = widgetRegistry[widgetId];
  if (!config) {
    throw new Error(`Widget ${widgetId} not found in registry`);
  }
  return config;
};

export const getAvailableWidgets = () => {
  return Object.keys(widgetRegistry);
};

export const createWidgetInstance = (widgetId: string, props: Record<string, any> = {}) => {
  const { component: WidgetComponent, defaultProps } = getWidgetConfig(widgetId);
  return <WidgetComponent {...defaultProps} {...props} />;
};