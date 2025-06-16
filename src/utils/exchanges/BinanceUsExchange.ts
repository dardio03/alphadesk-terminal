import BasicWsExchange from "./BasicWsExchange";
export default class BinanceUsExchange extends BasicWsExchange {
  constructor() {
    super('wss://stream.binance.us:9443/ws');
  }
}

