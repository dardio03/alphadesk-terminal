import { BaseExchange } from "./BaseExchange";
export default class PoloniexExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private readonly baseUrl = 'wss://ws.poloniex.com/ws/public';
  private pingInterval: NodeJS.Timeout | null = null;
  private config: any;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    this.status = 'connecting';
    try {
      this.ws = new WebSocket(this.baseUrl);
      this.ws.onopen = () => {
        this.status = 'connected';
        this.errorHandler.resetBackoff(this.constructor.name);
        if (this.symbol) {
          this.subscribe(this.symbol);
        }
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ id: Date.now(), type: 'ping' }));
          }
        }, 30000);
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            return;
          }
          this.processMessage(data);
        } catch (error) {
          this.notifyError(error as Error, 'data');
        }
      };
      this.ws.onerror = (event) => {
        this.notifyError('WebSocket error', 'network');
      };
      this.ws.onclose = () => {
        this.status = 'disconnected';
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
      };
    } catch (error) {
      this.notifyError(error as Error, 'network');
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

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const subscribeMsg = {
          id: Date.now(),
          type: 'subscribe',
          channel: 'book',
          symbol: symbol
        };
        this.ws.send(JSON.stringify(subscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  unsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const unsubscribeMsg = {
          id: Date.now(),
          type: 'unsubscribe',
          channel: 'book',
          symbol: symbol
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  private processMessage(data: any): void {
    if (data.channel === 'book' && data.data) {
      try {
        const bids = data.data.bids.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['POLONIEX'],
            exchangeQuantities: { 'POLONIEX': parseFloat(quantity) },
            totalQuantity: quantityNum
          };
        });

        const asks = data.data.asks.slice(0, 100).map(([price, quantity]: [string, string]) => {
          const priceNum = parseFloat(price);
          const quantityNum = parseFloat(quantity);
          if (isNaN(priceNum) || isNaN(quantityNum)) {
            throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
          }
          return {
            price: priceNum,
            quantity: quantityNum,
            exchanges: ['POLONIEX'],
            exchangeQuantities: { 'POLONIEX': parseFloat(quantity) },
            totalQuantity: quantityNum
          };
        });

        // Sort bids in descending order and asks in ascending order
        bids.sort((a, b) => b.price - a.price);
        asks.sort((a, b) => a.price - b.price);

        this.latestOrderBook = {
          bids,
          asks,
          timestamp: Date.now()
        };

        this.orderBookCallbacks.forEach(cb => cb(this.latestOrderBook!));
      } catch (error) {
        this.notifyError(error as Error, 'data');
      }
    }
    if (data.channel === 'trades' && Array.isArray(data.data)) {
      data.data.forEach((t: any) => {
        const trade: TradeData = {
          price: parseFloat(t.price),
          size: parseFloat(t.amount) / parseFloat(t.price),
          side: t.takerSide,
          timestamp: t.createTime,
        };
        this.notifyTradeUpdate(trade);
      });
    }
  }
}

