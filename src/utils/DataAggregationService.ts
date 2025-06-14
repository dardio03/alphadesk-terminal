import { OrderBookData, OrderBookEntry } from './ExchangeService';

class DataAggregationService {
  private cache: Map<string, OrderBookData> = new Map();
  private cacheTTL = 1000; // 1 second cache
  private lastUpdateTime = 0;

  constructor() {
    setInterval(this.cleanCache.bind(this), this.cacheTTL * 2);
  }

  private cleanCache() {
    const now = Date.now();
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    });
  }

  normalizeData(data: OrderBookData): OrderBookData {
    return {
      bids: this.normalizeEntries(data.bids),
      asks: this.normalizeEntries(data.asks),
      timestamp: Date.now()
    };
  }

  private normalizeEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
    return entries
      .filter(entry => entry.price > 0 && entry.quantity > 0)
      .map(entry => ({
        price: parseFloat(entry.price.toFixed(2)),
        quantity: parseFloat(entry.quantity.toFixed(6))
      }))
      .sort((a, b) => b.price - a.price);
  }

  aggregateData(dataSources: OrderBookData[]): OrderBookData {
    const aggregatedBids = this.aggregateEntries(dataSources.flatMap(d => d.bids));
    const aggregatedAsks = this.aggregateEntries(dataSources.flatMap(d => d.asks));

    return {
      bids: aggregatedBids,
      asks: aggregatedAsks,
      timestamp: Date.now()
    };
  }

  private aggregateEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
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
      .slice(0, 100); // Limit to top 100 entries
  }

  cacheData(key: string, data: OrderBookData) {
    this.cache.set(key, data);
    this.lastUpdateTime = Date.now();
  }

  getCachedData(key: string): OrderBookData | undefined {
    return this.cache.get(key);
  }

  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }
}

export const dataAggregator = new DataAggregationService();