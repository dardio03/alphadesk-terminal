import BasicWsExchange from "./BasicWsExchange";
export default class AggrExchange extends BasicWsExchange {
  constructor() {
    super('wss://sentiment.aggr.trade');
  }
}

