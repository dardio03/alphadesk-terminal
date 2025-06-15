import { EventEmitter } from "events";
import ExchangeFactory, {
  OrderBookData,
  ExchangeConnection,
  OrderBookEntry,
} from "../utils/ExchangeService";
import { ExchangeId } from '../types/exchange';

function normalizeEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
  return entries
    .filter((e) => e.price > 0 && e.quantity > 0)
    .map((e) => ({
      price: parseFloat(e.price.toFixed(2)),
      quantity: parseFloat(e.quantity.toFixed(6)),
      exchanges: e.exchanges || [],
      exchangeQuantities: e.exchangeQuantities || {},
      totalQuantity: e.quantity
    }))
    .sort((a, b) => b.price - a.price);
}

function aggregateEntries(entries: OrderBookEntry[]): OrderBookEntry[] {
  const aggregated = new Map<number, OrderBookEntry>();
  
  entries.forEach((entry) => {
    const existing = aggregated.get(entry.price);
    if (existing) {
      // Update quantities
      existing.quantity += entry.quantity;
      existing.totalQuantity = existing.quantity;
      
      // Update exchange information
      if (entry.exchanges) {
        existing.exchanges = Array.from(new Set([...(existing.exchanges || []), ...entry.exchanges]));
      }
      
      // Update exchange quantities
      existing.exchangeQuantities = {
        ...existing.exchangeQuantities,
        ...entry.exchangeQuantities
      };
    } else {
      aggregated.set(entry.price, { 
        ...entry,
        totalQuantity: entry.quantity,
        exchanges: entry.exchanges || [],
        exchangeQuantities: entry.exchangeQuantities || {}
      });
    }
  });

  return Array.from(aggregated.values())
    .sort((a, b) => b.price - a.price)
    .slice(0, 100);
}

function aggregateData(dataSources: OrderBookData[]): OrderBookData {
  const bids = aggregateEntries(dataSources.flatMap((d) => d.bids));
  const asks = aggregateEntries(dataSources.flatMap((d) => d.asks));

  // Calculate total quantities for each price level
  const calculateTotals = (entries: OrderBookEntry[]): OrderBookEntry[] => {
    return entries.map(entry => ({
      ...entry,
      totalQuantity: Object.values(entry.exchangeQuantities || {}).reduce((sum: number, qty: number) => sum + qty, 0)
    }));
  };

  return {
    bids: calculateTotals(bids),
    asks: calculateTotals(asks),
    timestamp: Date.now(),
  };
}

export class AggregatorService extends EventEmitter {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;
  private symbol: string = 'BTCUSDT';
  private enabled: string[] = [];
  private exchangeData: Record<string, OrderBookData> = {};
  private exchangeStatuses: Record<string, 'disconnected' | 'connecting' | 'connected' | 'error'> = {};
  private exchanges: Record<string, ExchangeConnection> = {};

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(new URL('../aggr-worker/worker.ts', import.meta.url));
        
        this.worker.onmessage = (event) => {
          const { op, data } = event.data;
          
          switch (op) {
            case 'error':
              this.emit('error', data);
              break;
            case 'notice':
              this.emit('notice', data);
              break;
            case 'trades':
              this.emit('trades', data);
              break;
            case 'orderBook':
              this.emit('orderBook', data);
              break;
            case 'initialized':
              this.isInitialized = true;
              this.emit('initialized');
              resolve();
              break;
            default:
              console.warn(`Unknown worker operation: ${op}`);
          }
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          this.emit('error', { error: error.message || 'Worker error' });
          reject(error);
        };

