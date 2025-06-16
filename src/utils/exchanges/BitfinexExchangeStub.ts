import BasicWsExchange from "./BasicWsExchange";
export default class BitfinexExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://api-pub.bitfinex.com/ws/2');
  }
}

