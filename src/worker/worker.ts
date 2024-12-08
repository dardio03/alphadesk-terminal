import { AggregatorPayload } from '@/types/types'
import { exchanges } from './exchanges/index';
import Aggregator from './aggregator.ts'

let activeSymbol: string | null = null;
let activeExchanges: string[] = [];

// eslint-disable-next-line no-restricted-globals
const aggregator = new Aggregator(self as any)

// eslint-disable-next-line no-restricted-globals
addEventListener('message', (event: any) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      activeSymbol = payload.symbol;
      activeExchanges = payload.exchanges;
      initializeExchanges();
      break;
    case 'UPDATE_EXCHANGES':
      activeExchanges = payload.exchanges;
      updateExchangeSubscriptions();
      break;
    case 'UPDATE_SYMBOL':
      activeSymbol = payload.symbol;
      updateSymbol();
      break;
    default:
      const aggregatorPayload = event.data as AggregatorPayload
      if (typeof aggregator[aggregatorPayload.op] === 'function') {
        aggregator[aggregatorPayload.op](aggregatorPayload.data, aggregatorPayload.trackingId)
      }
  }
})

function initializeExchanges() {
  exchanges.forEach(exchange => {
    if (activeExchanges.includes(exchange.id)) {
      subscribeToExchange(exchange);
    }
  });
}

function subscribeToExchange(exchange: any) {
  exchange.on('orderbook', (data: any) => {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      type: 'ORDER_BOOK_UPDATE',
      payload: {
        exchange: exchange.id,
        data: data
      }
    });
  });

  exchange.on('error', (error: Error) => {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      type: 'ERROR',
      payload: {
        exchange: exchange.id,
        message: error.message
      }
    });
  });

  exchange.subscribe(activeSymbol);
}

function unsubscribeFromExchange(exchange: any) {
  exchange.unsubscribe(activeSymbol);
}

function updateExchangeSubscriptions() {
  exchanges.forEach(exchange => {
    if (activeExchanges.includes(exchange.id)) {
      subscribeToExchange(exchange);
    } else {
      unsubscribeFromExchange(exchange);
    }
  });
}

function updateSymbol() {
  exchanges.forEach(exchange => {
    if (activeExchanges.includes(exchange.id)) {
      unsubscribeFromExchange(exchange);
      subscribeToExchange(exchange);
    }
  });
}
