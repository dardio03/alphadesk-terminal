import { BaseExchange } from "./BaseExchange";
export default class PhemexExchange extends BaseExchange {
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

