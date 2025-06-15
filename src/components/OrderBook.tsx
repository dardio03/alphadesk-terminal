import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Box, Typography, styled } from '@mui/material';
import { MuiWidget } from './common/MuiWidget';
import { ExchangeId } from "../types/exchange";
import { aggregatorService } from "../services/aggregatorService";
import { ErrorContext } from '../utils/ErrorHandler';
import { formatPrice, formatQuantity } from "../utils/formatPrice";

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
});

const OrderSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
});

const OrderList = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const TableHeader = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  padding: '4px 8px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const HeaderCell = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  fontFamily: 'monospace',
  textAlign: 'right',
  '&:first-of-type': {
    textAlign: 'left',
  },
}));

const OrderRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  padding: '2px 8px',
  fontSize: '12px',
  fontFamily: 'monospace',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
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
  color: theme.palette.text.secondary,
}));

const Total = styled(Cell)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

interface OrderBookProps {
  symbol: string;
  activeExchanges: ExchangeId[];
}

const OrderBook: React.FC<OrderBookProps> = ({
  symbol = "BTCUSDT",
  activeExchanges = [],
}) => {
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: ErrorContext }>({});
  const [maxDepth, setMaxDepth] = useState<number>(16);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bids, setBids] = useState<AggregatedOrderBookEntry[]>([]);
  const [asks, setAsks] = useState<AggregatedOrderBookEntry[]>([]);

  useEffect(() => {
    const handleInitialized = () => {
      setIsInitialized(true);
      setError(null);
    };

    const handleError = (context: ErrorContext) => {
      console.error(`Exchange error:`, context);
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

    const handleOrderBookUpdate = (data: any) => {
      if (!data || (!data.bids && !data.asks)) {
        setError('Received invalid order book data');
        return;
      }

      try {
        setBids(data.bids.map((b: any) => ({ 
          ...b, 
          exchanges: b.exchanges || ["aggregated"],
          exchangeQuantities: b.exchangeQuantities || { "aggregated": b.quantity },
          totalQuantity: b.totalQuantity || b.quantity
        })));
        setAsks(data.asks.map((a: any) => ({ 
          ...a, 
          exchanges: a.exchanges || ["aggregated"],
          exchangeQuantities: a.exchangeQuantities || { "aggregated": a.quantity },
          totalQuantity: a.totalQuantity || a.quantity
        })));
        setError(null);
      } catch (error) {
        console.error('Error processing order book update:', error);
        setError(`Error processing order book data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    aggregatorService.on('initialized', handleInitialized);
    aggregatorService.on('error', handleError);
    aggregatorService.on('orderBook', handleOrderBookUpdate);

    return () => {
      aggregatorService.off('initialized', handleInitialized);
      aggregatorService.off('error', handleError);
      aggregatorService.off('orderBook', handleOrderBookUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const subscribe = async () => {
      try {
        setError(null);
        await aggregatorService.subscribe(symbol, activeExchanges);
      } catch (error) {
        console.error('Failed to subscribe:', error);
        setError(error instanceof Error ? error.message : 'Failed to subscribe');
      }
    };

    subscribe();

    return () => {
      try {
        aggregatorService.unsubscribe(activeExchanges);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    };
  }, [symbol, activeExchanges, isInitialized]);

  // Performance optimization: Memoize filtered and sorted orderbook entries
  const filteredBids = useMemo(() => {
    return bids
      .filter(entry => activeExchanges.length === 0 || entry.exchanges.some(ex => activeExchanges.includes(ex as ExchangeId)))
      .sort((a, b) => b.price - a.price)
      .slice(0, maxDepth);
  }, [bids, activeExchanges, maxDepth]);

  const filteredAsks = useMemo(() => {
    return asks
      .filter(entry => activeExchanges.length === 0 || entry.exchanges.some(ex => activeExchanges.includes(ex as ExchangeId)))
      .sort((a, b) => a.price - b.price)
      .slice(0, maxDepth);
  }, [asks, activeExchanges, maxDepth]);

  // Calculate cumulative totals
  const calculateCumulativeTotals = (orders: AggregatedOrderBookEntry[]) => {
    let cumulative = 0;
    return orders.map(order => {
      cumulative += order.totalQuantity;
      return { ...order, cumulative };
    });
  };

  const bidsWithTotals = useMemo(() => {
    return calculateCumulativeTotals(filteredBids);
  }, [filteredBids]);

  const asksWithTotals = useMemo(() => {
    return calculateCumulativeTotals(filteredAsks);
  }, [filteredAsks]);

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
            <HeaderCell>Amount</HeaderCell>
            <HeaderCell>Total</HeaderCell>
            <HeaderCell>Bid</HeaderCell>
          </TableHeader>
          <OrderList>
            {bidsWithTotals.map((bid, index) => (
              <OrderRow key={index}>
                <Amount>{formatQuantity(bid.totalQuantity)}</Amount>
                <Total>{formatQuantity(bid.cumulative)}</Total>
                <Price sx={{ color: 'success.main' }}>{formatPrice(bid.price)}</Price>
              </OrderRow>
            ))}
          </OrderList>
        </OrderSection>

        <OrderSection>
          <TableHeader>
            <HeaderCell>Amount</HeaderCell>
            <HeaderCell>Total</HeaderCell>
            <HeaderCell>Ask</HeaderCell>
          </TableHeader>
          <OrderList>
            {asksWithTotals.map((ask, index) => (
              <OrderRow key={index}>
                <Amount>{formatQuantity(ask.totalQuantity)}</Amount>
                <Total>{formatQuantity(ask.cumulative)}</Total>
                <Price sx={{ color: 'error.main' }}>{formatPrice(ask.price)}</Price>
              </OrderRow>
            ))}
          </OrderList>
        </OrderSection>
      </OrderBookContainer>
    </MuiWidget>
  );
};

export default OrderBook;