        // Send initialization message to worker
        this.worker.postMessage({ 
          op: 'init',
          data: {
            symbol: this.symbol,
            exchanges: this.enabled
          }
        });
      } catch (error) {
        console.error('Failed to create worker:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  async subscribe(symbol: string, exchanges: string[]): Promise<void> {
    await this.initialize();

    this.symbol = symbol;
    this.enabled = exchanges;

    // Initialize exchange statuses
    exchanges.forEach(exchange => {
      if (!this.exchangeStatuses[exchange]) {
        this.exchangeStatuses[exchange] = 'disconnected';
      }
    });

    // Connect to exchanges
    for (const exchangeId of exchanges) {
      try {
        const exchange = ExchangeFactory.getExchange(exchangeId);
        if (!exchange) {
          console.error(`Exchange ${exchangeId} not found`);
          this.exchangeStatuses[exchangeId] = 'error';
          continue;
        }

        this.exchanges[exchangeId] = exchange;

        // Set up exchange event handlers
        exchange.onOrderBookUpdate((data) => {
          this.handleUpdate(exchangeId, data);
        });

        exchange.onError((error) => {
          console.error(`Exchange ${exchangeId} error:`, error);
          this.exchangeStatuses[exchangeId] = 'error';
          this.emit('error', { exchange: exchangeId, error });
        });

        exchange.onConnect(() => {
          console.log(`Exchange ${exchangeId} connected`);
          this.exchangeStatuses[exchangeId] = 'connected';
          this.emit('exchangeStatus', { exchange: exchangeId, status: 'connected' });
        });

        exchange.onDisconnect(() => {
          console.log(`Exchange ${exchangeId} disconnected`);
          this.exchangeStatuses[exchangeId] = 'disconnected';
          this.emit('exchangeStatus', { exchange: exchangeId, status: 'disconnected' });
          // Notify worker about disconnection
          if (this.worker) {
            this.worker.postMessage({
              op: 'exchangeDisconnected',
              data: { exchange: exchangeId }
            });
          }
        });

        // Connect to exchange
        this.exchangeStatuses[exchangeId] = 'connecting';
        await exchange.connect();
        await exchange.subscribe(symbol);
      } catch (error) {
        console.error(`Failed to connect to exchange ${exchangeId}:`, error);
        this.exchangeStatuses[exchangeId] = 'error';
        this.emit('error', { exchange: exchangeId, error });
      }
    }

    // Update worker with new symbol and exchanges
    if (this.worker) {
      this.worker.postMessage({
        op: 'subscribe',
        data: {
          symbol,
          exchanges
        }
      });
    }
  }

  async unsubscribe(exchanges: string[]): Promise<void> {
    // Disconnect from exchanges
    for (const exchangeId of exchanges) {
      const exchange = this.exchanges[exchangeId];
      if (exchange) {
        try {
          await exchange.unsubscribe(this.symbol);
          await exchange.disconnect();
          delete this.exchanges[exchangeId];
          delete this.exchangeStatuses[exchangeId];
          delete this.exchangeData[exchangeId];
        } catch (error) {
          console.error(`Failed to disconnect from exchange ${exchangeId}:`, error);
        }
      }
    }

    // Update enabled exchanges list
    this.enabled = this.enabled.filter(ex => !exchanges.includes(ex));

    // Update worker
    if (this.worker) {
      this.worker.postMessage({
        op: 'unsubscribe',
        data: { exchanges }
      });
    }
  }

  private handleUpdate(exchangeId: string, data: OrderBookData) {
    // Store the exchange data
    this.exchangeData[exchangeId] = {
      ...data,
      timestamp: Date.now()
    };
    
    // Update exchange status
    this.exchangeStatuses[exchangeId] = 'connected';
    
    // Aggregate data from all connected exchanges
    const connectedExchanges = Object.entries(this.exchangeStatuses)
      .filter(([_, status]) => status === 'connected')
      .map(([id]) => id);

    const exchangeData = connectedExchanges
      .map(id => this.exchangeData[id])
      .filter((data): data is OrderBookData => data !== null && data !== undefined);

    if (exchangeData.length > 0) {
      const aggregatedData = aggregateData(exchangeData);
      this.emit('orderBook', aggregatedData);
    }

    // Notify worker about the update
    if (this.worker) {
      this.worker.postMessage({
        op: 'updateOrderBook',
        data: {
          exchange: exchangeId,
          data: this.exchangeData[exchangeId]
        }
      });
    }
  }

  getExchangeStatus(exchangeId: string): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.exchangeStatuses[exchangeId] || 'disconnected';
  }

  getExchangeData(exchangeId: string): OrderBookData | null {
    return this.exchangeData[exchangeId] || null;
  }

  getEnabledExchanges(): string[] {
    return this.enabled;
  }

  getSymbol(): string {
    return this.symbol;
  }
}

export const aggregatorService = new AggregatorService();
export default aggregatorService;
