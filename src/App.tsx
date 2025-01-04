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
    <MuiThemeProvider theme={muiTheme}>
      <StyledThemeProvider theme={theme}>
        <AppContainer>
          <StyledResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1600, md: 1200, sm: 992, xs: 768, xxs: 480 } as Breakpoints}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 } as Cols}
            rowHeight={30}
            margin={[20, 20]}
            containerPadding={[20, 20]}
            onLayoutChange={handleLayoutChange}
            onLayoutsChange={onLayoutChange}
            draggableHandle=".widget-header"
            useCSSTransforms={true}
          >
            <div key="orderbook">
              <MuiWidget title="Order Book">
                <OrderBook symbol={symbol} />
              </MuiWidget>
            </div>

            <div key="pricerange">
              <MuiWidget title="Price Range">
                <PriceRange symbol={symbol} />
              </MuiWidget>
            </div>

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
          </StyledResponsiveGridLayout>
        </AppContainer>
      </StyledThemeProvider>
    </MuiThemeProvider>
  );
};

export default App;