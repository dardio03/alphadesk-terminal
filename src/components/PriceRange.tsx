import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { formatPrice } from '../utils/formatPrice';

interface ExchangeData {
  id: string;
  name: string;
  price: number;
  icon: string;
  timestamp: number;
}

interface PriceRangeProps {
  exchanges: ExchangeData[];
  symbol: string;
  interval?: string;
  width?: number;
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

const Container = styled.div<{ width?: number }>`
  position: relative;
  width: ${props => props.width ? `${props.width}px` : '100%'};
  height: 60px;
  margin: 20px 0;
  user-select: none;
`;

const Bar = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background: linear-gradient(
    90deg,
    rgba(33, 150, 243, 0.1),
    rgba(33, 150, 243, 0.3)
  );
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const PriceLabel = styled.div`
  position: absolute;
  font-size: 12px;
  color: #666;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: monospace;
  bottom: 0;
`;

const ExchangeIcon = styled.div<{ position: number; isUp: boolean }>`
  position: absolute;
  left: ${props => props.position}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid ${props => props.isUp ? '#4caf50' : '#f44336'};
  animation: ${slideIn} 0.3s ease-out;
  z-index: 2;

  &:hover {
    transform: translate(-50%, -50%) scale(1.15);
    z-index: 3;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

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
    border-top-color: #333;
  }
`;

const PriceRange: React.FC<PriceRangeProps> = ({
  exchanges,
  symbol,
  interval = '1d',
  width = 800
}) => {
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
              <div>{exchange.name}</div>
              <div>{formatPrice(exchange.price)}</div>
              <div style={{ 
                color: isUp ? '#4caf50' : '#f44336',
                fontSize: '10px'
              }}>
                {isUp ? '▲' : '▼'} {formatPrice(Math.abs(exchange.price - previousPrice))}
              </div>
            </Tooltip>
          </ExchangeIcon>
        );
      })}
    </Container>
  );
};

export default PriceRange;