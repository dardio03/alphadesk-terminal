import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { styled } from '@mui/system';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import TradingViewWidget from './components/TradingViewWidget';
import OrderBook from './components/OrderBook';
import OrderBookChanges from './components/OrderBookChanges';
import PriceRange from './components/PriceRange';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    primary: {
      main: '#2962ff',
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const Widget = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const WidgetHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'move',
  '& .MuiIconButton-root': {
    padding: theme.spacing(0.5),
  },
}));

const WidgetContent = styled(Box)({
  flex: 1,
  overflow: 'auto',
  position: 'relative',
});

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const defaultLayouts = {
    lg: [
      { i: 'chart', x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 8 },
      { i: 'price', x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'orderbook', x: 8, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'changes', x: 0, y: 12, w: 12, h: 6, minW: 6, minH: 4 }
    ],
    md: [
      { i: 'chart', x: 0, y: 0, w: 6, h: 12, minW: 4, minH: 8 },
      { i: 'price', x: 6, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'orderbook', x: 6, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'changes', x: 0, y: 12, w: 10, h: 6, minW: 6, minH: 4 }
    ],
    sm: [
      { i: 'chart', x: 0, y: 0, w: 6, h: 10, minW: 3, minH: 6 },
      { i: 'price', x: 0, y: 10, w: 6, h: 6, minW: 3, minH: 4 },
      { i: 'orderbook', x: 0, y: 16, w: 6, h: 6, minW: 3, minH: 4 },
      { i: 'changes', x: 0, y: 22, w: 6, h: 6, minW: 3, minH: 4 }
    ]
  };

  // Try to load saved layout from localStorage, fallback to default if none exists
  const [layouts, setLayouts] = useState(() => {
    const savedLayouts = localStorage.getItem('tradingLayoutState');
    return savedLayouts ? JSON.parse(savedLayouts) : defaultLayouts;
  });

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
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', p: 2 }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
          margin={[16, 16]}
          containerPadding={[16, 16]}
          useCSSTransforms={true}
          preventCollision={true}
          compactType="vertical"
          isBounded={true}
          draggableHandle=".dragHandle"
          resizeHandle={
            <div className="custom-resize-handle">
              <div className="resize-handle-inner" />
            </div>
          }
        >
          <Widget key="chart">
            <WidgetHeader className="dragHandle">
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Chart</Typography>
              <IconButton size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </WidgetHeader>
            <WidgetContent>
              <TradingViewWidget />
            </WidgetContent>
          </Widget>

          <Widget key="price">
            <WidgetHeader className="dragHandle">
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Price</Typography>
              <IconButton size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </WidgetHeader>
            <WidgetContent>
              <PriceRange symbol="BTCUSDT" />
            </WidgetContent>
          </Widget>

          <Widget key="orderbook">
            <WidgetHeader className="dragHandle">
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Order Book</Typography>
              <IconButton size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </WidgetHeader>
            <WidgetContent>
              <OrderBook symbol="BTCUSDT" />
            </WidgetContent>
          </Widget>

          <Widget key="changes">
            <WidgetHeader className="dragHandle">
              <Typography variant="subtitle1" sx={{ flex: 1 }}>Order Book Changes</Typography>
              <IconButton size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </WidgetHeader>
            <WidgetContent>
              <OrderBookChanges symbol="BTCUSDT" />
            </WidgetContent>
          </Widget>
        </ResponsiveGridLayout>
      </Box>
    </ThemeProvider>
  );
};

export default App;