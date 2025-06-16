import BasicWsExchange from "./BasicWsExchange";
export default class KucoinExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws-api.kucoin.com/endpoint');
  }
}

