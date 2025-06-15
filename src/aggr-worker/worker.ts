/* eslint-disable no-restricted-globals */
const worker = self as unknown as Worker;

interface OrderData {
  price: number;
  quantity: number;
  exchanges?: string[];
  exchangeQuantities?: Record<string, number>;
  totalQuantity?: number;
}

interface OrderBookData {
  bids: OrderData[];
  asks: OrderData[];
  timestamp: number;
}

interface ExchangeData {
  [key: string]: OrderBookData;
}

let exchangeData: ExchangeData = {};
let currentSymbol = 'BTCUSDT';
let enabledExchanges: string[] = [];

function aggregateOrderBookData(): OrderBookData {
  const bids: OrderData[] = [];
  const asks: OrderData[] = [];
  const bidMap = new Map<number, OrderData>();
  const askMap = new Map<number, OrderData>();

  // Aggregate data from all enabled exchanges
  enabledExchanges.forEach(exchange => {
    const data = exchangeData[exchange];
    if (!data) return;

    // Process bids
    data.bids.forEach(bid => {
      const existing = bidMap.get(bid.price);
      if (existing) {
        existing.quantity += bid.quantity;
        existing.totalQuantity = existing.quantity;
        if (bid.exchanges) {
          existing.exchanges = Array.from(new Set([...(existing.exchanges || []), ...bid.exchanges]));
        }
        if (bid.exchangeQuantities) {
          existing.exchangeQuantities = {
            ...existing.exchangeQuantities,
            ...bid.exchangeQuantities
          };
        }
      } else {
        bidMap.set(bid.price, { ...bid });
      }
    });

    // Process asks
    data.asks.forEach(ask => {
      const existing = askMap.get(ask.price);
      if (existing) {
        existing.quantity += ask.quantity;
        existing.totalQuantity = existing.quantity;
        if (ask.exchanges) {
          existing.exchanges = Array.from(new Set([...(existing.exchanges || []), ...ask.exchanges]));
        }
        if (ask.exchangeQuantities) {
          existing.exchangeQuantities = {
            ...existing.exchangeQuantities,
            ...ask.exchangeQuantities
          };
        }
      } else {
        askMap.set(ask.price, { ...ask });
      }
    });
  });

  // Convert maps to sorted arrays
  bidMap.forEach(bid => bids.push(bid));
  askMap.forEach(ask => asks.push(ask));

  // Sort bids in descending order and asks in ascending order
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  return {
    bids: bids.slice(0, 100),
    asks: asks.slice(0, 100),
    timestamp: Date.now()
  };
}

