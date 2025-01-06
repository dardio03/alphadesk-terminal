import React, { useCallback, useEffect } from 'react';
import useWebSocket from './useWebSocket';
import { WebSocketHookProps, OrderBookData, WebSocketMessage, BinanceWebSocketMessage } from '../types/exchange';

// Create WebSocket URL for futures market
const getWebSocketUrl = (symbol: string) => 
  `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth@100ms`;

const fetchSnapshot = async (symbol: string) => {
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/depth?symbol=${symbol.toUpperCase()}&limit=100`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      bids: data.bids.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      })),
      asks: data.asks.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      }))
    };
  } catch (error) {
    console.error('Error fetching Binance snapshot:', error);
    throw error;
  }
};

export const useBinanceWebSocket = ({ symbol, onData, onError }: WebSocketHookProps) => {
  // Fetch initial snapshot
  React.useEffect(() => {
    fetchSnapshot(symbol)
      .then(onData)
      .catch(error => onError(`Failed to fetch initial snapshot: ${error.message}`));
  }, [symbol, onData, onError]);
  const handleMessage = useCallback((message: WebSocketMessage) => {
    try {
      const data = message as BinanceWebSocketMessage;

      // Extract bids and asks from the message
      const bids = data.b || [];  // b for bids in depth stream
      const asks = data.a || [];  // a for asks in depth stream
      
      // Only process if we have either bids or asks
      if (Array.isArray(bids) || Array.isArray(asks)) {
        const formattedData: OrderBookData = {
          bids: bids.map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          })),
          asks: asks.map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity)
          }))
        };
        onData(formattedData);
      } else {
        console.warn('Invalid Binance order book data:', {
          hasBids: Array.isArray(bids),
          hasAsks: Array.isArray(asks),
          data
        });
      }
    } catch (error) {
      console.error('Failed to parse Binance message:', message);
      onError(`Failed to parse Binance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onData, onError]);

  const { connectionState, reconnect } = useWebSocket({
    url: getWebSocketUrl(symbol),
    onMessage: handleMessage,
    onError,
    onConnected: () => {
      console.log('Binance WebSocket connected for symbol:', symbol);
    },
    onDisconnected: () => {
      console.log('Binance WebSocket disconnected for symbol:', symbol);
      onError('Binance WebSocket connection closed');
    }
  });

  return {
    connectionState,
    reconnect
  };
};

export default useBinanceWebSocket;