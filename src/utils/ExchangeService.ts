import { EventEmitter } from 'events';
import BitfinexExchange from './exchanges/bitfinex';

export interface ExchangeConnection {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): void;
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'error';
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  onOrderBookUpdate(callback: (data: OrderBookData) => void): void;
  onTradeUpdate?(callback: (trade: TradeData) => void): void;
  onTickerUpdate?(callback: (ticker: TickerData) => void): void;
  onError(callback: (error: Error) => void): void;
  getOrderBookData(): OrderBookData | null;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  subscribeTrades?(symbol: string): void;
  subscribeTicker?(symbol: string): void;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  exchanges?: string[];
  exchangeQuantities?: Record<string, number>;
  totalQuantity?: number;
}

export interface TradeData {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface TickerData {
  price: number;
  volume?: number;
  volumeDelta?: number;
  timestamp: number;
}

import { connectionManager } from './ConnectionManager';
import { ErrorHandler, ErrorContext, ErrorCategory } from './ErrorHandler';

export class ExchangeFactory {
  private static exchanges: { [key: string]: ExchangeConnection } = {};

  static registerExchange(name: string, exchange: ExchangeConnection) {
    this.exchanges[name] = exchange;
    connectionManager.addConnection(name, exchange);
  }

  static getExchange(name: string): ExchangeConnection {
    const exchange = this.exchanges[name];
    if (!exchange) {
      // Create and register the exchange if it doesn't exist
      const newExchange = this.createExchange(name, {});
      this.registerExchange(name, newExchange);
      return newExchange;
    }
    return exchange;
  }

  static getAllExchanges(): { [key: string]: ExchangeConnection } {
    return this.exchanges;
  }

  static createExchange(name: string, config: any): ExchangeConnection {
    const exchangeName = name.toUpperCase();
    let exchange: ExchangeConnection;

    switch (exchangeName) {
      case 'BINANCE':
        exchange = new BinanceExchange(config);
        break;
      case 'BYBIT':
        exchange = new BybitExchange(config);
        break;
      case 'AGGR':
        exchange = new AggrExchange();
        break;
      case 'BINANCE_FUTURES':
        exchange = new BinanceFuturesExchange();
        break;
      case 'BINANCE_US':
        exchange = new BinanceUsExchange();
        break;
      case 'COINBASE':
        exchange = new CoinbaseExchange(config);
        break;
      case 'BITFINEX':
        exchange = new BitfinexExchange();
        break;
      case 'BITGET':
        exchange = new BitgetExchangeStub();
        break;
      case 'BITMART':
        exchange = new BitmartExchangeStub();
        break;
      case 'BITMEX':
        exchange = new BitmexExchangeStub();
        break;
      case 'BITSTAMP':
        exchange = new BitstampExchangeStub();
        break;
      case 'BITUNIX':
        exchange = new BitunixExchangeStub();
        break;
      case 'KRAKEN':
        exchange = new KrakenExchange(config);
        break;
      case 'CRYPTOCOM':
        exchange = new CryptocomExchangeStub();
        break;
      case 'DERIBIT':
        exchange = new DeribitExchangeStub(config);
        break;
      case 'DYDX':
        exchange = new DydxExchangeStub();
        break;
      case 'GATEIO':
        exchange = new GateioExchangeStub();
        break;
      case 'HUOBI':
        exchange = new HuobiExchangeStub(config);
        break;
      case 'PHEMEX':
        exchange = new PhemexExchange(config);
        break;
      case 'KUCOIN':
        exchange = new KucoinExchangeStub();
        break;
      case 'MEXC':
        exchange = new MexcExchangeStub();
        break;
      case 'OKEX':
        exchange = new OkexExchangeStub();
        break;
      case 'POLONIEX':
        exchange = new PoloniexExchange(config);
        break;
      case 'HITBTC':
        exchange = new HitbtcExchange(config);
        break;
      default:
        throw new Error(`Unsupported exchange: ${name}`);
    }

    // Initialize the exchange
    exchange.connect().catch(error => {
      console.error(`Failed to initialize ${name} exchange:`, error);
    });

    return exchange;
  }
}

export abstract class BaseExchange extends EventEmitter implements ExchangeConnection {
  protected symbol: string = '';
  protected orderBookCallbacks: ((data: OrderBookData) => void)[] = [];
  protected tradeCallbacks: ((trade: TradeData) => void)[] = [];
  protected tickerCallbacks: ((ticker: TickerData) => void)[] = [];
  protected errorCallbacks: ((error: Error) => void)[] = [];
  protected connectCallbacks: (() => void)[] = [];
  protected disconnectCallbacks: (() => void)[] = [];
  protected status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
  protected latestOrderBook: OrderBookData | null = null;
  protected errorHandler: ErrorHandler;
  protected reconnectTimeout: NodeJS.Timeout | null = null;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected reconnectDelay = 1000;
  protected lastConnectionAttempt = 0;
  protected minConnectionInterval = 2000;

  constructor() {
    super();
    this.errorHandler = ErrorHandler.getInstance();
    this.errorHandler.onError(this.handleError.bind(this));
    this.errorHandler.onReconnect(this.handleReconnect.bind(this));
  }

  getOrderBookData(): OrderBookData | null {
    return this.latestOrderBook;
  }

  onOrderBookUpdate(callback: (data: OrderBookData) => void): void {
    this.orderBookCallbacks.push(callback);
  }

  onTradeUpdate(callback: (trade: TradeData) => void): void {
    this.tradeCallbacks.push(callback);
  }

  onTickerUpdate(callback: (ticker: TickerData) => void): void {
    this.tickerCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  subscribeTrades(_symbol: string): void {
    // Optional override
  }

  subscribeTicker(_symbol: string): void {
    // Optional override
  }

  protected notifyOrderBookUpdate(data: OrderBookData): void {
    this.latestOrderBook = data;
    this.orderBookCallbacks.forEach(cb => cb(data));
  }

  protected notifyTradeUpdate(trade: TradeData): void {
    this.tradeCallbacks.forEach(cb => cb(trade));
  }

  protected notifyTickerUpdate(ticker: TickerData): void {
    this.tickerCallbacks.forEach(cb => cb(ticker));
  }

  protected notifyConnect(): void {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    this.connectCallbacks.forEach(cb => cb());
  }

  protected notifyDisconnect(): void {
    this.status = 'disconnected';
    this.disconnectCallbacks.forEach(cb => cb());
  }

  protected notifyError(error: Error | string, category: ErrorCategory = 'unknown') {
    const errorMessage = error instanceof Error ? error.message : error;
    const context: ErrorContext = {
      exchangeId: this.constructor.name,
      symbol: this.symbol,
      originalError: error,
      category,
      timestamp: Date.now()
    };

    // Check for IP block errors
    if (errorMessage.includes('IP') || 
        errorMessage.includes('blocked') || 
        errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429') ||
        errorMessage.includes('403')) {
      console.error(`[${this.constructor.name}] IP Block detected:`, errorMessage);
      this.status = 'error';
      this.emit('ipBlock', { exchange: this.constructor.name, error: errorMessage });
    }

    // First handle the error through the error handler
    this.errorHandler.handleError(context);

    // Then notify all error callbacks with a properly formatted error
    const errorToEmit = error instanceof Error ? error : new Error(error);
    this.errorCallbacks.forEach(cb => {
      try {
        cb(errorToEmit);
      } catch (callbackError) {
        console.error(`Error in error callback for ${this.constructor.name}:`, callbackError);
      }
    });

    this.status = 'error';
  }

  protected handleError(context: ErrorContext) {
    // Additional exchange-specific error handling can be added here
    console.error(`[${context.exchangeId}] Error occurred:`, context);
  }

  protected handleReconnect(exchangeId: string) {
    if (exchangeId === this.constructor.name) {
      this.reconnect();
    }
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract subscribe(symbol: string): void;
  abstract unsubscribe(symbol: string): void;

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyError('Max reconnection attempts reached', 'network');
      return;
    }

    this.disconnect();
    this.reconnectAttempts++;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  getStatus() {
    return this.status;
  }
}

class BasicWsExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;
  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    if (this.ws) {
      return;
    }

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.minConnectionInterval) {
      return;
    }
    this.lastConnectionAttempt = now;

    this.status = 'connecting';
    try {
      this.ws = new WebSocket(this.baseUrl);
      this.ws.onopen = () => {
        this.notifyConnect();
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 30000);
      };

      this.ws.onclose = () => {
        this.notifyDisconnect();
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        this.ws = null;
        this.reconnect();
      };

      this.ws.onerror = (event) => {
        this.notifyError(new Error('WebSocket error'));
      };

