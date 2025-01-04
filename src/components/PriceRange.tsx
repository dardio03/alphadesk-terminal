import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { formatPrice } from '../utils/formatPrice';
import { Typography, Widget } from './common';
import { theme } from '../styles/theme';

interface ExchangeData {
  id: string;
  name: string;
  price: number;
  icon: string;
  timestamp: number;
}

interface PriceRangeProps {
  symbol: string;
  interval?: string;
  width?: number;
}

// Mock exchange data for development
const mockExchanges: ExchangeData[] = [
  {
    id: 'binance',
    name: 'Binance',
    price: 42500.25,
    icon: 'https://assets.coingecko.com/markets/images/52/small/binance.jpg?1519353250',
    timestamp: Date.now()
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    price: 42550.50,
    icon: 'https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin.png?1519353250',
    timestamp: Date.now()
  }
];

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
  height: 60px;
  padding: ${theme.spacing.md};
  user-select: none;
  background-color: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.main};
  border-radius: ${theme.radii.md};
  margin: ${theme.spacing.md} 0;
`;

const Bar = styled.div`
  position: absolute;
  top: 50%;
  left: ${theme.spacing.md};
  right: ${theme.spacing.md};
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

const PriceLabel = styled(Typography).attrs({ variant: 'numeric' })`
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
  bottom: 0;
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
  width: 28px;
  height: 28px;
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

const PriceRange: React.FC<PriceRangeProps> = ({
  symbol,
  interval = '1d',
  width = 800
}) => {
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Using mock data for development
  const exchanges = mockExchanges;

  const { minPrice, maxPrice } = useMemo(() => {
    const prices = exchanges.map(e => e.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding
    };
  }, [exchanges]);

  const calculatePosition = useCallback((price: number): number => {
    const range = maxPrice - minPrice;
    return ((price - minPrice) / range) * 100;
  }, [minPrice, maxPrice]);

  useEffect(() => {
    // Update previous prices for price change indication
    setPreviousPrices(prev => {
      const next = { ...prev };
      exchanges.forEach(exchange => {
        if (!prev[exchange.id]) {
          next[exchange.id] = exchange.price;
        }
      });
      return next;
    });

    // After a delay, update previous prices to current
    const timer = setTimeout(() => {
      setPreviousPrices(
        exchanges.reduce((acc, exchange) => ({
          ...acc,
          [exchange.id]: exchange.price
        }), {})
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [exchanges]);

  if (loading) {
    return <div>Loading price range...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Widget
      title={`Price Range - ${symbol}`}
      loading={loading}
      error={error}
    >
      <Container ref={containerRef} width={width}>
        <Bar />
        <PriceLabel style={{ left: '0%' }}>
          {formatPrice(minPrice)}
        </PriceLabel>
        <PriceLabel style={{ left: '100%' }}>
          {formatPrice(maxPrice)}
        </PriceLabel>

        {exchanges.map((exchange) => {
          const position = calculatePosition(exchange.price);
          const previousPrice = previousPrices[exchange.id] || exchange.price;
          const isUp = exchange.price >= previousPrice;
          const priceDiff = Math.abs(exchange.price - previousPrice);
          const percentChange = (priceDiff / previousPrice) * 100;

          return (
            <ExchangeIcon
              key={exchange.id}
              position={position}
              isUp={isUp}
              data-testid={`exchange-icon-${exchange.id}`}
            >
              <img
                src={exchange.icon}
                alt={`${exchange.name} icon`}
                loading="lazy"
              />
              <Tooltip>
                <Typography variant="body2" weight="semibold">
                  {exchange.name}
                </Typography>
                <Typography variant="numeric" style={{ marginTop: theme.spacing.xs }}>
                  {formatPrice(exchange.price)}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    marginTop: theme.spacing.xs,
                    color: isUp ? theme.colors.success.main : theme.colors.error.main
                  }}
                >
                  {isUp ? '▲' : '▼'} {formatPrice(priceDiff)} ({percentChange.toFixed(2)}%)
                </Typography>
                <Typography
                  variant="caption"
                  color={theme.colors.text.secondary}
                  style={{ marginTop: theme.spacing.xs }}
                >
                  Last updated: {new Date(exchange.timestamp).toLocaleTimeString()}
                </Typography>
              </Tooltip>
            </ExchangeIcon>
          );
        })}
      </Container>
    </Widget>
  );
};

export default PriceRange;