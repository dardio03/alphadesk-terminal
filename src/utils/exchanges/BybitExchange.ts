import { BaseExchange } from "./BaseExchange";
export default class BybitExchange extends BaseExchange {
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

