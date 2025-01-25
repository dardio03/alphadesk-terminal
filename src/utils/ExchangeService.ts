interface ExchangeConnection {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): void;
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'error';
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  onOrderBookUpdate(callback: (data: OrderBookData) => void): void;
  onError(callback: (error: Error) => void): void;
  getOrderBookData(): OrderBookData | null;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
}

import { connectionManager } from './ConnectionManager';

class ExchangeFactory {
  private static exchanges: { [key: string]: ExchangeConnection } = {};

  static registerExchange(name: string, exchange: ExchangeConnection) {
    this.exchanges[name] = exchange;
    connectionManager.addConnection(name, exchange);
  }

  static getExchange(name: string): ExchangeConnection {
    const exchange = this.exchanges[name];
    if (!exchange) {
      throw new Error(`Exchange ${name} not found`);
    }
    return exchange;
  }

  static getAllExchanges(): { [key: string]: ExchangeConnection } {
    return this.exchanges;
  }

  static createExchange(name: string, config: any): ExchangeConnection {
    switch (name.toUpperCase()) {
      case 'BINANCE':
        return new BinanceExchange(config);
      case 'BYBIT':
        return new BybitExchange(config);
      case 'COINBASE':
        return new CoinbaseExchange(config);
      case 'KRAKEN':
        return new KrakenExchange(config);
      default:
        throw new Error(`Unsupported exchange: ${name}`);
    }
  }
}

abstract class BaseExchange implements ExchangeConnection {
  protected symbol: string = '';
  protected orderBookCallbacks: ((data: OrderBookData) => void)[] = [];
  protected errorCallbacks: ((error: Error) => void)[] = [];
  protected status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
  protected latestOrderBook: OrderBookData | null = null;

  getOrderBookData(): OrderBookData | null {
    return this.latestOrderBook;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract reconnect(): void;
  abstract subscribe(symbol: string): void;
  abstract unsubscribe(symbol: string): void;

  getStatus() {
    return this.status;
  }

  onOrderBookUpdate(callback: (data: OrderBookData) => void) {
    this.orderBookCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void) {
    this.errorCallbacks.push(callback);
  }

  protected notifyOrderBookUpdate(data: OrderBookData) {
    this.orderBookCallbacks.forEach(cb => cb(data));
  }

  protected notifyError(error: Error) {
    this.errorCallbacks.forEach(cb => cb(error));
    this.status = 'error';
  }
}

// Example implementation for Binance
class BinanceExchange extends BaseExchange {
  private ws: WebSocket | null = null;

  async connect(): Promise<void> {
    this.status = 'connecting';
    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');
      this.ws.onopen = () => {
        this.status = 'connected';
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
      };
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.processMessage(data);
      };
      this.ws.onerror = (error) => {
        this.notifyError(new Error(error.message));
      };
      this.ws.onclose = () => {
        this.status = 'disconnected';
      };
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  subscribe(symbol: string) {
    this.symbol = symbol;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth`],
        id: Date.now()
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  unsubscribe(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        method: 'UNSUBSCRIBE',
        params: [`${symbol.toLowerCase()}@depth`],
        id: Date.now()
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  private processMessage(data: any) {
    if (data.e === 'depthUpdate') {
      const orderBookData: OrderBookData = {
        bids: data.b.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        asks: data.a.map(([price, quantity]: [string, string]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        timestamp: data.E
      };
      this.latestOrderBook = orderBookData;
      this.notifyOrderBookUpdate(orderBookData);
    }
  }
}

// Register exchanges at startup
ExchangeFactory.registerExchange('BINANCE', new BinanceExchange({}));