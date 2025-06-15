import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { aggregatorService } from "../services/aggregatorService";
import { ExchangeId } from "../types/exchange";
import ExchangeFactory, { ExchangeConnection, OrderBookData, OrderBookEntry } from "../utils/ExchangeService";
import { OrderBookProps } from "../types/exchange";
import { formatPrice, formatQuantity } from "../utils/formatPrice";
import { ErrorContext } from '../utils/ErrorHandler';
import ExchangeSettings from './ExchangeSettings';
import { EXCHANGES } from '../constants/exchanges';

import "./OrderBook.css";

// Define available exchanges
const AVAILABLE_EXCHANGES = EXCHANGES;

interface AggregatedOrderBookEntry extends OrderBookEntry {
  exchanges: string[];
  exchangeQuantities: Record<string, number>;
  totalQuantity: number;
}

const OrderBook: React.FC<OrderBookProps> = ({
  symbol = "BTCUSDT",
  className = "",
}) => {
  const [activeExchanges, setActiveExchanges] = useState<ExchangeId[]>(
    AVAILABLE_EXCHANGES.map(exchange => exchange as ExchangeId)
  );
  const [exchangeConnections, setExchangeConnections] = useState<{ [key: string]: ExchangeConnection }>({});
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: ErrorContext }>({});
  const [maxDepth, setMaxDepth] = useState<number>(100);
  const [isInitialized, setIsInitialized] = useState(false);
  const [bids, setBids] = useState<AggregatedOrderBookEntry[]>([]);
  const [asks, setAsks] = useState<AggregatedOrderBookEntry[]>([]);

  useEffect(() => {
    const handleInitialized = () => {
      setIsInitialized(true);
      setError(null); // Clear any previous errors
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

    const handleOrderBookUpdate = (data: OrderBookData) => {
      if (!data || (!data.bids && !data.asks)) {
        setError('Received invalid order book data');
        return;
      }

      try {
        setBids(data.bids.map((b) => ({ 
          ...b, 
          exchanges: b.exchanges || ["aggregated"],
          exchangeQuantities: b.exchangeQuantities || { "aggregated": b.quantity },
          totalQuantity: b.totalQuantity || b.quantity
        })));
        setAsks(data.asks.map((a) => ({ 
          ...a, 
          exchanges: a.exchanges || ["aggregated"],
          exchangeQuantities: a.exchangeQuantities || { "aggregated": a.quantity },
          totalQuantity: a.totalQuantity || a.quantity
        })));
        setError(null); // Clear any previous errors
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
        setError(null); // Clear any previous errors
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

  const handleExchangeToggle = (exchangeId: string) => {
    setActiveExchanges(prev => {
      if (prev.includes(exchangeId as ExchangeId)) {
        return prev.filter(id => id !== exchangeId);
      } else {
        return [...prev, exchangeId as ExchangeId];
      }
    });
  };

  const asksRef = useRef<HTMLDivElement>(null);
  const bidsRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState<"asks" | "bids" | null>(null);

  const [scrollStates, setScrollStates] = useState({
    asks: { isTop: true, isBottom: false },
    bids: { isTop: true, isBottom: false },
  });

  const updateScrollState = (
    section: "asks" | "bids",
    target: HTMLDivElement,
  ) => {
    const isTop = target.scrollTop <= 0;
    const isBottom =
      Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) <=
      1;

    setScrollStates((prev) => ({
      ...prev,
      [section]: { isTop, isBottom },
    }));
  };

  const handleScroll =
    (section: "asks" | "bids") => (event: React.UIEvent<HTMLDivElement>) => {
      if (scrolling !== section) {
        setScrolling(section);
        const target = event.currentTarget;
        const otherRef = section === "asks" ? bidsRef.current : asksRef.current;

        updateScrollState(section, target);

        if (otherRef) {
          const targetScrollMax = target.scrollHeight - target.clientHeight;
          const otherScrollMax = otherRef.scrollHeight - otherRef.clientHeight;

          // For asks section (reversed), we need to invert the scroll percentage
          const scrollPercentage =
            section === "asks"
              ? (targetScrollMax - target.scrollTop) / targetScrollMax
              : target.scrollTop / targetScrollMax;

          // Apply the inverted percentage for asks section
          const otherScrollTop =
            section === "asks"
              ? otherScrollMax * scrollPercentage
              : otherScrollMax * (1 - scrollPercentage);

          otherRef.scrollTop = otherScrollTop;
          updateScrollState(section === "asks" ? "bids" : "asks", otherRef);
        }

        setScrolling(null);
      }
    };

  const formatTooltip = (entry: AggregatedOrderBookEntry) => {
    const totalValue = entry.price * entry.quantity;
    return `${entry.exchanges.length} exchange${entry.exchanges.length > 1 ? "s" : ""} | Total value: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  // Performance optimization: Memoize exchange statistics
  const exchangeStats = useMemo(() => {
    const stats = new Map<string, { bidCount: number; askCount: number; totalBidQty: number; totalAskQty: number }>();
    
    [...bids, ...asks].forEach(entry => {
      entry.exchanges.forEach(exchange => {
        if (!stats.has(exchange)) {
          stats.set(exchange, { bidCount: 0, askCount: 0, totalBidQty: 0, totalAskQty: 0 });
        }
        const stat = stats.get(exchange)!;
        if (entry.price > 0) {
          stat.bidCount++;
          stat.totalBidQty += entry.quantity;
        } else {
          stat.askCount++;
          stat.totalAskQty += entry.quantity;
        }
      });
    });
    
    return stats;
  }, [bids, asks]);

  // Performance optimization: Memoize depth calculation
  const calculateDepth = useCallback((entries: AggregatedOrderBookEntry[]) => {
    let total = 0;
    return entries.map(entry => {
      total += entry.totalQuantity;
      return total;
    });
  }, []);

  const bidDepths = useMemo(() => calculateDepth(filteredBids), [filteredBids, calculateDepth]);
  const askDepths = useMemo(() => calculateDepth(filteredAsks), [filteredAsks, calculateDepth]);

  const renderOrderBookEntry = (entry: AggregatedOrderBookEntry, type: 'bid' | 'ask', index: number) => {
    const depth = type === 'bid' ? bidDepths[index] : askDepths[index];
    const maxDepth = type === 'bid' ? bidDepths[bidDepths.length - 1] : askDepths[askDepths.length - 1];
    const depthPercentage = (depth / maxDepth) * 100;

    return (
      <div className={`orderbook-entry ${type}`} key={entry.price}>
        <div 
          className="depth-bar" 
          style={{ width: `${depthPercentage}%` }}
        />
        <div className="price">{formatPrice(entry.price)}</div>
        <div className="quantity">{formatQuantity(entry.totalQuantity)}</div>
        <div className="exchange-breakdown">
          {entry.exchanges.map(exchange => (
            <div key={exchange} className="exchange-quantity">
              <span className="exchange-name">{exchange}</span>
              <span className="quantity">
                {formatQuantity(entry.exchangeQuantities[exchange])}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <div className={`order-book ${className}`}>
        <div className="order-book-header">
          <h2>Order Book - {symbol}</h2>
        </div>
        <div className="orderbook-content">
          <div className="loading">Initializing...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`order-book ${className}`}>
      <div className="order-book-header">
        <h2>Order Book - {symbol}</h2>
        <ExchangeSettings
          activeExchanges={activeExchanges}
          onExchangeToggle={handleExchangeToggle}
          getExchangeStatus={(exchangeId) => aggregatorService.getExchangeStatus(exchangeId)}
        />
      </div>
      <div className="orderbook-content">
        <div className="asks" ref={asksRef} onScroll={handleScroll("asks")}>
          <div className="header">
            <div className="price">Price</div>
            <div className="quantity">Quantity</div>
          </div>
          {filteredAsks.map((entry, index) => renderOrderBookEntry(entry, 'ask', index))}
        </div>
        <div className="bids" ref={bidsRef} onScroll={handleScroll("bids")}>
          <div className="header">
            <div className="price">Price</div>
            <div className="quantity">Quantity</div>
          </div>
          {filteredBids.map((entry, index) => renderOrderBookEntry(entry, 'bid', index))}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
