import BasicWsExchange from "./BasicWsExchange";
export default class BitgetExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.bitget.com/spot/v1/stream');
  }
}