      this.ws.onmessage = (event) => {
        this.processMessage(event.data);
      };
    } catch (error) {
      this.notifyError(error as Error);
      this.reconnect();
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Exchange specific subscription should be implemented here
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    try {
      const msg = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'public/subscribe',
        params: { channels: [`trades.${normalizedSymbol}.100ms`] },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    try {
      const msg = {
        method: 'subscribeTrades',
        params: { symbol: normalizedSymbol },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const msg = { id: Date.now(), type: 'subscribe', channel: 'trades', symbols: [symbol] };
        this.ws.send(JSON.stringify(msg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(
        JSON.stringify({ id: Date.now(), method: 'trade.subscribe', params: [symbol] })
      );
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const krakenSymbol = this.convertSymbol(symbol);
    try {
      const msg = {
        event: 'subscribe',
        pair: [krakenSymbol],
        subscription: { name: 'trade' },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Exchange specific unsubscription should be implemented here
    }
  }

  protected processMessage(_data: any) {
    // Parsing for order book updates should be implemented per exchange
  }
}

// Example implementation for Binance
class BinanceExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.minConnectionInterval) {
      return;
    }

    this.lastConnectionAttempt = now;
    this.status = 'connecting';

    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');
      
      this.ws.onopen = () => {
        console.log(`[${this.constructor.name}] WebSocket connected`);
        this.notifyConnect();
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 30000);
      };

      this.ws.onclose = () => {
        console.log(`[${this.constructor.name}] WebSocket closed`);
        this.notifyDisconnect();
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        this.ws = null;
        this.reconnect();
      };

      this.ws.onerror = (event) => {
        console.error(`[${this.constructor.name}] WebSocket error:`, event);
        this.notifyError(new Error('WebSocket error'), 'connection');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === 'error') {
            this.notifyError(new Error(data.m || 'API error'), 'api');
            return;
          }
          this.processMessage(data);
        } catch (error) {
          this.notifyError(error as Error, 'data');
        }
      };
    } catch (error) {
      this.notifyError(error as Error, 'network');
      this.reconnect();
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const subscribeMsg = {
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth@100ms`],
          id: Date.now()
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const unsubscribeMsg = {
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth@100ms`],
          id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  subscribeTrades(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@trade`],
          id: Date.now()
        })
      );
    }
  }

  private processMessage(data: any) {
    if (data && data.e === 'trade') {
      const trade: TradeData = {
        price: parseFloat(data.p),
        size: parseFloat(data.q),
        side: data.m ? 'sell' : 'buy',
        timestamp: data.T,
      };
      this.notifyTradeUpdate(trade);
      return;
    }

    if (!data || !data.bids || !data.asks) {
      return;
    }

    try {
      const bids = data.bids.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['BINANCE'],
          exchangeQuantities: { 'BINANCE': quantityNum },
          totalQuantity: quantityNum
        };
      });

      const asks = data.asks.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['BINANCE'],
          exchangeQuantities: { 'BINANCE': quantityNum },
          totalQuantity: quantityNum
        };
      });

      // Sort bids in descending order and asks in ascending order
      bids.sort((a, b) => b.price - a.price);
      asks.sort((a, b) => a.price - b.price);

      this.latestOrderBook = {
        bids,
        asks,
        timestamp: Date.now()
      };

      this.orderBookCallbacks.forEach(cb => cb(this.latestOrderBook!));
    } catch (error) {
      this.notifyError(error as Error, 'data');
    }
  }
}

class BybitExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://stream.bybit.com/v5/public/spot';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.ws) {
      return;
    }

    // Add delay between connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }
    this.lastConnectionAttempt = Date.now();

    this.status = 'connecting';
    this.ws = new WebSocket(this.baseUrl);

    this.ws.onopen = () => {
      console.log(`[${this.constructor.name}] WebSocket connected`);
      this.reconnectAttempts = 0;
      this.notifyConnect();
      if (this.symbol) {
        this.subscribe(this.symbol);
      }
      // Start ping interval
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ op: 'ping' }));
        }
      }, 30000);
    };

    this.ws.onclose = () => {
      console.log(`[${this.constructor.name}] WebSocket closed`);
      this.notifyDisconnect();
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      this.ws = null;

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = (event) => {
      console.error(`[${this.constructor.name}] WebSocket error:`, event);
      this.notifyError(new Error('WebSocket error'), 'connection');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success === false) {
          this.notifyError(new Error(data.ret_msg || 'API error'), 'api');
          return;
        }
        this.processMessage(data);
      } catch (error) {
        this.notifyError(error as Error, 'parsing');
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        op: 'subscribe',
        args: [`orderbook.50.${symbol}`]
      }));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  unsubscribe(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        op: 'unsubscribe',
        args: [`orderbook.50.${symbol}`]
      }));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ op: 'subscribe', args: [`publicTrade.${symbol}`] }));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  private processMessage(data: any) {
    if (data && data.topic && data.topic.startsWith('publicTrade')) {
      try {
        const trades = data.data.map((t: any) => ({
          price: parseFloat(t.p),
          size: parseFloat(t.v),
          side: t.S === 'Buy' ? 'buy' : 'sell',
          timestamp: +t.T,
        }));
        trades.forEach(trade => this.notifyTradeUpdate(trade));
      } catch (error) {
        this.notifyError(error as Error, 'parsing');
      }
      return;
    }

    if (!data || !data.topic || !data.topic.startsWith('orderbook')) {
      return;
    }

    try {
      const bids = data.data.b.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        exchanges: [this.constructor.name],
        exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
        totalQuantity: parseFloat(quantity)
      })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);

      const asks = data.data.a.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        exchanges: [this.constructor.name],
        exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
        totalQuantity: parseFloat(quantity)
      })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);

      // Sort bids in descending order and asks in ascending order
      bids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
      asks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);

      // Limit to top 100 entries
      const limitedBids = bids.slice(0, 100);
      const limitedAsks = asks.slice(0, 100);

      this.notifyOrderBookUpdate({
        bids: limitedBids,
        asks: limitedAsks,
        timestamp: data.ts
      });
    } catch (error) {
      this.notifyError(error as Error, 'parsing');
    }
  }
}

class CoinbaseExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://ws-feed.exchange.coinbase.com';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20000;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 5;
  protected readonly reconnectDelay = 2000;
  private isConnecting = false;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.isConnecting) {
      return;
    }

    try {
      this.isConnecting = true;
    this.status = 'connecting';
    this.ws = new WebSocket(this.baseUrl);

    this.ws.onopen = () => {
        console.log('[COINBASE] WebSocket connected');
        this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.notifyConnect();
        this.setupPingInterval();
        
        // Only subscribe if we have a symbol
      if (this.symbol) {
        this.subscribe(this.symbol);
      }
    };

    this.ws.onclose = () => {
        console.log('[COINBASE] WebSocket closed');
        this.isConnecting = false;
        this.cleanup();
      this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[COINBASE] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyError('WebSocket error', 'network');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.processMessage(data);
      } catch (error) {
          console.error('[COINBASE] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[COINBASE] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[COINBASE] Ping timeout, reconnecting...');
          this.reconnect();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
          this.lastPingTime = now;
        } catch (error) {
          console.error('[COINBASE] Error sending ping:', error);
          this.reconnect();
        }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
    this.isConnecting = false;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[COINBASE] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      // Reset reconnect attempts after a longer delay
      setTimeout(() => {
    this.reconnectAttempts = 0;
        this.connect().catch(error => {
          console.error('[COINBASE] Reconnect failed:', error);
          this.notifyError('Reconnect failed', 'network');
        });
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[COINBASE] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[COINBASE] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('[COINBASE] Cannot subscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[COINBASE] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    const normalizedSymbol = symbol.replace('USDT', 'USD');

    try {
      const subscribeMsg = {
        type: 'subscribe',
        product_ids: [normalizedSymbol],
        channels: ['level2']
      };
      this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`[COINBASE] Subscribed to ${normalizedSymbol}`);
    } catch (error) {
      console.error('[COINBASE] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    try {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'matches',
          product_ids: [normalizedSymbol],
        })
      );
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      console.error('[COINBASE] Cannot unsubscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const normalizedSymbol = symbol.replace('USDT', 'USD');

    try {
      const unsubscribeMsg = {
        type: 'unsubscribe',
        product_ids: [normalizedSymbol],
        channels: ['level2']
      };
      this.ws.send(JSON.stringify(unsubscribeMsg));
      console.log(`[COINBASE] Unsubscribed from ${normalizedSymbol}`);
    } catch (error) {
      console.error('[COINBASE] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.type === 'pong') {
      this.lastPingTime = Date.now();
      return;
    }

    // Handle error messages
    if (data.type === 'error') {
      console.error('[COINBASE] API error:', data);
      this.notifyError(data.message || 'API error', 'api');
      return;
    }

    // Handle trade messages
    if (data.type === 'match') {
      const trade: TradeData = {
        price: parseFloat(data.price),
        size: parseFloat(data.size),
        side: data.side === 'sell' ? 'sell' : 'buy',
        timestamp: +new Date(data.time),
      };
      this.notifyTradeUpdate(trade);
      return;
    }

    // Handle trade updates
    if (data.feed === 'trade' && data.price && data.qty) {
      const trade: TradeData = {
        price: parseFloat(data.price),
        size: parseFloat(data.qty),
        side: data.side === 'sell' ? 'sell' : 'buy',
        timestamp: data.time,
      };
      this.notifyTradeUpdate(trade);
      return;
    } else if (Array.isArray(data) && Array.isArray(data[1])) {
      const pair = data[3];
      data[1].forEach((t: any[]) => {
        const trade: TradeData = {
          price: parseFloat(t[0]),
          size: parseFloat(t[1]),
          side: t[3] === 'b' ? 'buy' : 'sell',
          timestamp: t[2] * 1000,
        };
        this.notifyTradeUpdate(trade);
      });
      return;
    }

    // Handle trade updates
    if (Array.isArray(data.trades)) {
      try {
        data.trades.forEach((t: any) => {
          const trade: TradeData = {
            price: parseFloat(t[2]),
            size: parseFloat(t[3]),
            side: t[1] === 'Buy' ? 'buy' : 'sell',
            timestamp: t[0] / 1000000,
          };
          this.notifyTradeUpdate(trade);
        });
      } catch (error) {
        this.notifyError(error as Error, 'parsing');
      }
      return;
    }

    // Handle trade updates
    if (data.method === 'updateTrades' && data.params?.data) {
      data.params.data.forEach((t: any) => {
        const trade: TradeData = {
          price: parseFloat(t.price),
          size: parseFloat(t.quantity),
          side: t.side,
          timestamp: +new Date(t.timestamp),
        };
        this.notifyTradeUpdate(trade);
      });
      return;
    }

    // Handle trade updates
    if (data.method === 'subscription' && data.params?.channel?.startsWith('trades.')) {
      const trades = data.params.data || [];
      trades.forEach((t: any) => {
        const trade: TradeData = {
          price: parseFloat(t.price),
          size: parseFloat(t.amount),
          side: t.direction,
          timestamp: +t.timestamp,
        };
        this.notifyTradeUpdate(trade);
      });
      return;
    }

    // Handle orderbook updates
    if (data.type === 'snapshot' || data.type === 'l2update') {
      const { product_id, bids, asks } = data;
      
      if (!product_id || (!bids && !asks)) return;

      const orderBook: OrderBookData = {
        bids: (bids || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['COINBASE'],
          exchangeQuantities: { 'COINBASE': parseFloat(quantity) }
        })),
        asks: (asks || []).map(([price, quantity]: [string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
          exchanges: ['COINBASE'],
          exchangeQuantities: { 'COINBASE': parseFloat(quantity) }
        })),
        timestamp: Date.now()
      };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class KrakenExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://ws.kraken.com';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20000;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 10;
  protected readonly reconnectDelay = 2000;
  private isConnecting = false;
  protected lastConnectionAttempt = 0;
  protected readonly minConnectionInterval = 5000;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  private convertSymbol(symbol: string): string {
    // Convert BTCUSDT to XBT/USD for Kraken
    return symbol
      .replace('BTC', 'XBT')
      .replace('USDT', 'USD')
      .replace(/([A-Z]+)([A-Z]+)/, '$1/$2');
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.isConnecting) {
      return;
    }

    // Add delay between connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }
    this.lastConnectionAttempt = Date.now();

    try {
      this.isConnecting = true;
      this.status = 'connecting';
      this.ws = new WebSocket(this.baseUrl);

      this.ws.onopen = () => {
        console.log('[KRAKEN] WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnect();
        this.setupPingInterval();
        
        // Only subscribe if we have a symbol
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };

      this.ws.onclose = () => {
        console.log('[KRAKEN] WebSocket closed');
        this.isConnecting = false;
        this.cleanup();
        this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[KRAKEN] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyError('WebSocket error', 'network');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data);
        } catch (error) {
          console.error('[KRAKEN] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[KRAKEN] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[KRAKEN] Ping timeout, reconnecting...');
      this.reconnect();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ event: 'ping' }));
          this.lastPingTime = now;
        } catch (error) {
          console.error('[KRAKEN] Error sending ping:', error);
          this.reconnect();
        }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
    this.isConnecting = false;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[KRAKEN] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      // Reset reconnect attempts after a longer delay
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect().catch(error => {
          console.error('[KRAKEN] Reconnect failed:', error);
          this.notifyError('Reconnect failed', 'network');
        });
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[KRAKEN] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[KRAKEN] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('[KRAKEN] Cannot subscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[KRAKEN] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    const krakenSymbol = this.convertSymbol(symbol);
    
      try {
        const subscribeMsg = {
          event: 'subscribe',
        pair: [krakenSymbol],
        subscription: {
          name: 'book',
          depth: 100
        }
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`[KRAKEN] Subscribed to ${krakenSymbol}`);
      } catch (error) {
      console.error('[KRAKEN] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      console.error('[KRAKEN] Cannot unsubscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const krakenSymbol = this.convertSymbol(symbol);
    
      try {
        const unsubscribeMsg = {
          event: 'unsubscribe',
        pair: [krakenSymbol],
        subscription: {
          name: 'book'
        }
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      console.log(`[KRAKEN] Unsubscribed from ${krakenSymbol}`);
      } catch (error) {
      console.error('[KRAKEN] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.event === 'pong') {
      this.lastPingTime = Date.now();
      return;
    }

    // Handle error messages
    if (data.event === 'error') {
      console.error('[KRAKEN] API error:', data);
      this.notifyError(data.errorMessage || 'API error', 'api');
      return;
    }

    // Handle subscription confirmation
    if (data.event === 'subscriptionStatus') {
      if (data.status === 'error') {
        console.error('[KRAKEN] Subscription error:', data);
        this.notifyError(data.errorMessage || 'Subscription error', 'subscription');
      }
        return;
      }

    // Handle orderbook updates
    if (Array.isArray(data) && data.length >= 2) {
      const [channelId, bookData] = data;
      
      if (!bookData || !bookData.bids || !bookData.asks) return;

      const orderBook: OrderBookData = {
        bids: bookData.bids.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['KRAKEN'],
          exchangeQuantities: { 'KRAKEN': parseFloat(quantity) }
        })),
        asks: bookData.asks.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['KRAKEN'],
          exchangeQuantities: { 'KRAKEN': parseFloat(quantity) }
        })),
        timestamp: Date.now()
      };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class PhemexExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://ws.phemex.com/ws';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20000;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 10;
  protected readonly reconnectDelay = 2000;
  private isConnecting = false;
  protected lastConnectionAttempt = 0;
  protected readonly minConnectionInterval = 5000;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.isConnecting) {
      return;
    }

    // Add delay between connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }
    this.lastConnectionAttempt = Date.now();

    try {
      this.isConnecting = true;
    this.status = 'connecting';

      // Create WebSocket with error handling
    try {
      this.ws = new WebSocket(this.baseUrl);
      } catch (error) {
        console.error('[PHEMEX] Failed to create WebSocket:', error);
        this.isConnecting = false;
        this.notifyError('Failed to create WebSocket', 'network');
        throw error;
      }

      this.ws.onopen = () => {
        console.log('[PHEMEX] WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnect();
        this.setupPingInterval();
        
        // Only subscribe if we have a symbol
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[PHEMEX] WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.cleanup();
        this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[PHEMEX] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyError('WebSocket error', 'network');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data);
        } catch (error) {
          console.error('[PHEMEX] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[PHEMEX] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[PHEMEX] Ping timeout, reconnecting...');
          this.reconnect();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ method: 'server.ping', params: [], id: Date.now() }));
          this.lastPingTime = now;
    } catch (error) {
          console.error('[PHEMEX] Error sending ping:', error);
          this.reconnect();
    }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
    this.isConnecting = false;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      try {
      this.ws.close();
      } catch (error) {
        console.error('[PHEMEX] Error closing WebSocket:', error);
      }
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PHEMEX] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      // Reset reconnect attempts after a longer delay
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect().catch(error => {
          console.error('[PHEMEX] Reconnect failed:', error);
          this.notifyError('Reconnect failed', 'network');
        });
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.cleanup();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('[PHEMEX] Error closing WebSocket during reconnect:', error);
      }
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[PHEMEX] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[PHEMEX] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('[PHEMEX] Cannot subscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[PHEMEX] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    
      try {
        const subscribeMsg = {
          method: 'orderbook.subscribe',
        params: [symbol],
        id: Date.now()
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`[PHEMEX] Subscribed to ${symbol}`);
      } catch (error) {
      console.error('[PHEMEX] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      console.error('[PHEMEX] Cannot unsubscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
      try {
        const unsubscribeMsg = {
          method: 'orderbook.unsubscribe',
        params: [symbol],
        id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      console.log(`[PHEMEX] Unsubscribed from ${symbol}`);
      } catch (error) {
      console.error('[PHEMEX] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.method === 'server.pong') {
      this.lastPingTime = Date.now();
      return;
    }

    // Handle error messages
    if (data.error) {
      console.error('[PHEMEX] API error:', data.error);
      this.notifyError(data.error.message || 'API error', 'api');
      return;
    }

    // Handle orderbook updates
    if (data.type === 'incremental' || data.type === 'snapshot') {
      const { symbol, book } = data;
      
      if (!symbol || !book) return;

      const orderBook: OrderBookData = {
        bids: (book.bids || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['PHEMEX'],
          exchangeQuantities: { 'PHEMEX': parseFloat(quantity) }
        })),
        asks: (book.asks || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['PHEMEX'],
          exchangeQuantities: { 'PHEMEX': parseFloat(quantity) }
        })),
          timestamp: Date.now()
        };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class PoloniexExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://ws.poloniex.com/ws/public';
  private pingInterval: NodeJS.Timeout | null = null;
  private config: any;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    this.status = 'connecting';
    try {
      this.ws = new WebSocket(this.baseUrl);
      this.ws.onopen = () => {
        this.status = 'connected';
        this.errorHandler.resetBackoff(this.constructor.name);
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ id: Date.now(), type: 'ping' }));
          }
        }, 30000);
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            return;
          }
          this.processMessage(data);
        } catch (error) {
          this.notifyError(error as Error, 'data');
        }
      };
      this.ws.onerror = (event) => {
        this.notifyError('WebSocket error', 'network');
      };
      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
      };
    } catch (error) {
      this.notifyError(error as Error, 'network');
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const subscribeMsg = {
          id: Date.now(),
          type: 'subscribe',
          channel: 'book',
          symbol: symbol
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const unsubscribeMsg = {
          id: Date.now(),
          type: 'unsubscribe',
          channel: 'book',
          symbol: symbol
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  private processMessage(data: any): void {
    if (data.channel === 'book' && data.data) {
      try {
        const bids = data.data.bids.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['POLONIEX'],
            exchangeQuantities: { 'POLONIEX': parseFloat(quantity) },
            totalQuantity: quantityNum
          };
        });

        const asks = data.data.asks.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['POLONIEX'],
            exchangeQuantities: { 'POLONIEX': parseFloat(quantity) },
            totalQuantity: quantityNum
          };
        });

        // Sort bids in descending order and asks in ascending order
        bids.sort((a, b) => b.price - a.price);
        asks.sort((a, b) => a.price - b.price);

        this.latestOrderBook = {
          bids,
          asks,
          timestamp: Date.now()
        };

        this.orderBookCallbacks.forEach(cb => cb(this.latestOrderBook!));
      } catch (error) {
        this.notifyError(error as Error, 'data');
      }
    }
    if (data.channel === 'trades' && Array.isArray(data.data)) {
      data.data.forEach((t: any) => {
        const trade: TradeData = {
          price: parseFloat(t.price),
          size: parseFloat(t.amount) / parseFloat(t.price),
          side: t.takerSide,
          timestamp: t.createTime,
        };
        this.notifyTradeUpdate(trade);
      });
    }
  }
}

class HitbtcExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://api.hitbtc.com/api/3/ws/public';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20020;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 5;
  protected readonly reconnectDelay = 2000;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    try {
    this.status = 'connecting';
      this.ws = new WebSocket(this.baseUrl);
      
      this.ws.onopen = () => {
        console.log('[HITBTC] WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnect();
        this.setupPingInterval();
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };

      this.ws.onclose = () => {
        console.log('[HITBTC] WebSocket closed');
        this.cleanup();
        this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[HITBTC] WebSocket error:', error);
        this.notifyError('WebSocket error', 'network');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data);
        } catch (error) {
          console.error('[HITBTC] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      console.error('[HITBTC] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[HITBTC] Ping timeout, reconnecting...');
      this.reconnect();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ method: 'ping' }));
          this.lastPingTime = now;
        } catch (error) {
          console.error('[HITBTC] Error sending ping:', error);
          this.reconnect();
        }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HITBTC] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      return;
    }

    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[HITBTC] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[HITBTC] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[HITBTC] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    
      try {
        const subscribeMsg = {
          method: 'subscribe',
          params: {
          channel: 'orderbook',
          symbol: normalizedSymbol
          },
          id: Date.now()
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      } catch (error) {
      console.error('[HITBTC] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  unsubscribe(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const normalizedSymbol = symbol.replace('USDT', 'USD');
    
      try {
        const unsubscribeMsg = {
          method: 'unsubscribe',
          params: {
          channel: 'orderbook',
          symbol: normalizedSymbol
          },
          id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
      console.error('[HITBTC] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.method === 'pong') {
      this.lastPingTime = Date.now();
        return;
      }

    // Handle orderbook updates
    if (data.method === 'snapshot' || data.method === 'update') {
      const { params } = data;
      if (!params || !params.data) return;

      const { bid, ask } = params.data;
      if (!bid && !ask) return;

      const orderBook: OrderBookData = {
        bids: (bid || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['HITBTC'],
          exchangeQuantities: { 'HITBTC': parseFloat(quantity) }
        })),
        asks: (ask || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['HITBTC'],
          exchangeQuantities: { 'HITBTC': parseFloat(quantity) }
        })),
        timestamp: Date.now()
      };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class AggrExchange extends BasicWsExchange {
  constructor() {
    super('wss://sentiment.aggr.trade');
  }
}

class BinanceFuturesExchange extends BasicWsExchange {
  constructor() {
    super('wss://fstream.binance.com/ws');
  }
}

class BinanceUsExchange extends BasicWsExchange {
  constructor() {
    super('wss://stream.binance.us:9443/ws');
  }
}

}

class BitgetExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.bitget.com/spot/v1/stream');
  }
}

class BitmartExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://openapi-ws-v2.bitmart.com/api?protocol=1.1');
  }
}

class BitmexExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://www.bitmex.com/realtime');
  }
}

class BitstampExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.bitstamp.net/');
  }
}

class BitunixExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://fapi.bitunix.com/public/');
  }
}

class CryptocomExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://stream.crypto.com/v2/market');
  }
}

class DeribitExchangeStub extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://www.deribit.com/ws/api/v2';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20000;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 10;
  protected readonly reconnectDelay = 2000;
  private isConnecting = false;
  protected lastConnectionAttempt = 0;
  protected readonly minConnectionInterval = 5000;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.isConnecting) {
      return;
    }

    // Add delay between connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }
    this.lastConnectionAttempt = Date.now();

    try {
      this.isConnecting = true;
      this.status = 'connecting';
      this.ws = new WebSocket(this.baseUrl);

      this.ws.onopen = () => {
        console.log('[DERIBIT] WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnect();
        this.setupPingInterval();
        
        // Only subscribe if we have a symbol
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };

      this.ws.onclose = () => {
        console.log('[DERIBIT] WebSocket closed');
        this.isConnecting = false;
        this.cleanup();
        this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[DERIBIT] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyError('WebSocket error', 'network');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data);
        } catch (error) {
          console.error('[DERIBIT] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[DERIBIT] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[DERIBIT] Ping timeout, reconnecting...');
          this.reconnect();
          return;
        }

        try {
          const pingMsg = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'public/test',
            params: {}
          };
          this.ws.send(JSON.stringify(pingMsg));
          this.lastPingTime = now;
        } catch (error) {
          console.error('[DERIBIT] Error sending ping:', error);
          this.reconnect();
        }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
    this.isConnecting = false;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DERIBIT] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      // Reset reconnect attempts after a longer delay
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect().catch(error => {
          console.error('[DERIBIT] Reconnect failed:', error);
          this.notifyError('Reconnect failed', 'network');
        });
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[DERIBIT] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[DERIBIT] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('[DERIBIT] Cannot subscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[DERIBIT] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    
    try {
      const subscribeMsg = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'public/subscribe',
        params: {
          channels: [`book.${normalizedSymbol}.100ms`]
        }
      };
      this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`[DERIBIT] Subscribed to ${normalizedSymbol}`);
    } catch (error) {
      console.error('[DERIBIT] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      console.error('[DERIBIT] Cannot unsubscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const normalizedSymbol = symbol.replace('USDT', 'USD');
    
    try {
      const unsubscribeMsg = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'public/unsubscribe',
        params: {
          channels: [`book.${normalizedSymbol}.100ms`]
        }
      };
      this.ws.send(JSON.stringify(unsubscribeMsg));
      console.log(`[DERIBIT] Unsubscribed from ${normalizedSymbol}`);
    } catch (error) {
      console.error('[DERIBIT] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.method === 'public/test') {
      this.lastPingTime = Date.now();
      return;
    }

    // Handle error messages
    if (data.error) {
      console.error('[DERIBIT] API error:', data.error);
      this.notifyError(data.error.message || 'API error', 'api');
      return;
    }

    // Handle orderbook updates
    if (data.method === 'subscription' && data.params?.channel?.startsWith('book.')) {
      const { data: bookData } = data.params;
      
      if (!bookData) return;

      const orderBook: OrderBookData = {
        bids: (bookData.bids || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['DERIBIT'],
          exchangeQuantities: { 'DERIBIT': parseFloat(quantity) }
        })),
        asks: (bookData.asks || []).map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: ['DERIBIT'],
          exchangeQuantities: { 'DERIBIT': parseFloat(quantity) }
        })),
        timestamp: Date.now()
      };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class DydxExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://api.dydx.exchange/v3/ws');
  }
}

class GateioExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.gate.io/v3/');
  }
}

class HuobiExchangeStub extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://api.huobi.pro/ws';
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private readonly pingIntervalMs = 20000;
  private readonly pingTimeoutMs = 10000;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 10;
  protected readonly reconnectDelay = 2000;
  private isConnecting = false;
  protected lastConnectionAttempt = 0;
  protected readonly minConnectionInterval = 5000;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  private convertSymbol(symbol: string): string {
    // Convert BTCUSDT to btcusdt for Huobi
    return symbol.toLowerCase();
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.isConnecting) {
      return;
    }

    // Add delay between connection attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    if (timeSinceLastAttempt < this.minConnectionInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minConnectionInterval - timeSinceLastAttempt));
    }
    this.lastConnectionAttempt = Date.now();

    try {
      this.isConnecting = true;
      this.status = 'connecting';
      this.ws = new WebSocket(this.baseUrl);

      this.ws.onopen = () => {
        console.log('[HUOBI] WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyConnect();
        this.setupPingInterval();
        
        // Only subscribe if we have a symbol
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };

      this.ws.onclose = () => {
        console.log('[HUOBI] WebSocket closed');
        this.isConnecting = false;
        this.cleanup();
        this.notifyDisconnect();
        this.handleReconnect(this.constructor.name);
      };

      this.ws.onerror = (error) => {
        console.error('[HUOBI] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyError('WebSocket error', 'network');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data);
        } catch (error) {
          console.error('[HUOBI] Error processing message:', error);
          this.notifyError('Failed to process message', 'data');
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[HUOBI] Connection error:', error);
      this.notifyError('Connection error', 'network');
      throw error;
    }
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastPingTime > this.pingTimeoutMs) {
          console.log('[HUOBI] Ping timeout, reconnecting...');
          this.reconnect();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ ping: Date.now() }));
          this.lastPingTime = now;
        } catch (error) {
          console.error('[HUOBI] Error sending ping:', error);
          this.reconnect();
        }
      }
    }, this.pingIntervalMs);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.lastPingTime = 0;
    this.isConnecting = false;
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HUOBI] Max reconnect attempts reached');
      this.notifyError('Max reconnect attempts reached', 'network');
      // Reset reconnect attempts after a longer delay
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect().catch(error => {
          console.error('[HUOBI] Reconnect failed:', error);
          this.notifyError('Reconnect failed', 'network');
        });
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[HUOBI] Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[HUOBI] Reconnect failed:', error);
        this.notifyError('Reconnect failed', 'network');
      });
    }, delay);
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('[HUOBI] Cannot subscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[HUOBI] Cannot subscribe: WebSocket not connected');
      return;
    }

    this.symbol = symbol;
    const huobiSymbol = this.convertSymbol(symbol);
    
    try {
      const subscribeMsg = {
        sub: `market.${huobiSymbol}.depth.step0`,
        id: Date.now()
      };
      this.ws.send(JSON.stringify(subscribeMsg));
      console.log(`[HUOBI] Subscribed to ${huobiSymbol}`);
    } catch (error) {
      console.error('[HUOBI] Error subscribing:', error);
      this.notifyError('Failed to subscribe', 'subscription');
    }
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      console.error('[HUOBI] Cannot unsubscribe: No symbol provided');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const huobiSymbol = this.convertSymbol(symbol);
    
    try {
      const unsubscribeMsg = {
        unsub: `market.${huobiSymbol}.depth.step0`,
        id: Date.now()
      };
      this.ws.send(JSON.stringify(unsubscribeMsg));
      console.log(`[HUOBI] Unsubscribed from ${huobiSymbol}`);
    } catch (error) {
      console.error('[HUOBI] Error unsubscribing:', error);
      this.notifyError('Failed to unsubscribe', 'subscription');
    }
  }

  private processMessage(data: any): void {
    if (!data) return;

    // Handle ping/pong
    if (data.ping) {
      this.lastPingTime = Date.now();
      this.ws?.send(JSON.stringify({ pong: data.ping }));
      return;
    }

    // Handle error messages
    if (data.err_code) {
      console.error('[HUOBI] API error:', data);
      this.notifyError(data.err_msg || 'API error', 'api');
      return;
    }

    // Handle orderbook updates
    if (data.ch?.startsWith('market.') && data.ch?.endsWith('.depth.step0')) {
      const { tick } = data;
      
      if (!tick || !tick.bids || !tick.asks) return;

      const orderBook: OrderBookData = {
        bids: tick.bids.map(([price, quantity]: [number, number]) => ({
          price,
          quantity,
          exchanges: ['HUOBI'],
          exchangeQuantities: { 'HUOBI': quantity }
        })),
        asks: tick.asks.map(([price, quantity]: [number, number]) => ({
          price,
          quantity,
          exchanges: ['HUOBI'],
          exchangeQuantities: { 'HUOBI': quantity }
        })),
        timestamp: Date.now()
      };

      this.notifyOrderBookUpdate(orderBook);
    }
  }
}

class KucoinExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws-api.kucoin.com/endpoint');
  }
}

class MexcExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://wbs.mexc.com/ws');
  }
}

class OkexExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.okx.com:8443/ws/v5/public');
  }
}


// Register all exchanges
ExchangeFactory.registerExchange('BINANCE', new BinanceExchange());
ExchangeFactory.registerExchange('BYBIT', new BybitExchange());
ExchangeFactory.registerExchange('AGGR', new AggrExchange());
ExchangeFactory.registerExchange('BINANCE_FUTURES', new BinanceFuturesExchange());
ExchangeFactory.registerExchange('BINANCE_US', new BinanceUsExchange());
ExchangeFactory.registerExchange('BITFINEX', new BitfinexExchange());
ExchangeFactory.registerExchange('BITGET', new BitgetExchangeStub());
ExchangeFactory.registerExchange('BITMART', new BitmartExchangeStub());
ExchangeFactory.registerExchange('BITMEX', new BitmexExchangeStub());
ExchangeFactory.registerExchange('BITSTAMP', new BitstampExchangeStub());
ExchangeFactory.registerExchange('BITUNIX', new BitunixExchangeStub());
ExchangeFactory.registerExchange('COINBASE', new CoinbaseExchange());
ExchangeFactory.registerExchange('CRYPTOCOM', new CryptocomExchangeStub());
ExchangeFactory.registerExchange('DERIBIT', new DeribitExchangeStub());
ExchangeFactory.registerExchange('DYDX', new DydxExchangeStub());
ExchangeFactory.registerExchange('GATEIO', new GateioExchangeStub());
ExchangeFactory.registerExchange('HUOBI', new HuobiExchangeStub());
ExchangeFactory.registerExchange('KRAKEN', new KrakenExchange());
ExchangeFactory.registerExchange('KUCOIN', new KucoinExchangeStub());
ExchangeFactory.registerExchange('MEXC', new MexcExchangeStub());
ExchangeFactory.registerExchange('OKEX', new OkexExchangeStub());
ExchangeFactory.registerExchange('PHEMEX', new PhemexExchange());
ExchangeFactory.registerExchange('POLONIEX', new PoloniexExchange());
ExchangeFactory.registerExchange('HITBTC', new HitbtcExchange());

export default ExchangeFactory;
