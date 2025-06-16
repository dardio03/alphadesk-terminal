import { AggregatorService } from '../aggregatorService';
import { OrderBookData } from '../../utils/ExchangeService';

// Stub Worker to prevent actual worker creation
beforeAll(() => {
  (global as any).Worker = class {
    onmessage: ((ev: any) => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    postMessage(_msg: any) {}
    terminate() {}
  } as any;
});

describe('AggregatorService aggregation', () => {
  it('combines bids and asks from multiple exchanges', () => {
    const service = new AggregatorService();
    const updates: OrderBookData[] = [];
    service.on('orderBook', data => updates.push(data));

    const ex1: OrderBookData = {
      bids: [{ price: 100, quantity: 1, exchanges: ['EX1'], exchangeQuantities: { EX1: 1 }, totalQuantity: 1 }],
      asks: [{ price: 101, quantity: 2, exchanges: ['EX1'], exchangeQuantities: { EX1: 2 }, totalQuantity: 2 }],
      timestamp: Date.now()
    };
    const ex2: OrderBookData = {
      bids: [
        { price: 100, quantity: 0.5, exchanges: ['EX2'], exchangeQuantities: { EX2: 0.5 }, totalQuantity: 0.5 },
        { price: 99, quantity: 1, exchanges: ['EX2'], exchangeQuantities: { EX2: 1 }, totalQuantity: 1 }
      ],
      asks: [{ price: 101, quantity: 1, exchanges: ['EX2'], exchangeQuantities: { EX2: 1 }, totalQuantity: 1 }],
      timestamp: Date.now()
    };

    // Feed updates directly using the private method
    (service as any).handleUpdate('EX1', ex1);
    (service as any).handleUpdate('EX2', ex2);

    expect(updates.length).toBe(2);
    const aggregated = updates[1];

    expect(aggregated.bids).toEqual([
      {
        price: 100,
        quantity: 1.5,
        exchanges: ['EX1', 'EX2'],
        exchangeQuantities: { EX1: 1, EX2: 0.5 },
        totalQuantity: 1.5
      },
      {
        price: 99,
        quantity: 1,
        exchanges: ['EX2'],
        exchangeQuantities: { EX2: 1 },
        totalQuantity: 1
      }
    ]);

    expect(aggregated.asks).toEqual([
      {
        price: 101,
        quantity: 3,
        exchanges: ['EX1', 'EX2'],
        exchangeQuantities: { EX1: 2, EX2: 1 },
        totalQuantity: 3
      }
    ]);
  });
});
