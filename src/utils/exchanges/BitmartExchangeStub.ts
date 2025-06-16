import BasicWsExchange from "./BasicWsExchange";
export default class BitmartExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://openapi-ws-v2.bitmart.com/api?protocol=1.1');
  }
}

