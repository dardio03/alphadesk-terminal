import BasicWsExchange from "./BasicWsExchange";
export default class BitunixExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://fapi.bitunix.com/public/');
  }
}

