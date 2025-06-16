import { BaseExchange } from "./BaseExchange";
export default class HitbtcExchange extends BaseExchange {
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

