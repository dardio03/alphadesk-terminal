import { EventEmitter } from 'events';

export interface ExchangeConnection {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): void;
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'error';
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  onOrderBookUpdate(callback: (data: OrderBookData) => void): void;
  onError(callback: (error: Error) => void): void;
  getOrderBookData(): OrderBookData | null;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
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
      case 'COINBASE':
        exchange = new CoinbaseExchange(config);
        break;
      case 'KRAKEN':
        exchange = new KrakenExchange(config);
        break;
      case 'PHEMEX':
        exchange = new PhemexExchange(config);
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

abstract class BaseExchange extends EventEmitter implements ExchangeConnection {
  protected symbol: string = '';
  protected orderBookCallbacks: ((data: OrderBookData) => void)[] = [];
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

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  protected notifyOrderBookUpdate(data: OrderBookData): void {
    this.latestOrderBook = data;
    this.orderBookCallbacks.forEach(cb => cb(data));
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

  private processMessage(data: any) {
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

  private processMessage(data: any) {
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
  private readonly baseUrl = 'wss://ws-feed.pro.coinbase.com';
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
          this.ws.send(JSON.stringify({ type: 'ping' }));
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
        if (data.type === 'error') {
          this.notifyError(new Error(data.message || 'API error'), 'api');
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
        type: 'subscribe',
        product_ids: [symbol],
        channels: ['level2']
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
        type: 'unsubscribe',
        product_ids: [symbol],
        channels: ['level2']
      }));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  private processMessage(data: any) {
    if (!data || !data.type || data.type !== 'snapshot' && data.type !== 'l2update') {
      return;
    }

    try {
      let bids: OrderBookEntry[] = [];
      let asks: OrderBookEntry[] = [];

      if (data.type === 'snapshot') {
        bids = data.bids.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: [this.constructor.name],
          exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
          totalQuantity: parseFloat(quantity)
        })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);

        asks = data.asks.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          exchanges: [this.constructor.name],
          exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
          totalQuantity: parseFloat(quantity)
        })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);
      } else if (data.type === 'l2update') {
        bids = data.changes
          .filter(([side]: [string]) => side === 'buy')
          .map(([, price, quantity]: [string, string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            exchanges: [this.constructor.name],
            exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
            totalQuantity: parseFloat(quantity)
          })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);

        asks = data.changes
          .filter(([side]: [string]) => side === 'sell')
          .map(([, price, quantity]: [string, string, string]) => ({
            price: parseFloat(price),
            quantity: parseFloat(quantity),
            exchanges: [this.constructor.name],
            exchangeQuantities: { [this.constructor.name]: parseFloat(quantity) },
            totalQuantity: parseFloat(quantity)
          })).filter((entry: OrderBookEntry) => entry.price > 0 && entry.quantity > 0);
      }

      // Sort bids in descending order and asks in ascending order
      bids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
      asks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);

      // Limit to top 100 entries
      const limitedBids = bids.slice(0, 100);
      const limitedAsks = asks.slice(0, 100);

      this.notifyOrderBookUpdate({
        bids: limitedBids,
        asks: limitedAsks,
        timestamp: Date.now()
      });
    } catch (error) {
      this.notifyError(error as Error, 'parsing');
    }
  }
}

class KrakenExchange extends BinanceExchange {
  constructor(config: any = {}) {
    super(config);
  }
}

class PhemexExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://phemex.com/ws';
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
            this.ws.send(JSON.stringify({ id: Date.now(), method: 'server.ping' }));
          }
        }, 30000);
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.method === 'server.pong') {
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
          method: 'orderbook.subscribe',
          params: [symbol, 100]
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
          method: 'orderbook.unsubscribe',
          params: [symbol]
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  private processMessage(data: any): void {
    if (data.type === 'snapshot' || data.type === 'incremental') {
      try {
        const bids = data.orderbook_p.bids.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['PHEMEX'],
            exchangeQuantities: { 'PHEMEX': quantityNum },
            totalQuantity: quantityNum
          };
        });

        const asks = data.orderbook_p.asks.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['PHEMEX'],
            exchangeQuantities: { 'PHEMEX': quantityNum },
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
            exchangeQuantities: { 'POLONIEX': quantityNum },
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
            exchangeQuantities: { 'POLONIEX': quantityNum },
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
}

class HitbtcExchange extends BaseExchange {
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
      this.ws = new WebSocket('wss://api.hitbtc.com/api/3/ws');
      
      this.ws.onopen = () => {
        console.log(`[${this.constructor.name}] WebSocket connected`);
        this.notifyConnect();
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ method: 'ping' }));
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
          if (data.error) {
            this.notifyError(new Error(data.error.message || 'API error'), 'api');
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
          method: 'subscribe',
          params: {
            channels: [`orderbook.${symbol.toLowerCase()}.100`]
          },
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
          method: 'unsubscribe',
          params: {
            channels: [`orderbook.${symbol.toLowerCase()}.100`]
          },
          id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  private processMessage(data: any) {
    if (!data || !data.params || !data.params.data) {
      return;
    }

    try {
      const orderBook = data.params.data;
      if (!orderBook.bid || !orderBook.ask) {
        return;
      }

      const bids = orderBook.bid.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['HITBTC'],
          exchangeQuantities: { 'HITBTC': quantityNum },
          totalQuantity: quantityNum
        };
      });

      const asks = orderBook.ask.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['HITBTC'],
          exchangeQuantities: { 'HITBTC': quantityNum },
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

// Register all exchanges
ExchangeFactory.registerExchange('BINANCE', new BinanceExchange());
ExchangeFactory.registerExchange('BYBIT', new BybitExchange());
ExchangeFactory.registerExchange('COINBASE', new CoinbaseExchange());
ExchangeFactory.registerExchange('KRAKEN', new KrakenExchange());
ExchangeFactory.registerExchange('PHEMEX', new PhemexExchange());
ExchangeFactory.registerExchange('POLONIEX', new PoloniexExchange());
ExchangeFactory.registerExchange('HITBTC', new HitbtcExchange());

export default ExchangeFactory;
