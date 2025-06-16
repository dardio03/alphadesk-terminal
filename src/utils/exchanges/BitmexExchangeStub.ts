import BasicWsExchange from "./BasicWsExchange";
export default class BitmexExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://www.bitmex.com/realtime');
  }
}

