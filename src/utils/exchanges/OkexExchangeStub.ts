import BasicWsExchange from "./BasicWsExchange";
export default class OkexExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.okx.com:8443/ws/v5/public');
  }
}

