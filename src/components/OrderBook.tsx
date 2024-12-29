import React, { useState, useEffect, useMemo, useRef } from 'react';
import useBinanceOrderBook from '../hooks/useBinanceOrderBook';
import useBybitOrderBook from '../hooks/useBybitOrderBook';
import useCoinbaseOrderBook from '../hooks/useCoinbaseOrderBook';
import { OrderBookProps, OrderBookEntry } from '../types/exchange';
import { formatPrice, formatQuantity, calculateSpreadPercentage } from '../utils/formatPrice';
import WidgetHeader from './WidgetHeader';
import './OrderBook.css';

export const EXCHANGES = {
  BINANCE: 'BINANCE',
  BYBIT: 'BYBIT',
  COINBASE: 'COINBASE'
} as const;

type Exchange = typeof EXCHANGES[keyof typeof EXCHANGES];

interface AggregatedOrderBookEntry extends OrderBookEntry {
  exchanges: Exchange[];
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol = 'BTCUSDT', className = '' }) => {
  const [enabledExchanges, setEnabledExchanges] = useState<Exchange[]>([EXCHANGES.BINANCE]);
  const [error, setError] = useState<string | null>(null);

  // Use hooks for each exchange
  const binance = useBinanceOrderBook(symbol);
  const bybit = useBybitOrderBook(symbol);
  const coinbase = useCoinbaseOrderBook(symbol);

  const getConnectionStatus = (exchange: Exchange) => {
    switch (exchange) {
      case EXCHANGES.BINANCE:
        return binance.connectionState;
      case EXCHANGES.COINBASE:
        return coinbase.connectionState;
      case EXCHANGES.BYBIT:
        return bybit.connectionState;
      default:
        return 'unknown';
    }
  };

  // Set error if any exchange has an error
  useEffect(() => {
    const errors = [binance.error, bybit.error, coinbase.error].filter(Boolean);
    if (errors.length > 0) {
      setError(errors[0]);
    } else {
      setError(null);
    }
  }, [binance.error, bybit.error, coinbase.error]);

  // Combine and process order book data
  const { bids, asks } = useMemo(() => {
    const allBids: (OrderBookEntry & { exchange: Exchange })[] = [];
    const allAsks: (OrderBookEntry & { exchange: Exchange })[] = [];

    if (enabledExchanges.includes(EXCHANGES.BINANCE)) {
      allBids.push(...binance.orderBook.bids.map(bid => ({ ...bid, exchange: EXCHANGES.BINANCE })));
      allAsks.push(...binance.orderBook.asks.map(ask => ({ ...ask, exchange: EXCHANGES.BINANCE })));
    }

    if (enabledExchanges.includes(EXCHANGES.BYBIT)) {
      allBids.push(...bybit.orderBook.bids.map((bid: OrderBookEntry) => ({ ...bid, exchange: EXCHANGES.BYBIT })));
      allAsks.push(...bybit.orderBook.asks.map((ask: OrderBookEntry) => ({ ...ask, exchange: EXCHANGES.BYBIT })));
    }

    if (enabledExchanges.includes(EXCHANGES.COINBASE)) {
      allBids.push(...coinbase.orderBook.bids.map(bid => ({ ...bid, exchange: EXCHANGES.COINBASE })));
      allAsks.push(...coinbase.orderBook.asks.map(ask => ({ ...ask, exchange: EXCHANGES.COINBASE })));
    }

    // Aggregate and sort bids
    const aggregatedBids: AggregatedOrderBookEntry[] = allBids
      .reduce<AggregatedOrderBookEntry[]>((acc, bid) => {
        const existingBid = acc.find(b => b.price === bid.price);
        if (existingBid) {
          existingBid.quantity += bid.quantity;
          existingBid.exchanges = [...existingBid.exchanges, bid.exchange];
        } else {
          acc.push({ ...bid, exchanges: [bid.exchange] });
        }
        return acc;
      }, [])
      .sort((a, b) => b.price - a.price);

    // Aggregate and sort asks
    const aggregatedAsks: AggregatedOrderBookEntry[] = allAsks
      .reduce<AggregatedOrderBookEntry[]>((acc, ask) => {
        const existingAsk = acc.find(a => a.price === ask.price);
        if (existingAsk) {
          existingAsk.quantity += ask.quantity;
          existingAsk.exchanges = [...existingAsk.exchanges, ask.exchange];
        } else {
          acc.push({ ...ask, exchanges: [ask.exchange] });
        }
        return acc;
      }, [])
      .sort((a, b) => a.price - b.price);

    return { bids: aggregatedBids, asks: aggregatedAsks };
  }, [
    enabledExchanges,
    binance.orderBook,
    bybit.orderBook,
    coinbase.orderBook
  ]);

  const handleToggleExchange = (exchange: Exchange) => {
    setEnabledExchanges(prev => {
      if (prev.includes(exchange)) {
        return prev.filter(e => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  const renderExchangeSettings = () => (
    <div className="exchange-toggles">
      {Object.values(EXCHANGES).map(exchange => (
        <label key={exchange} className="exchange-toggle">
          <input
            type="checkbox"
            checked={enabledExchanges.includes(exchange)}
            onChange={() => handleToggleExchange(exchange)}
          />
          <span>{exchange}</span>
          <span 
            className={`connection-status ${getConnectionStatus(exchange)}`}
            onClick={() => {
              const status = getConnectionStatus(exchange);
              if (status === 'disconnected' || status === 'error') {
                switch (exchange) {
                  case EXCHANGES.BINANCE:
                    binance.reconnect?.();
                    break;
                  case EXCHANGES.BYBIT:
                    bybit.reconnect?.();
                    break;
                  case EXCHANGES.COINBASE:
                    coinbase.reconnect?.();
                    break;
                }
              }
            }}
            title={
              getConnectionStatus(exchange) === 'disconnected' || 
              getConnectionStatus(exchange) === 'error' 
                ? 'Click to reconnect' 
                : undefined
            }
          >
            {getConnectionStatus(exchange) === 'connected' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            {getConnectionStatus(exchange) === 'connecting' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v3m0 12v3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M3 12h3m12 0h3M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122" />
              </svg>
            )}
            {(getConnectionStatus(exchange) === 'disconnected' || getConnectionStatus(exchange) === 'error') && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {getConnectionStatus(exchange)}
          </span>
        </label>
      ))}
    </div>
  );

  const asksRef = useRef<HTMLDivElement>(null);
  const bidsRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState<'asks' | 'bids' | null>(null);

  const [scrollStates, setScrollStates] = useState({
    asks: { isTop: true, isBottom: false },
    bids: { isTop: true, isBottom: false }
  });

  const updateScrollState = (section: 'asks' | 'bids', target: HTMLDivElement) => {
    const isTop = target.scrollTop <= 0;
    const isBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) <= 1;
    
    setScrollStates(prev => ({
      ...prev,
      [section]: { isTop, isBottom }
    }));
  };

  const handleScroll = (section: 'asks' | 'bids') => (event: React.UIEvent<HTMLDivElement>) => {
    if (scrolling !== section) {
      setScrolling(section);
      const target = event.currentTarget;
      const otherRef = section === 'asks' ? bidsRef.current : asksRef.current;
      
      updateScrollState(section, target);
      
      if (otherRef) {
        const targetScrollMax = target.scrollHeight - target.clientHeight;
        const otherScrollMax = otherRef.scrollHeight - otherRef.clientHeight;
        
        // For asks section (reversed), we need to invert the scroll percentage
        const scrollPercentage = section === 'asks'
          ? (targetScrollMax - target.scrollTop) / targetScrollMax
          : target.scrollTop / targetScrollMax;
        
        // Apply the inverted percentage for asks section
        const otherScrollTop = section === 'asks'
          ? otherScrollMax * scrollPercentage
          : otherScrollMax * (1 - scrollPercentage);
        
        otherRef.scrollTop = otherScrollTop;
        updateScrollState(section === 'asks' ? 'bids' : 'asks', otherRef);
      }
      
      setScrolling(null);
    }
  };

  const formatTooltip = (entry: AggregatedOrderBookEntry) => {
    const totalValue = entry.price * entry.quantity;
    return `${entry.exchanges.length} exchange${entry.exchanges.length > 1 ? 's' : ''} | Total value: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className={`orderbook ${className}`}>
      {error && <div className="orderbook-error">{error}</div>}
      <WidgetHeader
        title={`Order Book - ${symbol}`}
        settingsContent={renderExchangeSettings()}
      />
      <div className="orderbook-content">
        <div className="orderbook-header">
          <div className="column-headers">
            <div className="amount">Amount</div>
            <div className="total">Total</div>
            <div className="price">Price</div>
          </div>
        </div>
        <div className="orderbook-sections">
          <div className={`orderbook-section asks-section ${scrollStates.asks.isTop ? 'scrolled-top' : ''} ${scrollStates.asks.isBottom ? 'scrolled-bottom' : ''}`}>
            <div 
              ref={asksRef}
              className="orderbook-section-content"
              onScroll={handleScroll('asks')}
            >
              {asks.map((ask, index) => {
                const totalUpToHere = asks
                  .slice(0, index + 1)
                  .reduce((sum, a) => sum + a.quantity, 0);
                return (
                  <div 
                    key={`ask-${index}`} 
                    className="order-row ask"
                    data-tooltip={formatTooltip(ask)}
                  >
                    <div className="amount">{formatQuantity(ask.quantity)}</div>
                    <div className="total">{formatQuantity(totalUpToHere)}</div>
                    <div className="price sell">{formatPrice(ask.price)}</div>
                    <div className="depth-visualization" style={{
                      width: `${(ask.quantity / Math.max(...asks.slice(0, 16).map(a => a.quantity))) * 100}%`
                    }} />
                    <div className="exchanges">
                      {ask.exchanges.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div 
              className="scroll-indicator"
              style={{
                opacity: scrollStates.asks.isTop ? 0 : 0.3,
                transform: `translateY(${scrollStates.asks.isTop ? '0' : '100%'})`
              }}
            />
          </div>

          <div className="spread">
            {asks.length > 0 && bids.length > 0 && (
              <div>
                Spread: {formatPrice(asks[0].price - bids[0].price)} (
                {calculateSpreadPercentage(bids[0].price, asks[0].price)}%)
              </div>
            )}
          </div>

          <div className={`orderbook-section bids-section ${scrollStates.bids.isTop ? 'scrolled-top' : ''} ${scrollStates.bids.isBottom ? 'scrolled-bottom' : ''}`}>
            <div 
              ref={bidsRef}
              className="orderbook-section-content"
              onScroll={handleScroll('bids')}
            >
              {bids.map((bid, index) => {
                const totalUpToHere = bids
                  .slice(0, index + 1)
                  .reduce((sum, b) => sum + b.quantity, 0);
                return (
                  <div 
                    key={`bid-${index}`} 
                    className="order-row bid"
                    data-tooltip={formatTooltip(bid)}
                  >
                    <div className="amount">{formatQuantity(bid.quantity)}</div>
                    <div className="total">{formatQuantity(totalUpToHere)}</div>
                    <div className="price buy">{formatPrice(bid.price)}</div>
                    <div className="depth-visualization" style={{
                      width: `${(bid.quantity / Math.max(...bids.slice(0, 16).map(b => b.quantity))) * 100}%`
                    }} />
                    <div className="exchanges">
                      {bid.exchanges.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div 
              className="scroll-indicator"
              style={{
                opacity: scrollStates.bids.isTop ? 0 : 0.3,
                transform: `translateY(${scrollStates.bids.isTop ? '0' : '100%'})`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;