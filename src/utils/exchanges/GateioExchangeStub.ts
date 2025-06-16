import BasicWsExchange from "./BasicWsExchange";
export default class GateioExchangeStub extends BasicWsExchange {
  constructor() {
    super('wss://ws.gate.io/v3/');
  }
}

