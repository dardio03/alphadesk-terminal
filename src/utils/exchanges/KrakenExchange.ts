import { BaseExchange } from "./BaseExchange";
export default class KrakenExchange extends BaseExchange {
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

