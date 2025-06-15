export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unknown';

export type ExchangeId = 
  | 'BINANCE'
  | 'BINANCE_FUTURES'
  | 'BINANCE_US'
  | 'BITFINEX'
  | 'BITGET'
  | 'BITMART'
  | 'BITMEX'
  | 'BITSTAMP'
  | 'BITUNIX'
  | 'BYBIT'
  | 'COINBASE'
  | 'CRYPTOCOM'
  | 'DERIBIT'
  | 'DYDX'
  | 'GATEIO'
  | 'HITBTC'
  | 'HUOBI'
  | 'KRAKEN'
  | 'KUCOIN'
  | 'MEXC'
  | 'OKEX'
  | 'PHEMEX'
  | 'POLONIEX'
  | 'UNISWAP'
  | 'GEMINI';

export interface OrderBookEntry {
  price: number;
  quantity: number;
  exchangeId: string;
  exchanges?: string[];  // List of exchanges contributing to this level
  exchangeQuantities?: Record<string, number>;
  totalQuantity?: number; // Total quantity across all exchanges
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface BaseWebSocketMessage {
  type?: string;
  data?: any;
}

export interface BinanceDepthResponse {
  E: number;           // Message output time
  T: number;          // Transaction time
  s: string;          // Symbol
  ps: string;         // Pair
  lastUpdateId: number;
  bids: [string, string][];  // [price, quantity]
  asks: [string, string][];  // [price, quantity]
}

export interface BinanceWebSocketMessage extends BaseWebSocketMessage {
  e?: string;    // Event type
  E?: number;    // Event time
  T?: number;    // Transaction time
  s?: string;    // Symbol
  ps?: string;   // Pair
  U?: number;    // First update ID in event
  u?: number;    // Final update ID in event
  pu?: number;   // Final update Id in last stream
  b?: [string, string][];  // Bids to be updated - [Price level to be updated, Quantity]
  a?: [string, string][];  // Asks to be updated - [Price level to be updated, Quantity]
}

export interface CoinbaseWebSocketMessage extends BaseWebSocketMessage {
  type: string;
  product_id?: string;
  product_ids?: string[];
  channels?: string[];
  bids?: [string, string][];
  asks?: [string, string][];
  changes?: [string, string, string][];
}

export type WebSocketMessage = BinanceWebSocketMessage | CoinbaseWebSocketMessage;

export interface ExchangeHookResult {
  orderBook: OrderBookData;
  error: string | null;
  connectionState: ConnectionState;
  reconnect?: () => void;
}


export interface WebSocketHookProps {
  symbol: string;
  onData: (data: OrderBookData) => void;
  onError: (error: string) => void;
}

export interface OrderBookProps {
  symbol?: string;
  className?: string;
  activeExchanges?: ExchangeId[];
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
  height?: number;
}

export interface LivePriceProps {
  symbol: string;
  exchange?: string;
}

export interface TradingViewChartData {
  time: number;
  value: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  onCrosshairMove?: (price: number, time: number) => void;
}

export interface ChartSeriesOptions {
  color?: string;
  lineWidth?: number;
  priceFormat?: {
    type: 'price' | 'volume' | 'percent';
    precision?: number;
    minMove?: number;
  };
}

export interface PriceData {
  price: number;
  timestamp: number;
  volume?: number;
  change?: number;
}

export interface OrderBookUpdate {
  type: 'bid' | 'ask';
  price: number;
  quantity: number;
  timestamp: number;
  exchange: string;
}