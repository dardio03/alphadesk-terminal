export const EXCHANGES = [
  'BINANCE',
  'BINANCE_FUTURES',
  'BINANCE_US',
  'BITFINEX',
  'BITGET',
  'BITMART',
  'BITMEX',
  'BITSTAMP',
  'BITUNIX',
  'BYBIT',
  'COINBASE',
  'CRYPTOCOM',
  'DERIBIT',
  'DYDX',
  'GATEIO',
  'HITBTC',
  'HUOBI',
  'KRAKEN',
  'KUCOIN',
  'MEXC',
  'OKEX',
  'PHEMEX',
  'POLONIEX'
] as const;

export type ExchangeKey = typeof EXCHANGES[number];
