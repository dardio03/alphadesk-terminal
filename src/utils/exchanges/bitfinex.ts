import { BaseExchange, OrderBookData, OrderBookEntry } from '../ExchangeService';

export default class BitfinexExchange extends BaseExchange {
  private ws: WebSocket | null = null;
  private chanId: number | null = null;
  private readonly baseUrl = 'wss://api-pub.bitfinex.com/ws/2';

  async connect(): Promise<void> {
    if (this.ws) return;
    this.status = 'connecting';
    this.ws = new WebSocket(this.baseUrl);

    this.ws.onopen = () => {
      this.notifyConnect();
      if (this.symbol) {
        this.subscribe(this.symbol);
      }
    };

    this.ws.onclose = () => {
      this.notifyDisconnect();
      this.ws = null;
      this.reconnect();
    };

    this.ws.onerror = () => {
      this.notifyError(new Error('WebSocket error'), 'connection');
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this.processMessage(data);
      } catch (err) {
        this.notifyError(err as Error, 'parsing');
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  subscribe(symbol: string): void {
    this.symbol = symbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg = {
        event: 'subscribe',
        channel: 'book',
        symbol: `t${symbol}`,
        prec: 'P0',
        freq: 'F0',
        len: 25
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  unsubscribe(_symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.chanId) {
      const msg = { event: 'unsubscribe', chanId: this.chanId };
      this.ws.send(JSON.stringify(msg));
      this.chanId = null;
    }
  }

  protected processMessage(data: any) {
    if (data.event === 'subscribed') {
      this.chanId = data.chanId;
      return;
    }
    if (!Array.isArray(data)) return;
    if (data[1] === 'hb') return; // heartbeat

    const entries = Array.isArray(data[1][0]) ? data[1] : [data[1]];
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    entries.forEach(([price, count, amount]: [number, number, number]) => {
      if (amount > 0) {
        bids.push({
          price,
          quantity: amount,
          exchanges: ['BITFINEX'],
          exchangeQuantities: { BITFINEX: amount }
        });
      } else {
        asks.push({
          price,
          quantity: Math.abs(amount),
          exchanges: ['BITFINEX'],
          exchangeQuantities: { BITFINEX: Math.abs(amount) }
        });
      }
    });

    if (bids.length || asks.length) {
      const ob: OrderBookData = { bids, asks, timestamp: Date.now() };
      this.notifyOrderBookUpdate(ob);
    }
  }
}
