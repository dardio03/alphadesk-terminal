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
import { TopMenu } from './components/TopMenu';
import { theme } from './styles/theme';
import { muiTheme } from './styles/muiTheme';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';

// Type for saved layouts
interface SavedLayout {
  name: string;
  data: {
    layouts: Layouts;
    symbol: string;
  };
  timestamp: number;
}

const AppContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  background-color: ${props => props.theme.colors.background.default};
  color: ${props => props.theme.colors.text.primary};
  padding: 8px;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 4px;
  }
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

const LAYOUTS_STORAGE_KEY = 'alphadesk-layouts';

const App: React.FC = () => {
  const [symbol] = useState('BTCUSDT');
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(() => {
    const saved = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  // Calculate layout based on breakpoint
  const generateLayout = (cols: number, isSmallScreen: boolean = false) => {
    // Base proportions from original design
    const totalWidth = 1685; // 1015 + 335 + 335
    const chartWidth = 1015;
    const sideWidth = 335;

    // Convert original widths to proportions
    const chartProportion = Math.round((chartWidth / totalWidth) * cols);
    const sideProportion = Math.round((sideWidth / totalWidth) * cols);

    // Height proportions (based on 20px row height)
    const fullHeight = 31; // 620px / 20px
    const halfHeight = 16; // 310px / 20px
    const smallHeight = 13; // 245px / 20px
    const tinyHeight = 5;  // 95px / 20px

    if (isSmallScreen) {
      // Stack everything vertically for small screens
      return [
        { i: 'chart', x: 0, y: 0, w: cols, h: fullHeight },
        { i: 'orderbook', x: 0, y: fullHeight, w: cols, h: halfHeight },
        { i: 'lastTrades', x: 0, y: fullHeight + halfHeight, w: cols, h: halfHeight },
        { i: 'pricerange', x: 0, y: fullHeight + halfHeight * 2, w: cols, h: tinyHeight },
        { i: 'watchlist', x: 0, y: fullHeight + halfHeight * 2 + tinyHeight, w: cols, h: smallHeight },
        { i: 'bidAskRange', x: 0, y: fullHeight + halfHeight * 2 + tinyHeight + smallHeight, w: cols, h: smallHeight },
        { i: 'alerts', x: 0, y: fullHeight + halfHeight * 2 + tinyHeight + smallHeight * 2, w: cols, h: smallHeight },
        { i: 'orderBookDepth', x: 0, y: fullHeight + halfHeight * 2 + tinyHeight + smallHeight * 3, w: cols, h: smallHeight },
        { i: 'orders', x: 0, y: fullHeight + halfHeight * 2 + tinyHeight + smallHeight * 4, w: cols, h: smallHeight }
      ];
    }

    // Default layout with proportional sizes
    return [
      // Main chart
      { i: 'chart', x: 0, y: 0, w: chartProportion, h: fullHeight },
      
      // Order book section
      { i: 'orderbook', x: chartProportion, y: 0, w: sideProportion, h: halfHeight },
      { i: 'lastTrades', x: chartProportion, y: halfHeight, w: sideProportion, h: halfHeight },
      { i: 'pricerange', x: chartProportion, y: fullHeight, w: sideProportion, h: tinyHeight },
      
      // Right column
      { i: 'watchlist', x: chartProportion + sideProportion, y: 0, w: sideProportion, h: smallHeight },
      { i: 'bidAskRange', x: chartProportion + sideProportion, y: smallHeight, w: sideProportion, h: smallHeight },
      { i: 'alerts', x: chartProportion + sideProportion, y: smallHeight * 2, w: sideProportion, h: smallHeight },
      { i: 'orderBookDepth', x: chartProportion + sideProportion, y: smallHeight * 3, w: sideProportion, h: smallHeight },
      { i: 'orders', x: chartProportion + sideProportion, y: smallHeight * 4, w: sideProportion, h: smallHeight }
    ];
  };

  // Create default layout
  const defaultLayout = {
    lg: generateLayout(24),          // Large screens (≥1600px)
    md: generateLayout(24),          // Medium screens (≥1200px)
    sm: generateLayout(24),          // Small screens (≥992px)
    xs: generateLayout(24, true),    // Extra small screens (≥768px)
    xxs: generateLayout(24, true)    // Tiny screens (<768px)
  };

  const [layouts, setLayouts] = useState<Layouts>(defaultLayout);

  const [currentLayouts, setCurrentLayouts] = useState<Layouts>(defaultLayout);

  const onLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    const newLayouts = allLayouts as Layouts;
    setCurrentLayouts(newLayouts);
  };

  const handleSaveLayout = (layout: { name: string; timestamp: number }) => {
    const newLayout: SavedLayout = {
      ...layout,
      data: {
        layouts: currentLayouts,
        symbol,
      }
    };

    const updatedLayouts = [...savedLayouts.filter(l => l.name !== layout.name), newLayout];
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(updatedLayouts));
  };

  const handleLoadLayout = (layout: SavedLayout) => {
    // Force a reset of the grid before applying the new layout
    setLayouts({
      lg: [], md: [], sm: [], xs: [], xxs: []
    });
    setCurrentLayouts({
      lg: [], md: [], sm: [], xs: [], xxs: []
    });

    // Use setTimeout to ensure the reset is processed before setting new layout
    setTimeout(() => {
      const newLayouts = layout.data.layouts;
      setLayouts(newLayouts);
      setCurrentLayouts(newLayouts);
    }, 50);
  };

  const handleDeleteLayout = (layoutName: string) => {
    const updatedLayouts = savedLayouts.filter(l => l.name !== layoutName);
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(updatedLayouts));
  };

  const handleResetLayout = () => {
    setLayouts({
      lg: [], md: [], sm: [], xs: [], xxs: []
    });
    setCurrentLayouts({
      lg: [], md: [], sm: [], xs: [], xxs: []
    });
    
    // Use setTimeout to ensure the reset is processed before setting new layout
    setTimeout(() => {
      setLayouts(defaultLayout);
      setCurrentLayouts(defaultLayout);
    }, 50);
  };

  const handleLayoutChange = (layout: Layout[]) => {
    // Handle single layout change if needed
  };

  return (
    <MuiThemeProvider theme={muiTheme}>
      <StyledThemeProvider theme={theme}>
        <AppContainer>
          <TopMenu
            onSaveLayout={handleSaveLayout}
            onLoadLayout={handleLoadLayout}
            onDeleteLayout={handleDeleteLayout}
            onResetLayout={handleResetLayout}
            savedLayouts={savedLayouts}
          />
          <StyledResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1920, md: 1440, sm: 1200, xs: 768, xxs: 480 } as Breakpoints}
            cols={{ lg: 24, md: 24, sm: 24, xs: 24, xxs: 24 } as Cols}
            rowHeight={20}
            margin={[4, 4]}
            containerPadding={[4, 4]}
            onLayoutChange={handleLayoutChange}
            onLayoutsChange={onLayoutChange}
            draggableHandle=".widget-header"
            useCSSTransforms={true}
            key={JSON.stringify(layouts) + Date.now()} // Force remount when layouts change
          >
            <div key="chart">
              <MuiWidget title="Chart" noScroll>
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
              <MuiWidget title="Price Range" noScroll>
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