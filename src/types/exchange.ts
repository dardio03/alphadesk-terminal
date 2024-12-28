export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unknown';

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface ExchangeHookResult {
  orderBook: OrderBookData;
  error: string | null;
  connectionState: ConnectionState;
}

export interface BinanceWebSocketMessage {
  e?: string;  // Event type
  E?: number;  // Event time
  s?: string;  // Symbol
  b?: [string, string][];  // Bids [price, quantity]
  a?: [string, string][];  // Asks [price, quantity]
  bids?: [string, string][];  // Bids for snapshot
  asks?: [string, string][];  // Asks for snapshot
}

export interface CoinbaseWebSocketMessage {
  type: string;
  product_id?: string;
  bids?: [string, string][];  // [price, size]
  asks?: [string, string][];  // [price, size]
  changes?: [string, string, string][];  // [side, price, size]
}

export interface WebSocketHookProps {
  symbol: string;
  onData: (data: OrderBookData) => void;
  onError: (error: string) => void;
}

export interface OrderBookProps {
  symbol?: string;
  className?: string;
}

export interface OrderBookSettingsProps {
  onSettingsChange: (settings: OrderBookSettings) => void;
  settings: OrderBookSettings;
}

export interface OrderBookSettings {
  grouping: number;
  precision: number;
  theme: 'light' | 'dark';
}

export interface PriceRangeProps {
  symbol: string;
  interval?: string;
  height?: number;
}

export interface LivePriceProps {
  symbol: string;
  exchange?: string;
}