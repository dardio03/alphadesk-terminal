import BitfinexExchange from '../exchanges/bitfinex';
import { OrderBookData } from '../ExchangeService';

describe('BitfinexExchange processMessage', () => {
  it('converts snapshot message to OrderBookData', () => {
    const ex = new BitfinexExchange();
    const payload = [1, [[10000, 1, 2], [10010, 1, -3]]];
    let book: OrderBookData | null = null;
    ex.onOrderBookUpdate(data => (book = data));
    (ex as any).processMessage(payload);
    expect(book).toEqual({
      bids: [
        { price: 10000, quantity: 2, exchanges: ['BITFINEX'], exchangeQuantities: { BITFINEX: 2 } }
      ],
      asks: [
        { price: 10010, quantity: 3, exchanges: ['BITFINEX'], exchangeQuantities: { BITFINEX: 3 } }
      ],
      timestamp: expect.any(Number)
    });
  });
});
