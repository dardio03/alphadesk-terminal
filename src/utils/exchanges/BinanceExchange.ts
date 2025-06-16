import { BaseExchange } from "./BaseExchange";
export default class BinanceExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private config: any;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: any = {}) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.minConnectionInterval) {
      return;
    }

    this.lastConnectionAttempt = now;
    this.status = 'connecting';

    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');
      
      this.ws.onopen = () => {
        console.log(`[${this.constructor.name}] WebSocket connected`);
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
        this.reconnect();
      };

      this.ws.onerror = (event) => {
        console.error(`[${this.constructor.name}] WebSocket error:`, event);
        this.notifyError(new Error('WebSocket error'), 'connection');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === 'error') {
            this.notifyError(new Error(data.m || 'API error'), 'api');
            return;
          }
          this.processMessage(data);
        } catch (error) {
          this.notifyError(error as Error, 'data');
        }
      };
    } catch (error) {
      this.notifyError(error as Error, 'network');
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
      try {
        const subscribeMsg = {
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth@100ms`],
          id: Date.now()
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
          method: 'UNSUBSCRIBE',
          params: [`${symbol.toLowerCase()}@depth@100ms`],
          id: Date.now()
        };
        this.ws.send(JSON.stringify(unsubscribeMsg));
      } catch (error) {
        this.notifyError(error as Error, 'api');
      }
    }
  }

  subscribeTrades(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [`${symbol.toLowerCase()}@trade`],
          id: Date.now()
        })
      );
    }
  }

  private processMessage(data: any) {
    if (data && data.e === 'trade') {
      const trade: TradeData = {
        price: parseFloat(data.p),
        size: parseFloat(data.q),
        side: data.m ? 'sell' : 'buy',
        timestamp: data.T,
      };
      this.notifyTradeUpdate(trade);
      return;
    }

    if (!data || !data.bids || !data.asks) {
      return;
    }

    try {
      const bids = data.bids.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid bid data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['BINANCE'],
          exchangeQuantities: { 'BINANCE': quantityNum },
          totalQuantity: quantityNum
        };
      });

      const asks = data.asks.map(([price, quantity]: [string, string]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(quantityNum)) {
          throw new Error(`Invalid ask data: price=${price}, quantity=${quantity}`);
        }
        return {
          price: priceNum,
          quantity: quantityNum,
          exchanges: ['BINANCE'],
          exchangeQuantities: { 'BINANCE': quantityNum },
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
}

