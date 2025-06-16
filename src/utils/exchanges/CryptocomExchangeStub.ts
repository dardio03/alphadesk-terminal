import BasicWsExchange from "./BasicWsExchange";
export default class CryptocomExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://stream.crypto.com/v2/market');
  }
}

