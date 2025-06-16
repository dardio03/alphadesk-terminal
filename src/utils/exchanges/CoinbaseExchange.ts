import { BaseExchange } from "./BaseExchange";
export default class CoinbaseExchange extends BaseExchange {
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

