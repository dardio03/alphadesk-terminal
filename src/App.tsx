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
    transition: all 200ms ease;
    transition-property: transform, width, height, left, top;
    
    &.cssTransforms {
      transition-property: transform, width, height;
    }
    
    &.resizing {
      transition: none;
    }
    
    &.react-draggable-dragging {
      transition: none;
      z-index: 3;
    }
  }

  .react-grid-item.react-grid-placeholder {
    background: ${props => props.theme.colors.primary.main};
    opacity: 0.1;
    transition-duration: 100ms;
    z-index: 2;
    border-radius: 4px;
    user-select: none;
  }

  .react-grid-item > .react-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    cursor: se-resize;
    opacity: 0;
    transition: opacity 200ms ease;

    &::after {
      content: "";
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 5px;
      height: 5px;
      border-right: 2px solid rgba(255, 255, 255, 0.4);
      border-bottom: 2px solid rgba(255, 255, 255, 0.4);
    }
  }

  .react-grid-item:hover > .react-resizable-handle {
    opacity: 1;
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

  // Keep track of the current layout state
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);

  const onLayoutChange = (current: Layout[], all: { [key: string]: Layout[] }) => {
    console.log('Layout changed for breakpoint:', currentBreakpoint);
    console.log('Current layout:', JSON.stringify(current, null, 2));
    
    // Update the current layout
    setCurrentLayout(current);
    
    // Update the layouts state with the new layout for the current breakpoint
    setLayouts(prev => ({
      ...prev,
      [currentBreakpoint]: current
    }));
  };

  const handleSaveLayout = (layout: { name: string; timestamp: number }) => {
    // Create a complete layout object with all breakpoints
    const layoutToSave = {
      lg: currentBreakpoint === 'lg' ? currentLayout : (layouts.lg || []),
      md: currentBreakpoint === 'md' ? currentLayout : (layouts.md || []),
      sm: currentBreakpoint === 'sm' ? currentLayout : (layouts.sm || []),
      xs: currentBreakpoint === 'xs' ? currentLayout : (layouts.xs || []),
      xxs: currentBreakpoint === 'xxs' ? currentLayout : (layouts.xxs || [])
    };

    console.log('Current breakpoint:', currentBreakpoint);
    console.log('Current layout:', JSON.stringify(currentLayout, null, 2));
    console.log('Saving complete layout:', JSON.stringify(layoutToSave, null, 2));

    const newLayout: SavedLayout = {
      ...layout,
      data: {
        layouts: layoutToSave,
        symbol,
      }
    };

    const updatedLayouts = [...savedLayouts.filter(l => l.name !== layout.name), newLayout];
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(updatedLayouts));
  };

  const handleLoadLayout = (layout: SavedLayout) => {
    console.log('Loading layout:', JSON.stringify(layout.data.layouts, null, 2));
    
    // Ensure the loaded layout has all breakpoints with valid arrays
    const layoutToLoad = {
      lg: Array.isArray(layout.data.layouts.lg) ? layout.data.layouts.lg : defaultLayout.lg,
      md: Array.isArray(layout.data.layouts.md) ? layout.data.layouts.md : defaultLayout.md,
      sm: Array.isArray(layout.data.layouts.sm) ? layout.data.layouts.sm : defaultLayout.sm,
      xs: Array.isArray(layout.data.layouts.xs) ? layout.data.layouts.xs : defaultLayout.xs,
      xxs: Array.isArray(layout.data.layouts.xxs) ? layout.data.layouts.xxs : defaultLayout.xxs,
    };

    // Update current layout based on current breakpoint
    setCurrentLayout(layoutToLoad[currentBreakpoint as keyof typeof layoutToLoad] || []);

    // Apply the new layout directly
    console.log('Applying layout:', JSON.stringify(layoutToLoad, null, 2));
    setLayouts(layoutToLoad);
  };

  const handleDeleteLayout = (layoutName: string) => {
    const updatedLayouts = savedLayouts.filter(l => l.name !== layoutName);
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(updatedLayouts));
  };

  const handleResetLayout = () => {
    console.log('Resetting to default:', JSON.stringify(defaultLayout, null, 2));
    
    // Update current layout based on current breakpoint
    setCurrentLayout(defaultLayout[currentBreakpoint as keyof typeof defaultLayout] || []);
    
    // Apply default layout directly
    const layoutToApply = {
      lg: defaultLayout.lg || [],
      md: defaultLayout.md || [],
      sm: defaultLayout.sm || [],
      xs: defaultLayout.xs || [],
      xxs: defaultLayout.xxs || []
    };
    console.log('Applying default layout:', JSON.stringify(layoutToApply, null, 2));
    setLayouts(layoutToApply);
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
            onLayoutChange={onLayoutChange}
            onBreakpointChange={(newBreakpoint) => {
              console.log('Breakpoint changed to:', newBreakpoint);
              setCurrentBreakpoint(newBreakpoint);
            }}
            onLayoutsChange={(newLayouts) => {
              console.log('All layouts changed:', JSON.stringify(newLayouts, null, 2));
            }}
            draggableHandle=".widget-header"
            useCSSTransforms={true}
            key="grid" // Use static key to prevent remounts
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