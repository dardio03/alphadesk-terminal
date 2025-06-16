import { EventEmitter } from "events";
import { ErrorHandler, ErrorContext, ErrorCategory } from "../ErrorHandler";
import type { ExchangeConnection, OrderBookData, TradeData, TickerData } from "../ExchangeService";

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

