import ExchangeFactory from '../ExchangeService';
import { OrderBookData } from '../ExchangeService';

// Stub WebSocket so the exchange doesn't try to connect
beforeAll(() => {
  (global as any).WebSocket = class {
    readyState = 1;
    constructor(_url: string) {}
    close() {}
    send(_msg: any) {}
    addEventListener() {}
    removeEventListener() {}
  };
});

describe('BinanceExchange.processMessage', () => {
  function createExchange() {
    const existing = ExchangeFactory.getExchange('BINANCE');
    const Cls = (existing as any).constructor;
    return new Cls();
  }

  it('emits order book data for valid payload', () => {
    const ex: any = createExchange();
    const cb = jest.fn();
    ex.onOrderBookUpdate(cb);

    const msg = {
      bids: [['100', '0.5']],
      asks: [['101', '0.3']]
    };

    ex.processMessage(msg);
    expect(cb).toHaveBeenCalledTimes(1);
    const data: OrderBookData = cb.mock.calls[0][0];
    expect(data.bids[0].price).toBe(100);
    expect(data.bids[0].quantity).toBe(0.5);
    expect(data.asks[0].price).toBe(101);
    expect(data.asks[0].quantity).toBe(0.3);
  });

  it('handles malformed payloads gracefully', () => {
    const ex: any = createExchange();
    const updateCb = jest.fn();
    const errorCb = jest.fn();
    ex.onOrderBookUpdate(updateCb);
    ex.onError(errorCb);

    const bad = {
      bids: [['100', 'bad']],
      asks: [['101', '0.3']]
    };

    ex.processMessage(bad);
    expect(updateCb).not.toHaveBeenCalled();
    expect(errorCb).toHaveBeenCalled();
  });
});
