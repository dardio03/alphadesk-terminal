import ExchangeFactory from '../ExchangeService';

function createExchange(name: string) {
  const existing = ExchangeFactory.getExchange(name);
  const Cls = (existing as any).constructor;
  return new Cls();
}

function expectedEntry(price: number, qty: number, name: string, withTotal = false) {
  const entry: any = {
    price,
    quantity: qty,
    exchanges: [name],
    exchangeQuantities: { [name]: qty }
  };
  if (withTotal) entry.totalQuantity = qty;
  return entry;
}

describe('Exchange message parsing', () => {
  const cases: Record<string, any> = {
    BINANCE: {
      order: { bids: [['100', '0.5']], asks: [['101', '0.3']] },
      trade: { e: 'trade' },
      ticker: { e: '24hrTicker' },
      total: true
    },
    BYBIT: {
      order: { topic: 'orderbook.50.BTCUSDT', data: { b: [['100', '0.5']], a: [['101', '0.3']] }, ts: 1 },
      trade: { topic: 'trade.BTCUSDT' },
      ticker: { topic: 'ticker.BTCUSDT' },
      total: true
    },
    COINBASE: {
      order: { type: 'snapshot', product_id: 'BTCUSDT', bids: [['100', '0.5']], asks: [['101', '0.3']] },
      trade: { type: 'match' },
      ticker: { type: 'ticker' },
      total: false
    },
    KRAKEN: {
      order: [0, { bids: [['100', '0.5']], asks: [['101', '0.3']] }],
      trade: { event: 'trade' },
      ticker: { event: 'ticker' },
      total: false
    },
    PHEMEX: {
      order: { type: 'snapshot', symbol: 'BTCUSDT', book: { bids: [['100', '0.5']], asks: [['101', '0.3']] } },
      trade: { type: 'trade' },
      ticker: { type: 'ticker' },
      total: false
    },
    POLONIEX: {
      order: { channel: 'book', data: { bids: [['100', '0.5']], asks: [['101', '0.3']] } },
      trade: { channel: 'trades' },
      ticker: { channel: 'ticker' },
      total: true
    },
    HITBTC: {
      order: { method: 'snapshot', params: { data: { bid: [['100', '0.5']], ask: [['101', '0.3']] } } },
      trade: { method: 'update', params: { data: {} } },
      ticker: { method: 'ticker' },
      total: false
    },
    DERIBIT: {
      order: { method: 'subscription', params: { channel: 'book.BTCUSD.100ms', data: { bids: [['100', '0.5']], asks: [['101', '0.3']] } } },
      trade: { method: 'trade' },
      ticker: { method: 'ticker' },
      total: false
    },
    HUOBI: {
      order: { ch: 'market.btcusdt.depth.step0', tick: { bids: [[100, 0.5]], asks: [[101, 0.3]] } },
      trade: { ch: 'trade.btcusdt' },
      ticker: { ch: 'ticker.btcusdt' },
      total: false
    }
  };

  for (const [name, cfg] of Object.entries(cases)) {
    describe(name, () => {
      it('parses order book message', () => {
        const ex = createExchange(name);
        const cb = jest.fn();
        ex.onOrderBookUpdate(cb);
        (ex as any).processMessage(cfg.order);
        expect(cb).toHaveBeenCalledTimes(1);
        const expected = {
          bids: [expectedEntry(100, 0.5, name, cfg.total)],
          asks: [expectedEntry(101, 0.3, name, cfg.total)],
          timestamp: expect.any(Number)
        };
        expect(cb.mock.calls[0][0]).toEqual(expected);
      });

      it('ignores trade and ticker messages', () => {
        const ex = createExchange(name);
        const cb = jest.fn();
        ex.onOrderBookUpdate(cb);
        (ex as any).processMessage(cfg.trade);
        (ex as any).processMessage(cfg.ticker);
        expect(cb).not.toHaveBeenCalled();
      });
    });
  }
});
