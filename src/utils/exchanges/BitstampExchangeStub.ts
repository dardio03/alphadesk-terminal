import BasicWsExchange from "./BasicWsExchange";
export default class BitstampExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.bitstamp.net/');
  }
}

