import { BaseExchange, TradeData, TickerData } from '../ExchangeService';

class TestExchange extends BaseExchange {
  async connect(): Promise<void> { return; }
  disconnect(): void {}
  subscribe(symbol: string): void {}
  unsubscribe(symbol: string): void {}
  public emitTrade(trade: TradeData) { this.notifyTradeUpdate(trade); }
  public emitTicker(ticker: TickerData) { this.notifyTickerUpdate(ticker); }
}

describe('BaseExchange callbacks', () => {
  it('should fire trade and ticker callbacks', () => {
    const ex = new TestExchange();
    const tradeCb = jest.fn();
    const tickerCb = jest.fn();
    ex.onTradeUpdate(tradeCb);
    ex.onTickerUpdate(tickerCb);
    const trade: TradeData = { price: 1, size: 2, side: 'buy', timestamp: 1 };
    const ticker: TickerData = { price: 1, volume: 3, volumeDelta: 1, timestamp: 1 };
    ex.emitTrade(trade);
    ex.emitTicker(ticker);
    expect(tradeCb).toHaveBeenCalledWith(trade);
    expect(tickerCb).toHaveBeenCalledWith(ticker);
  });
});
