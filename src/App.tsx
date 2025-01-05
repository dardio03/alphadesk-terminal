import React, { useState } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { Box, Paper, IconButton } from '@mui/material';
import { DragHandle, Close, Settings } from '@mui/icons-material';
import { Responsive, WidthProvider, ResponsiveProps, Layout } from 'react-grid-layout';
import styled from 'styled-components';
import OrderBook from './components/OrderBook';
import PriceRange from './components/PriceRange';
import TradingViewWidget from './components/TradingViewWidget';
import LastTrades from './components/LastTrades';
import Watchlist from './components/Watchlist';
import BidAskRange from './components/BidAskRange';
import Alerts from './components/Alerts';
import OrderBookDepth from './components/OrderBookDepth';
import Orders from './components/Orders';
import { MuiWidget } from './components/common/MuiWidget';
import { theme } from './styles/theme';
import { muiTheme } from './styles/muiTheme';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background.default};
  color: ${props => props.theme.colors.text.primary};
  padding: 20px;
`;

const StyledResponsiveGridLayout = styled(WidthProvider(Responsive))`
  .react-grid-item {
    background-color: ${props => props.theme.colors.background.paper};
    border: 1px solid ${props => props.theme.colors.border.main};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
  }
`;

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
  // Convert pixel sizes to grid units
  const pxToGridUnits = (px: number, isHeight: boolean = false) => {
    if (isHeight) {
      return Math.ceil(px / 20); // Row height is 20px for more precise sizing
    }
    // Total width is 1685px (1015 + 335 + 335)
    // Using 24 columns for more precise sizing
    return Math.round((px / 1685) * 24);
  };

  const [layouts, setLayouts] = useState<Layouts>({
    lg: [
      // Main chart (1015 x 620 px)
      { i: 'chart', x: 0, y: 0, w: pxToGridUnits(1015), h: pxToGridUnits(620, true), static: true },
      
      // Order book and trades section (335 x 620 px)
      { i: 'orderbook', x: pxToGridUnits(1015), y: 0, w: pxToGridUnits(335), h: pxToGridUnits(310, true), static: true },
      { i: 'lastTrades', x: pxToGridUnits(1015), y: pxToGridUnits(310, true), w: pxToGridUnits(335), h: pxToGridUnits(310, true), static: true },
      
      // Right column widgets (335 x 245 px each)
      { i: 'watchlist', x: pxToGridUnits(1350), y: 0, w: pxToGridUnits(335), h: pxToGridUnits(245, true), static: true },
      { i: 'bidAskRange', x: pxToGridUnits(1350), y: pxToGridUnits(245, true), w: pxToGridUnits(335), h: pxToGridUnits(245, true), static: true },
      { i: 'alerts', x: pxToGridUnits(1350), y: pxToGridUnits(490, true), w: pxToGridUnits(335), h: pxToGridUnits(245, true), static: true },
      { i: 'orderBookDepth', x: pxToGridUnits(1350), y: pxToGridUnits(735, true), w: pxToGridUnits(335), h: pxToGridUnits(245, true), static: true },
      { i: 'orders', x: pxToGridUnits(1350), y: pxToGridUnits(980, true), w: pxToGridUnits(335), h: pxToGridUnits(245, true), static: true },
      
      // Price range (335 x 95 px)
      { i: 'pricerange', x: pxToGridUnits(1015), y: pxToGridUnits(620, true), w: pxToGridUnits(335), h: pxToGridUnits(95, true), static: true }
    ],
    md: [], // We'll make it responsive later
    sm: [],
    xs: [],
    xxs: []
  });

  const onLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts as Layouts);
  };

  const handleLayoutChange = (layout: Layout[]) => {
    // Handle single layout change if needed
  };

  return (
    <MuiThemeProvider theme={muiTheme}>
      <StyledThemeProvider theme={theme}>
        <AppContainer>
          <StyledResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1600, md: 1200, sm: 992, xs: 768, xxs: 480 } as Breakpoints}
            cols={{ lg: 24, md: 24, sm: 24, xs: 24, xxs: 24 } as Cols}
            rowHeight={20}
            margin={[8, 8]}
            containerPadding={[8, 8]}
            onLayoutChange={handleLayoutChange}
            onLayoutsChange={onLayoutChange}
            draggableHandle=".widget-header"
            useCSSTransforms={true}
          >
            <div key="chart">
              <MuiWidget title="Chart">
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
              </MuiWidget>
            </div>

            <div key="orderbook">
              <MuiWidget title="Order Book">
                <OrderBook symbol={symbol} />
              </MuiWidget>
            </div>

            <div key="lastTrades">
              <MuiWidget title="Last Trades">
                <LastTrades symbol={symbol} />
              </MuiWidget>
            </div>

            <div key="watchlist">
              <MuiWidget title="Watchlist">
                <Watchlist />
              </MuiWidget>
            </div>

            <div key="bidAskRange">
              <MuiWidget title="Bid/Ask Range">
                <BidAskRange symbol={symbol} />
              </MuiWidget>
            </div>

            <div key="alerts">
              <MuiWidget title="Alerts">
                <Alerts />
              </MuiWidget>
            </div>

            <div key="orderBookDepth">
              <MuiWidget title="Order Book Depth">
                <OrderBookDepth symbol={symbol} />
              </MuiWidget>
            </div>

            <div key="orders">
              <MuiWidget title="Orders">
                <Orders />
              </MuiWidget>
            </div>

            <div key="pricerange">
              <MuiWidget title="Price Range">
                <PriceRange symbol={symbol} />
              </MuiWidget>
            </div>
          </StyledResponsiveGridLayout>
        </AppContainer>
      </StyledThemeProvider>
    </MuiThemeProvider>
  );
};

export default App;