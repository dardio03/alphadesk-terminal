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
          <span className={`connection-status ${getConnectionStatus(exchange)}`}>
            {getConnectionStatus(exchange)}
          </span>
        </label>
      ))}
    </div>
  );

  const asksRef = useRef<HTMLDivElement>(null);
  const bidsRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState<'asks' | 'bids' | null>(null);

  const handleScroll = (section: 'asks' | 'bids') => (event: React.UIEvent<HTMLDivElement>) => {
    if (scrolling !== section) {
      setScrolling(section);
      const target = event.currentTarget;
      const otherRef = section === 'asks' ? bidsRef.current : asksRef.current;
      
      if (otherRef) {
        const scrollPercentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
        const otherScrollTop = scrollPercentage * (otherRef.scrollHeight - otherRef.clientHeight);
        otherRef.scrollTop = otherScrollTop;
      }
      
      setScrolling(null);
    }
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
          <div className="orderbook-section asks-section">
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
                  <div key={`ask-${index}`} className="order-row ask">
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
          </div>

          <div className="spread">
            {asks.length > 0 && bids.length > 0 && (
              <div>
                Spread: {formatPrice(asks[0].price - bids[0].price)} (
                {calculateSpreadPercentage(bids[0].price, asks[0].price)}%)
              </div>
            )}
          </div>

          <div className="orderbook-section bids-section">
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
                  <div key={`bid-${index}`} className="order-row bid">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;