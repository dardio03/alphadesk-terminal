/* eslint-disable no-restricted-globals */
const worker = self as unknown as Worker;

interface OrderData {
  price: number;
  quantity: number;
}

interface OrderBookData {
  bids: OrderData[];
  asks: OrderData[];
}

interface ExchangeData {
  [key: string]: OrderBookData;
}

let exchangeData: ExchangeData = {
  BINANCE: { bids: [], asks: [] },
  BYBIT: { bids: [], asks: [] },
  COINBASE: { bids: [], asks: [] }
};

let currentSymbol = 'BTCUSDT';
let enabledExchanges = ['BINANCE'];

const processOrderBookData = (data: any, exchange: string) => {
  try {
    const bids = Array.isArray(data.bids) ? data.bids.map((bid: any) => ({
      price: parseFloat(bid[0]),
      quantity: parseFloat(bid[1])
    })) : [];

    const asks = Array.isArray(data.asks) ? data.asks.map((ask: any) => ({
      price: parseFloat(ask[0]),
      quantity: parseFloat(ask[1])
    })) : [];

    exchangeData[exchange] = { bids, asks };

    worker.postMessage({
      type: 'ORDER_BOOK_UPDATE',
      payload: {
        exchange,
        data: { bids, asks }
      }
    });
  } catch (error) {
    worker.postMessage({
      type: 'ERROR',
      payload: {
        message: `Error processing ${exchange} order book data: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
};

worker.onmessage = (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT':
        currentSymbol = payload.symbol;
        enabledExchanges = payload.exchanges;
        break;

      case 'UPDATE_SYMBOL':
        currentSymbol = payload.symbol;
        break;

      case 'UPDATE_EXCHANGES':
        enabledExchanges = payload.exchanges;
        break;

      case 'UPDATE_ORDERBOOK':
        if (payload.exchange && payload.data) {
          processOrderBookData(payload.data, payload.exchange);
        }
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    worker.postMessage({
      type: 'ERROR',
      payload: {
        message: `Worker error: ${error instanceof Error ? error.message : String(error)}`
      }
    });
  }
};

export {};