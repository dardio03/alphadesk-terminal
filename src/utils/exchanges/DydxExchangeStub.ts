import BasicWsExchange from "./BasicWsExchange";
export default class DydxExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://api.dydx.exchange/v3/ws');
  }
}

