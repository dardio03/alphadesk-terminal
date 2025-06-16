import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Box, Typography, styled } from '@mui/material';
import { MuiWidget } from './common/MuiWidget';
import { ExchangeId } from "../types/exchange";
import { aggregatorService } from "../services/aggregatorService";
import { ErrorContext } from '../utils/ErrorHandler';
import { formatPrice, formatQuantity } from "../utils/formatPrice";
import debounce from 'lodash/debounce';

interface AggregatedOrderBookEntry {
  price: number;
  quantity: number;
  exchanges: string[];
  exchangeQuantities: Record<string, number>;
  totalQuantity: number;
}

const OrderBookContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  gap: '8px',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  fontFamily: 'monospace',
});

const OrderSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  position: 'relative',
});

const OrderList = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(255, 255, 255, 0.05)',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '3px',
  },
});

const TableHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  padding: '8px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
}));

const HeaderCell = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.6)',
  fontFamily: 'monospace',
  textAlign: 'right',
  '&:first-of-type': {
    textAlign: 'left',
  },
}));

const OrderRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  padding: '4px 8px',
  fontSize: '12px',
  fontFamily: 'monospace',
  position: 'relative',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
}));

const Cell = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  fontFamily: 'monospace',
  textAlign: 'right',
  '&:first-of-type': {
    textAlign: 'left',
  },
}));

const Price = styled(Cell)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

const Amount = styled(Cell)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.8)',
}));

const Total = styled(Cell)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.8)',
}));

const DepthBar = styled(Box)<{ width: number; isAsk: boolean }>(({ width, isAsk }) => ({
  position: 'absolute',
  top: 0,
  left: isAsk ? 'auto' : 0,
  right: isAsk ? 0 : 'auto',
  height: '100%',
  width: `${width}%`,
  backgroundColor: isAsk ? 'rgba(255, 59, 48, 0.1)' : 'rgba(76, 175, 80, 0.1)',
  zIndex: 0,
}));

const MidPriceLine = styled(Box)({
  position: 'absolute',
  left: 0,
  right: 0,
  height: '1px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  zIndex: 1,
});

const PriceLabel = styled(Box)({
  position: 'absolute',
  right: '8px',
  fontSize: '10px',
  color: 'rgba(255, 255, 255, 0.4)',
  zIndex: 1,
  pointerEvents: 'none',
});

interface OrderBookProps {
  symbol: string;
  activeExchanges: ExchangeId[];
}

const ALL_EXCHANGES: ExchangeId[] = [
  'BINANCE',
  'BINANCE_FUTURES',
  'BINANCE_US',
  'BITFINEX',
  'BITGET',
  'BITMART',
  'BITMEX',
  'BITSTAMP',
  'BITUNIX',
  'BYBIT',
  'COINBASE',
  'CRYPTOCOM',
  'DERIBIT',
  'DYDX',
  'GATEIO',
  'HITBTC',
  'HUOBI',
  'KRAKEN',
  'KUCOIN',
  'MEXC',
  'OKEX',
  'PHEMEX',
  'POLONIEX',
  'GEMINI'
];

