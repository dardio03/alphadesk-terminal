import { BaseExchange } from "./BaseExchange";
export default class DeribitExchangeStub extends BaseExchange {
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

