import React, { useState, useEffect, useCallback } from 'react';
import { LivePriceProps } from '../types/exchange';
import { formatPrice } from '../utils/formatPrice';
import useWebSocket from '../hooks/useWebSocket';

interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

const LivePrice: React.FC<LivePriceProps> = ({
  symbol,
  exchange = 'BINANCE'
}) => {
  const [priceData, setPriceData] = useState<PriceData>({
    price: 0,
    change24h: 0,
    volume24h: 0,
    high24h: 0,
    low24h: 0
  });

  const handleMessage = useCallback((data: any) => {
    if (exchange === 'BINANCE') {
      if (data.e === '24hrTicker') {
        setPriceData({
          price: parseFloat(data.c),
          change24h: parseFloat(data.P),
          volume24h: parseFloat(data.v),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l)
        });
      }
    } else if (exchange === 'COINBASE') {
      if (data.type === 'ticker') {
        setPriceData(prev => ({
          ...prev,
          price: parseFloat(data.price),
          volume24h: parseFloat(data.volume_24h)
        }));
      }
    }
  }, [exchange]);

  const handleError = useCallback((error: string) => {
    console.error(`LivePrice WebSocket error: ${error}`);
  }, []);

  const getWebSocketUrl = useCallback(() => {
    switch (exchange) {
      case 'BINANCE':
        return `wss://stream.binance.com/ws/${symbol.toLowerCase()}@ticker`;
      case 'COINBASE':
        return 'wss://ws-feed.pro.coinbase.com';
      default:
        return '';
    }
  }, [symbol, exchange]);

  const { connectionState, sendMessage } = useWebSocket({
    url: getWebSocketUrl(),
    onMessage: handleMessage,
    onError: handleError,
    onConnected: () => {
      if (exchange === 'COINBASE') {
        sendMessage({
          type: 'subscribe',
          product_ids: [symbol],
          channels: ['ticker']
        });
      }
    }
  });

  const getPriceChangeClass = () => {
    if (priceData.change24h > 0) return 'price-up';
    if (priceData.change24h < 0) return 'price-down';
    return '';
  };

  return (
    <div className="live-price">
      <div className="price-header">
        <span className="symbol">{symbol}</span>
        <span className="exchange">{exchange}</span>
        <span className={`connection-status ${connectionState}`}>
          {connectionState}
        </span>
      </div>
      
      <div className="price-main">
        <div className={`current-price ${getPriceChangeClass()}`}>
          {formatPrice(priceData.price)}
        </div>
        <div className={`price-change ${getPriceChangeClass()}`}>
          {priceData.change24h > 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
        </div>
      </div>
      
      <div className="price-stats">
        <div className="stat">
          <span className="label">24h Volume</span>
          <span className="value">{formatPrice(priceData.volume24h)}</span>
        </div>
        <div className="stat">
          <span className="label">24h High</span>
          <span className="value">{formatPrice(priceData.high24h)}</span>
        </div>
        <div className="stat">
          <span className="label">24h Low</span>
          <span className="value">{formatPrice(priceData.low24h)}</span>
        </div>
      </div>
    </div>
  );
};

export default LivePrice;