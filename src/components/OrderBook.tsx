import React, { useState, useEffect, useRef, useMemo } from 'react';
import aggregatorService, { ExchangeId } from '../services/aggregatorService';
import ExchangeFactory, {
  ExchangeConnection,
  OrderBookData,
  OrderBookEntry,
} from '../utils/ExchangeService';
import { OrderBookProps } from '../types/exchange';
import {
  formatPrice,
  formatQuantity,
  calculateSpreadPercentage,
} from '../utils/formatPrice';

import "./OrderBook.css";

export const EXCHANGES = {
  BINANCE: "BINANCE",
  BYBIT: "BYBIT",
  COINBASE: "COINBASE",
  KRAKEN: "KRAKEN",
} as const;

type Exchange = ExchangeId;

interface AggregatedOrderBookEntry extends OrderBookEntry {
  exchanges: string[];
}

const OrderBook: React.FC<OrderBookProps> = ({
  symbol = "BTCUSDT",
  className = "",
}) => {
  const [enabledExchanges, setEnabledExchanges] = useState<Exchange[]>([
    EXCHANGES.BINANCE,
    EXCHANGES.BYBIT,
    EXCHANGES.COINBASE,
    EXCHANGES.KRAKEN,
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aggregatorService.subscribe(symbol, enabledExchanges);

    return () => {
      aggregatorService.unsubscribe(symbol);
    };
  }, []);

  useEffect(() => {
    const handleError = (payload: { message: string }) => {
      setError(payload.message);
    };

    aggregatorService.on('ERROR', handleError);

    const initializeExchanges = async () => {
      const exchangeInstances = Object.values(EXCHANGES).reduce((acc, exchange) => {
        acc[exchange] = ExchangeFactory.getExchange(exchange);
        return acc;
      }, {} as { [key: string]: ExchangeConnection });

      setExchanges(exchangeInstances);

      // Connect to all enabled exchanges
      enabledExchanges.forEach(exchange => {
        exchangeInstances[exchange].connect();
        exchangeInstances[exchange].subscribe(symbol);
        exchangeInstances[exchange].onOrderBookUpdate((data: OrderBookData) => {
          // Handle order book updates
        });
        exchangeInstances[exchange].onError((error: Error) => {
          setError(error.message);
        });
      });
    };

    const handleError = (evt: { exchange: string; error: Error }) =>
      setError(evt.error.message);
    aggregatorService.on("error", handleError);

    return () => {
      aggregatorService.off("error", handleError);
      aggregatorService.unsubscribe(symbol);
      aggregatorService.off('ERROR', handleError);
      // Cleanup
      Object.values(exchanges).forEach(exchange => {
        exchange.unsubscribe(symbol);
        exchange.disconnect();
      });
    };
  }, [symbol]);

  useEffect(() => {
    aggregatorService.updateExchanges(enabledExchanges);
  }, [enabledExchanges]);

  const getConnectionStatus = (exchange: Exchange) => {
    return aggregatorService.getStatus(exchange as ExchangeId);
  };

  const [bids, setBids] = useState<AggregatedOrderBookEntry[]>([]);
  const [asks, setAsks] = useState<AggregatedOrderBookEntry[]>([]);

  useEffect(() => {
    const handleUpdate = (data: OrderBookData) => {
      setBids(data.bids.map((b) => ({ ...b, exchanges: ["aggregated"] })));
      setAsks(data.asks.map((a) => ({ ...a, exchanges: ["aggregated"] })));
    };
    aggregatorService.on("orderBook", handleUpdate);
    return () => {
      aggregatorService.off("orderBook", handleUpdate);
    };
  }, []);

  const handleToggleExchange = (exchange: Exchange) => {
    setEnabledExchanges((prev) => {
      if (prev.includes(exchange)) {
        return prev.filter((e) => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  const renderExchangeSettings = () => (
    <div className="exchange-toggles">
      {Object.values(EXCHANGES).map((exchange) => (
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
              if (status === "disconnected" || status === "error") {
                aggregatorService.reconnect(exchange as ExchangeId);
              }
            }}
            title={
              getConnectionStatus(exchange) === "disconnected" ||
              getConnectionStatus(exchange) === "error"
                ? "Click to reconnect"
                : undefined
            }
          >
            {getConnectionStatus(exchange) === "connected" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            {getConnectionStatus(exchange) === "connecting" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v3m0 12v3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M3 12h3m12 0h3M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122" />
              </svg>
            )}
            {(getConnectionStatus(exchange) === "disconnected" ||
              getConnectionStatus(exchange) === "error") && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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

  return (
    <div className={`orderbook ${className}`}>
      {error && <div className="orderbook-error">{error}</div>}
      <div className="orderbook-content">
        <div className="orderbook-header">
          <div className="column-headers">
            <div className="amount">Amount</div>
            <div className="total">Total</div>
            <div className="price">Price</div>
          </div>
        </div>
        <div className="orderbook-sections">
          <div
            className={`orderbook-section asks-section ${scrollStates.asks.isTop ? "scrolled-top" : ""} ${scrollStates.asks.isBottom ? "scrolled-bottom" : ""}`}
          >
            <div
              ref={asksRef}
              className="orderbook-section-content"
              onScroll={handleScroll("asks")}
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
                    <div
                      className="depth-visualization"
                      style={{
                        width: `${(ask.quantity / Math.max(...asks.slice(0, 16).map((a) => a.quantity))) * 100}%`,
                      }}
                    />
                    <div className="exchanges">{ask.exchanges.join(", ")}</div>
                  </div>
                );
              })}
            </div>
            <div
              className="scroll-indicator"
              style={{
                opacity: scrollStates.asks.isTop ? 0 : 0.3,
                transform: `translateY(${scrollStates.asks.isTop ? "0" : "100%"})`,
              }}
            />
          </div>

          <div
            className={`orderbook-section bids-section ${scrollStates.bids.isTop ? "scrolled-top" : ""} ${scrollStates.bids.isBottom ? "scrolled-bottom" : ""}`}
          >
            <div
              ref={bidsRef}
              className="orderbook-section-content"
              onScroll={handleScroll("bids")}
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
                    <div
                      className="depth-visualization"
                      style={{
                        width: `${(bid.quantity / Math.max(...bids.slice(0, 16).map((b) => b.quantity))) * 100}%`,
                      }}
                    />
                    <div className="exchanges">{bid.exchanges.join(", ")}</div>
                  </div>
                );
              })}
            </div>
            <div
              className="scroll-indicator"
              style={{
                opacity: scrollStates.bids.isTop ? 0 : 0.3,
                transform: `translateY(${scrollStates.bids.isTop ? "0" : "100%"})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