const OrderBook: React.FC<OrderBookProps> = ({
  symbol = "BTCUSDT",
  activeExchanges = [],
}) => {
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: ErrorContext }>({});
  const [maxDepth, setMaxDepth] = useState<number>(50);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bids, setBids] = useState<AggregatedOrderBookEntry[]>([]);
  const [asks, setAsks] = useState<AggregatedOrderBookEntry[]>([]);
  const askListRef = useRef<HTMLDivElement>(null);
  const bidListRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);
  const updateIntervalRef = useRef<number>(100); // Reduced to 100ms for more responsive updates

  // Optimized update function
  const updateOrderBook = useCallback(
    debounce((newBids: AggregatedOrderBookEntry[], newAsks: AggregatedOrderBookEntry[]) => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= updateIntervalRef.current) {
        setBids(newBids);
        setAsks(newAsks);
        lastUpdateRef.current = now;
      }
    }, 50),
    []
  );

  useEffect(() => {
    const handleOrderBookUpdate = (data: any) => {
      if (!data || (!data.bids && !data.asks)) {
        setError('Received invalid order book data');
        return;
      }

      try {
        const processOrders = (orders: any[], isBid: boolean) => {
          if (!orders || !Array.isArray(orders)) return [];
          
          return orders
            .map((order: any) => ({
              ...order,
              exchanges: order.exchanges || ["aggregated"],
              exchangeQuantities: order.exchangeQuantities || { "aggregated": order.quantity },
              totalQuantity: order.totalQuantity || order.quantity
            }))
            .sort((a: any, b: any) => isBid ? b.price - a.price : a.price - b.price)
            .slice(0, maxDepth);
        };

        const newBids = processOrders(data.bids, true);
        const newAsks = processOrders(data.asks, false);
        
        if (newBids.length > 0 || newAsks.length > 0) {
          updateOrderBook(newBids, newAsks);
        }
        setError(null);
      } catch (error) {
        console.error('Error processing order book update:', error);
        setError(`Error processing order book data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    const handleError = (context: ErrorContext) => {
      console.error(`Exchange error:`, {
        exchangeId: context.exchangeId,
        error: context.originalError,
        timestamp: new Date().toISOString()
      });
      setErrors(prev => ({
        ...prev,
        [context.exchangeId]: context
      }));
      const errorMessage = context.originalError instanceof Error 
        ? context.originalError.message 
        : typeof context.originalError === 'string' 
          ? context.originalError 
          : 'Unknown error';
      setError(`Error with ${context.exchangeId}: ${errorMessage}`);
    };

    const handleInitialized = () => {
      setIsInitialized(true);
      setError(null);
    };

    aggregatorService.on('initialized', handleInitialized);
    aggregatorService.on('error', handleError);
    aggregatorService.on('orderBook', handleOrderBookUpdate);

    return () => {
      aggregatorService.off('initialized', handleInitialized);
      aggregatorService.off('error', handleError);
      aggregatorService.off('orderBook', handleOrderBookUpdate);
    };
  }, [maxDepth, updateOrderBook]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const subscribe = async () => {
      try {
        setError(null);
        // Subscribe with all exchanges
        await aggregatorService.subscribe(symbol, ALL_EXCHANGES);
      } catch (error) {
        console.error('Failed to subscribe:', error);
        setError(error instanceof Error ? error.message : 'Failed to subscribe');
      }
    };

    subscribe();

    return () => {
      try {
        aggregatorService.unsubscribe([symbol]);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    };
  }, [symbol, isInitialized, maxDepth]);

  // Memoize filtered orders
  const filteredBids = useMemo(() => {
    return bids
      .filter(entry => {
        if (activeExchanges.length === 0) return true;
        return entry.exchanges.some(exchange => 
          activeExchanges.includes(exchange as ExchangeId)
        );
      })
      .map(entry => {
        if (activeExchanges.length > 0) {
          const activeQuantity = Object.entries(entry.exchangeQuantities)
            .filter(([exchange]) => activeExchanges.includes(exchange as ExchangeId))
            .reduce((sum, [_, quantity]) => sum + quantity, 0);
          
          return {
            ...entry,
            totalQuantity: activeQuantity
          };
        }
        return entry;
      })
      .filter(entry => entry.totalQuantity > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, maxDepth);
  }, [bids, activeExchanges, maxDepth]);

  const filteredAsks = useMemo(() => {
    return asks
      .filter(entry => {
        if (activeExchanges.length === 0) return true;
        return entry.exchanges.some(exchange => 
          activeExchanges.includes(exchange as ExchangeId)
        );
      })
      .map(entry => {
        if (activeExchanges.length > 0) {
          const activeQuantity = Object.entries(entry.exchangeQuantities)
            .filter(([exchange]) => activeExchanges.includes(exchange as ExchangeId))
            .reduce((sum, [_, quantity]) => sum + quantity, 0);
          
          return {
            ...entry,
            totalQuantity: activeQuantity
          };
        }
        return entry;
      })
      .filter(entry => entry.totalQuantity > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, maxDepth);
  }, [asks, activeExchanges, maxDepth]);

  // Calculate cumulative totals
  const calculateCumulativeTotals = useCallback((orders: AggregatedOrderBookEntry[]) => {
    let cumulative = 0;
    return orders.map(order => {
      cumulative += order.totalQuantity;
      return { ...order, cumulative };
    });
  }, []);

  const bidsWithTotals = useMemo(() => {
    return calculateCumulativeTotals(filteredBids);
  }, [filteredBids, calculateCumulativeTotals]);

  const asksWithTotals = useMemo(() => {
    return calculateCumulativeTotals(filteredAsks);
  }, [filteredAsks, calculateCumulativeTotals]);

  // Calculate max total for depth visualization
  const maxTotal = useMemo(() => {
    const maxBidTotal = Math.max(...bidsWithTotals.map(bid => bid.cumulative));
    const maxAskTotal = Math.max(...asksWithTotals.map(ask => ask.cumulative));
    return Math.max(maxBidTotal, maxAskTotal);
  }, [bidsWithTotals, asksWithTotals]);

  // Calculate mid price
  const midPrice = useMemo(() => {
    if (bidsWithTotals.length === 0 || asksWithTotals.length === 0) return 0;
    return (bidsWithTotals[0].price + asksWithTotals[0].price) / 2;
  }, [bidsWithTotals, asksWithTotals]);

  // Handle synchronized scrolling
  const handleAskScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (bidListRef.current) {
      bidListRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const handleBidScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (askListRef.current) {
      askListRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // Calculate price labels
  const priceLabels = useMemo(() => {
    if (!midPrice) return [];
    return [
      { label: '1%', value: midPrice * 0.99 },
      { label: '2.5%', value: midPrice * 0.975 },
      { label: '5%', value: midPrice * 0.95 },
      { label: '10%', value: midPrice * 0.9 },
      { label: '25%', value: midPrice * 0.75 },
    ];
  }, [midPrice]);

  if (!isInitialized) {
    return (
      <MuiWidget title="" hideHeader>
        <OrderBookContainer>
          <Box sx={{ p: 2, textAlign: 'center' }}>Initializing...</Box>
        </OrderBookContainer>
      </MuiWidget>
    );
  }

  return (
    <MuiWidget title="" hideHeader>
      <OrderBookContainer>
        <OrderSection>
          <TableHeader>
            <HeaderCell>AMOUNT (BTC)</HeaderCell>
            <HeaderCell>TOTAL (BTC)</HeaderCell>
            <HeaderCell>ASK (USD)</HeaderCell>
          </TableHeader>
          <OrderList ref={askListRef} onScroll={handleAskScroll}>
            {asksWithTotals.map((ask, index) => (
              <OrderRow key={index}>
                <DepthBar width={(ask.cumulative / maxTotal) * 100} isAsk={true} />
                <Amount>{formatQuantity(ask.totalQuantity)}</Amount>
                <Total>{formatQuantity(ask.cumulative)}</Total>
                <Price sx={{ color: '#ff3b30' }}>{formatPrice(ask.price)}</Price>
              </OrderRow>
            ))}
            {priceLabels.map((label, index) => (
              <PriceLabel key={index} style={{ top: `${(index + 1) * 20}px` }}>
                {label.label}
              </PriceLabel>
            ))}
          </OrderList>
        </OrderSection>

        <OrderSection>
          <TableHeader>
            <HeaderCell>AMOUNT (BTC)</HeaderCell>
            <HeaderCell>TOTAL (BTC)</HeaderCell>
            <HeaderCell>BID (USD)</HeaderCell>
          </TableHeader>
          <OrderList ref={bidListRef} onScroll={handleBidScroll}>
            {bidsWithTotals.map((bid, index) => (
              <OrderRow key={index}>
                <DepthBar width={(bid.cumulative / maxTotal) * 100} isAsk={false} />
                <Amount>{formatQuantity(bid.totalQuantity)}</Amount>
                <Total>{formatQuantity(bid.cumulative)}</Total>
                <Price sx={{ color: '#4caf50' }}>{formatPrice(bid.price)}</Price>
              </OrderRow>
            ))}
          </OrderList>
        </OrderSection>
      </OrderBookContainer>
    </MuiWidget>
  );
};

export default OrderBook;
