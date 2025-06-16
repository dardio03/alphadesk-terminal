import { BaseExchange } from "./BaseExchange";
export default class HuobiExchangeStub extends BaseExchange {
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