const processOrderBookData = (data: any, exchange: string) => {
  try {
    if (!data || (!data.bids && !data.asks)) {
      const error = new Error(`Invalid order book data from ${exchange}: ${JSON.stringify(data)}`);
      worker.postMessage({
        op: 'error',
        data: {
          exchange,
          message: error.message,
          category: 'data_validation'
        }
      });
      return;
    }

    const bids = Array.isArray(data.bids) ? data.bids.map((bid: any) => {
      if (typeof bid !== 'object' || !bid.price || !bid.quantity) {
        const error = new Error(`Invalid bid data format from ${exchange}: ${JSON.stringify(bid)}`);
        worker.postMessage({
          op: 'error',
          data: {
            exchange,
            message: error.message,
            category: 'data_validation'
          }
        });
        return null;
      }

      const price = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
      const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : bid.quantity;
      
      if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
        const error = new Error(`Invalid bid data from ${exchange}: ${JSON.stringify(bid)}`);
        worker.postMessage({
          op: 'error',
          data: {
            exchange,
            message: error.message,
            category: 'data_validation'
          }
        });
        return null;
      }

      return {
        price,
        quantity,
        exchanges: [exchange],
        exchangeQuantities: { [exchange]: quantity },
        totalQuantity: quantity
      };
    }).filter(Boolean) : [];

    const asks = Array.isArray(data.asks) ? data.asks.map((ask: any) => {
      if (typeof ask !== 'object' || !ask.price || !ask.quantity) {
        const error = new Error(`Invalid ask data format from ${exchange}: ${JSON.stringify(ask)}`);
        worker.postMessage({
          op: 'error',
          data: {
            exchange,
            message: error.message,
            category: 'data_validation'
          }
        });
        return null;
      }

      const price = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
      const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : ask.quantity;
      
      if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
        const error = new Error(`Invalid ask data from ${exchange}: ${JSON.stringify(ask)}`);
        worker.postMessage({
          op: 'error',
          data: {
            exchange,
            message: error.message,
            category: 'data_validation'
          }
        });
        return null;
      }

      return {
        price,
        quantity,
        exchanges: [exchange],
        exchangeQuantities: { [exchange]: quantity },
        totalQuantity: quantity
      };
    }).filter(Boolean) : [];

    if (bids.length === 0 && asks.length === 0) {
      const error = new Error(`No valid order book data from ${exchange}`);
      worker.postMessage({
        op: 'error',
        data: {
          exchange,
          message: error.message,
          category: 'data_validation'
        }
      });
      return;
    }

    // Sort bids in descending order and asks in ascending order
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    exchangeData[exchange] = { bids, asks, timestamp: data.timestamp || Date.now() };

    // Aggregate and emit the updated orderbook
    const aggregatedData = aggregateOrderBookData();
    worker.postMessage({
      op: 'orderBook',
      data: aggregatedData
    });
  } catch (error) {
    console.error(`Error processing ${exchange} order book data:`, error);
    worker.postMessage({
      op: 'error',
      data: {
        exchange,
        message: `Error processing ${exchange} order book data: ${error instanceof Error ? error.message : String(error)}`,
        category: 'processing'
      }
    });
  }
};

worker.onmessage = (event) => {
  const { op, data } = event.data;

  try {
    switch (op) {
      case 'init':
        currentSymbol = data.symbol;
        enabledExchanges = data.exchanges;
        worker.postMessage({ op: 'initialized' });
        break;

      case 'subscribe':
        currentSymbol = data.symbol;
        enabledExchanges = data.exchanges;
        break;

      case 'unsubscribe':
        enabledExchanges = enabledExchanges.filter(ex => !data.exchanges.includes(ex));
        // Clear data for unsubscribed exchanges
        data.exchanges.forEach((exchange: string) => {
          delete exchangeData[exchange];
        });
        // Emit updated orderbook after unsubscribing
        const aggregatedData = aggregateOrderBookData();
        worker.postMessage({
          op: 'orderBook',
          data: aggregatedData
        });
        break;

      case 'updateOrderBook':
        if (data.exchange && data.data) {
          processOrderBookData(data.data, data.exchange);
        }
        break;

      case 'exchangeDisconnected':
        if (data.exchange) {
          // Remove exchange from enabled exchanges
          enabledExchanges = enabledExchanges.filter(ex => ex !== data.exchange);
          // Clear exchange data
          delete exchangeData[data.exchange];
          // Emit updated orderbook after disconnection
          const aggregatedData = aggregateOrderBookData();
          worker.postMessage({
            op: 'orderBook',
            data: aggregatedData
          });
        }
        break;

      default:
        console.warn('Unknown operation:', op);
    }
  } catch (error) {
    console.error('Worker error:', error);
    worker.postMessage({
      op: 'error',
      data: {
        message: `Worker error: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
};

// Handle uncaught errors
self.onerror = (error) => {
  console.error('Uncaught worker error:', error);
  worker.postMessage({
    op: 'error',
    data: {
      message: 'Uncaught worker error',
      details: error
    }
  });
  return true; // Prevent the error from propagating
};

// Handle unhandled rejections
self.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  worker.postMessage({
    op: 'error',
    data: {
      message: 'Unhandled promise rejection',
      details: event.reason
    }
  });
};

export {};
