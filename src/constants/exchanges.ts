export const EXCHANGES = [
  'binance',
  'binance_futures',
  'binance_us',
  'bitfinex',
  'bitget',
  'bitmart',
  'bitmex',
  'bitstamp',
  'bitunix',
  'bybit',
  'coinbase',
  'cryptocom',
  'deribit',
  'dydx',
  'gateio',
  'hitbtc',
  'huobi',
  'kraken',
  'kucoin',
  'mexc',
  'okex',
  'phemex',
  'poloniex',
  'uniswap'
] as const;

export type ExchangeKey = typeof EXCHANGES[number];
