import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PriceRangeProps } from '../types/exchange';
import { formatPrice } from '../utils/formatPrice';

interface PricePoint {
  price: number;
  timestamp: number;
}

interface PriceRange {
  high: PricePoint;
  low: PricePoint;
  current: PricePoint;
  open: PricePoint;
}

const PriceRange: React.FC<PriceRangeProps> = ({
  symbol,
  interval = '1d',
  height = 100
}) => {
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchPriceRange = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price range');
      }

      const data = await response.json();
      const [
        openTime,
        open,
        high,
        low,
        close
      ] = data[0];

      setPriceRange({
        high: { price: parseFloat(high), timestamp: openTime },
        low: { price: parseFloat(low), timestamp: openTime },
        current: { price: parseFloat(close), timestamp: Date.now() },
        open: { price: parseFloat(open), timestamp: openTime }
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price range');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  const drawPriceRange = useCallback(() => {
    if (!canvasRef.current || !priceRange) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { high, low, current, open } = priceRange;
    const range = high.price - low.price;
    const padding = range * 0.1; // 10% padding
    const scaledHigh = high.price + padding;
    const scaledLow = low.price - padding;
    const scaledRange = scaledHigh - scaledLow;

    // Calculate positions
    const getY = (price: number) => {
      return canvas.height - ((price - scaledLow) / scaledRange * canvas.height);
    };

    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw price range line
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.moveTo(canvas.width / 2, getY(high.price));
    ctx.lineTo(canvas.width / 2, getY(low.price));
    ctx.stroke();

    // Draw current price marker
    const currentY = getY(current.price);
    ctx.beginPath();
    ctx.fillStyle = current.price >= open.price ? '#4caf50' : '#f44336';
    ctx.arc(canvas.width / 2, currentY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw price labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(high.price), canvas.width / 2 + 10, getY(high.price));
    ctx.fillText(formatPrice(low.price), canvas.width / 2 + 10, getY(low.price));
    ctx.fillText(formatPrice(current.price), canvas.width / 2 + 10, currentY);

  }, [priceRange]);

  useEffect(() => {
    fetchPriceRange();
    const interval = setInterval(fetchPriceRange, 5000);
    return () => clearInterval(interval);
  }, [fetchPriceRange]);

  useEffect(() => {
    drawPriceRange();
  }, [drawPriceRange]);

  if (loading) {
    return <div className="price-range-loading">Loading...</div>;
  }

  if (error) {
    return <div className="price-range-error">{error}</div>;
  }

  return (
    <div className="price-range">
      <canvas
        ref={canvasRef}
        width={50}
        height={height}
        style={{ width: '50px', height: `${height}px` }}
      />
      {priceRange && (
        <div className="price-range-stats">
          <div className="stat high">H: {formatPrice(priceRange.high.price)}</div>
          <div className="stat low">L: {formatPrice(priceRange.low.price)}</div>
          <div className={`stat current ${priceRange.current.price >= priceRange.open.price ? 'up' : 'down'}`}>
            C: {formatPrice(priceRange.current.price)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceRange;