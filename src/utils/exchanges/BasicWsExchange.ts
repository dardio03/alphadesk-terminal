import { BaseExchange } from "./BaseExchange";

export default class BasicWsExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;
  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    if (this.ws) {
      return;
    }

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.minConnectionInterval) {
      return;
    }
    this.lastConnectionAttempt = now;

    this.status = 'connecting';
    try {
      this.ws = new WebSocket(this.baseUrl);
      this.ws.onopen = () => {
        this.notifyConnect();
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 30000);
      };

      this.ws.onclose = () => {
        this.notifyDisconnect();
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        this.ws = null;
        this.reconnect();
      };

      this.ws.onerror = (event) => {
        this.notifyError(new Error('WebSocket error'));
      };

      this.ws.onmessage = (event) => {
        this.processMessage(event.data);
      };
    } catch (error) {
      this.notifyError(error as Error);
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
      // Exchange specific subscription should be implemented here
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    try {
      const msg = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'public/subscribe',
        params: { channels: [`trades.${normalizedSymbol}.100ms`] },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const normalizedSymbol = symbol.replace('USDT', 'USD');
    try {
      const msg = {
        method: 'subscribeTrades',
        params: { symbol: normalizedSymbol },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const msg = { id: Date.now(), type: 'subscribe', channel: 'trades', symbols: [symbol] };
        this.ws.send(JSON.stringify(msg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(
        JSON.stringify({ id: Date.now(), method: 'trade.subscribe', params: [symbol] })
      );
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  subscribeTrades(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const krakenSymbol = this.convertSymbol(symbol);
    try {
      const msg = {
        event: 'subscribe',
        pair: [krakenSymbol],
        subscription: { name: 'trade' },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (error) {
      this.notifyError(error as Error, 'api');
    }
  }

  unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Exchange specific unsubscription should be implemented here
    }
  }

  protected processMessage(_data: any) {
    // Parsing for order book updates should be implemented per exchange
  }
}

