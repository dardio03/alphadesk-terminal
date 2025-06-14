import { EventEmitter } from 'events';
import ExchangeFactory, { OrderBookData, ExchangeConnection, OrderBookEntry } from '../utils/ExchangeService';

function normalizeEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
  return entries
    .filter(e => e.price > 0 && e.quantity > 0)
    .map(e => ({ price: parseFloat(e.price.toFixed(2)), quantity: parseFloat(e.quantity.toFixed(6)) }))
    .sort((a, b) => b.price - a.price);
}

function aggregateEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
  const aggregated = new Map<number, OrderBookEntry>();
  entries.forEach(entry => {
    const existing = aggregated.get(entry.price);
    if (existing) {
      existing.quantity += entry.quantity;
    } else {
      aggregated.set(entry.price, { ...entry });
    }
  });
  return Array.from(aggregated.values())
    .sort((a, b) => b.price - a.price)
    .slice(0, 100);
}

function aggregateData(dataSources: OrderBookData[]): OrderBookData {
  return {
    bids: aggregateEntries(dataSources.flatMap(d => d.bids)),
    asks: aggregateEntries(dataSources.flatMap(d => d.asks)),
    timestamp: Date.now()
  };
}

export type ExchangeId = 'BINANCE' | 'BYBIT' | 'COINBASE' | 'KRAKEN';

class AggregatorService extends EventEmitter {
  private exchanges: { [key in ExchangeId]?: ExchangeConnection } = {};
  private exchangeData: { [key in ExchangeId]?: OrderBookData } = {};
  private enabled: ExchangeId[] = [];
  private symbol: string = 'BTCUSDT';

  private ensureExchange(name: ExchangeId): ExchangeConnection {
    if (!this.exchanges[name]) {
      try {
        this.exchanges[name] = ExchangeFactory.getExchange(name);
      } catch {
        const conn = ExchangeFactory.createExchange(name, {});
        ExchangeFactory.registerExchange(name, conn);
        this.exchanges[name] = conn;
      }
      const conn = this.exchanges[name]!;
      conn.onOrderBookUpdate(data => this.handleUpdate(name, data));
      conn.onError(err => this.emit('error', { exchange: name, error: err }));
    }
    return this.exchanges[name]!;
  }

  private handleUpdate(exchange: ExchangeId, data: OrderBookData) {
    this.exchangeData[exchange] = {
      bids: normalizeEntries(data.bids),
      asks: normalizeEntries(data.asks),
      timestamp: Date.now()
    };
    this.emit('exchange', { exchange, data: this.exchangeData[exchange] });
    const aggregated = aggregateData(
      this.enabled
        .map(e => this.exchangeData[e])
        .filter(Boolean) as OrderBookData[]
    );
    this.emit('orderBook', aggregated);
  }

  subscribe(symbol: string, exchanges: ExchangeId[]) {
    this.symbol = symbol;
    this.enabled = exchanges;
    exchanges.forEach(name => {
      const conn = this.ensureExchange(name);
      conn.connect();
      conn.subscribe(symbol);
    });
  }

  updateExchanges(exchanges: ExchangeId[]) {
    const toRemove = this.enabled.filter(e => !exchanges.includes(e));
    const toAdd = exchanges.filter(e => !this.enabled.includes(e));
    this.enabled = exchanges;
    toRemove.forEach(e => {
      this.exchanges[e]?.unsubscribe(this.symbol);
    });
    toAdd.forEach(e => {
      const conn = this.ensureExchange(e);
      conn.connect();
      conn.subscribe(this.symbol);
    });
  }

  unsubscribe(symbol: string) {
    this.enabled.forEach(e => {
      this.exchanges[e]?.unsubscribe(symbol);
    });
    this.exchangeData = {};
  }

  getStatus(exchange: ExchangeId): string {
    return this.exchanges[exchange]?.getStatus() || 'disconnected';
  }

  reconnect(exchange: ExchangeId) {
    const conn = this.ensureExchange(exchange);
    conn.reconnect();
  }
}

export default new AggregatorService();
