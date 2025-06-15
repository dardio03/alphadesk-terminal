import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { formatPrice } from '../utils/formatPrice';
import { Typography } from './common';
import { theme } from '../styles/theme';
import { ExchangeId, OrderBookData } from '../types/exchange';
import { aggregatorService } from '../services/aggregatorService';
import { EXCHANGE_ICONS } from '../utils/exchangeIcons';

interface ExchangeData {
  id: string;
  name: string;
  price: number;
  icon: string;
  timestamp: number;
}

interface PriceRangeProps {
  symbol?: string;
  className?: string;
}

const slideIn = keyframes`
  from {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
`;

interface ContainerProps {
  width?: number;
}

const Container = styled.div<ContainerProps>`
  position: relative;
  width: ${(props: ContainerProps) => props.width ? `${props.width}px` : '100%'};
  height: 100%;
  padding: 8px;
  user-select: none;
  display: flex;
  align-items: center;
`;

const Bar = styled.div`
  position: absolute;
  top: 50%;
  left: 32px;
  right: 32px;
  transform: translateY(-50%);
  height: 4px;
  background: linear-gradient(
    90deg,
    ${theme.colors.primary.main}40,
    ${theme.colors.primary.main}80
  );
  border-radius: ${theme.radii.sm};
  box-shadow: ${theme.shadows.md};
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: linear-gradient(
      90deg,
      ${theme.colors.primary.main}10,
      ${theme.colors.primary.main}20
    );
    border-radius: inherit;
    z-index: -1;
  }
`;

const PriceLabel = styled(Typography).attrs({ $variant: 'numeric' })`
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
  bottom: 4px;
  font-size: 11px;
  color: ${theme.colors.text.secondary};
`;

interface ExchangeIconProps {
  position: number;
  isUp: boolean;
}

const ExchangeIcon = styled.div<ExchangeIconProps>`
  position: absolute;
  left: ${(props: ExchangeIconProps) => props.position}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: ${theme.radii.full};
  background-color: ${theme.colors.background.paper};
  box-shadow: ${theme.shadows.md};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  border: 2px solid ${(props: ExchangeIconProps) => 
    props.isUp ? theme.colors.success.main : theme.colors.error.main};
  animation: ${slideIn} 0.3s ease-out;
  z-index: ${theme.zIndices.base};

  &:hover {
    transform: translate(-50%, -50%) scale(1.15);
    z-index: ${theme.zIndices.tooltip};
    box-shadow: ${theme.shadows.lg};
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: ${theme.radii.full};
    object-fit: cover;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.background.raised};
  color: ${theme.colors.text.primary};
  border-radius: ${theme.radii.md};
  font-size: ${theme.typography.fontSizes.sm};
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  box-shadow: ${theme.shadows.lg};

  ${ExchangeIcon}:hover & {
    opacity: 1;
  }

  &:after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${theme.colors.background.raised};
  }
`;

const PriceRange: React.FC<PriceRangeProps> = ({ symbol = 'BTC/USDT', className = '' }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [activeExchanges, setActiveExchanges] = useState<Record<ExchangeId, boolean>>({
    BINANCE: true,
    BINANCE_FUTURES: false,
    BINANCE_US: false,
    BITFINEX: false,
    BITGET: false,
    BITMART: false,
    BITMEX: false,
    BITSTAMP: false,
    BITUNIX: false,
    BYBIT: true,
    COINBASE: true,
    CRYPTOCOM: false,
    DERIBIT: false,
    DYDX: false,
    GATEIO: false,
    HITBTC: false,
    HUOBI: false,
    KRAKEN: true,
    KUCOIN: false,
    MEXC: false,
    OKEX: false,
    PHEMEX: false,
    POLONIEX: false,
    UNISWAP: false
  });

  useEffect(() => {
    const handleInitialized = () => {
      setIsInitialized(true);
      setIsLoading(false);
    };

    const handleError = (error: Error) => {
      setError(error.message);
      setIsLoading(false);
    };

    const handleOrderBookUpdate = (data: OrderBookData) => {
      setOrderBook(data);
      setIsLoading(false);
    };

    aggregatorService.on('initialized', handleInitialized);
    aggregatorService.on('error', handleError);
    aggregatorService.on('orderbook', handleOrderBookUpdate);

    return () => {
      aggregatorService.off('initialized', handleInitialized);
      aggregatorService.off('error', handleError);
      aggregatorService.off('orderbook', handleOrderBookUpdate);
    };
  }, []);

  useEffect(() => {
    if (isInitialized) {
      const enabledExchanges = Object.entries(activeExchanges)
        .filter(([_, enabled]) => enabled)
        .map(([exchange]) => exchange as ExchangeId);

      aggregatorService.subscribe(symbol, enabledExchanges);
    }

    return () => {
      const enabledExchanges = Object.entries(activeExchanges)
        .filter(([_, enabled]) => enabled)
        .map(([exchange]) => exchange as ExchangeId);
      aggregatorService.unsubscribe(enabledExchanges);
    };
  }, [isInitialized, symbol, activeExchanges]);

  const toggleExchange = (exchange: ExchangeId) => {
    setActiveExchanges(prev => ({
      ...prev,
      [exchange]: !prev[exchange]
    }));
  };

  const getExchangeStatus = (exchange: ExchangeId) => {
    return aggregatorService.getExchangeStatus(exchange);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-gray-500">Loading prices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  const bestBid = orderBook.bids[0]?.price || 0;
  const bestAsk = orderBook.asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const spreadPercentage = (spread / bestBid) * 100;

  return (
    <div className={`p-4 ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Price Range</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Best Bid</div>
            <div className="text-lg font-medium text-green-500">{bestBid.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Best Ask</div>
            <div className="text-lg font-medium text-red-500">{bestAsk.toFixed(2)}</div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm text-gray-500">Spread</div>
          <div className="text-lg font-medium">{spread.toFixed(2)} ({spreadPercentage.toFixed(2)}%)</div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-md font-semibold mb-2">Active Exchanges</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(activeExchanges).map(([exchange, enabled]) => {
            const status = getExchangeStatus(exchange as ExchangeId);
            const icon = EXCHANGE_ICONS[exchange.toLowerCase() as keyof typeof EXCHANGE_ICONS];
            
            return (
              <div
                key={exchange}
                className={`flex items-center p-2 rounded cursor-pointer ${
                  enabled ? 'bg-blue-100' : 'bg-gray-100'
                }`}
                onClick={() => toggleExchange(exchange as ExchangeId)}
              >
                {icon && (
                  <img
                    src={icon}
                    alt={exchange}
                    className="w-6 h-6 mr-2 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{exchange}</div>
                  <div className={`text-xs ${
                    status === 'connected' ? 'text-green-500' :
                    status === 'connecting' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PriceRange;