import BasicWsExchange from "./BasicWsExchange";
export default class MexcExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://wbs.mexc.com/ws');
  }
}

