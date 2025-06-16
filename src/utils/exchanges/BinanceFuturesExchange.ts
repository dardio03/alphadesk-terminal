import BasicWsExchange from "./BasicWsExchange";
export default class BinanceFuturesExchange extends BasicWsExchange {
  constructor() {
    super('wss://fstream.binance.com/ws');
  }
}

