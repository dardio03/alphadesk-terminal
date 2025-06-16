
export interface ExchangeConnection {
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): void;
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'error';
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  onOrderBookUpdate(callback: (data: OrderBookData) => void): void;
  onTradeUpdate?(callback: (trade: TradeData) => void): void;
  onTickerUpdate?(callback: (ticker: TickerData) => void): void;
  onError(callback: (error: Error) => void): void;
  getOrderBookData(): OrderBookData | null;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  subscribeTrades?(symbol: string): void;
  subscribeTicker?(symbol: string): void;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  exchanges?: string[];
  exchangeQuantities?: Record<string, number>;
  totalQuantity?: number;
}

export interface TradeData {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface TickerData {
  price: number;
  volume?: number;
  volumeDelta?: number;
  timestamp: number;
}

import { connectionManager } from './ConnectionManager';
import { BaseExchange } from './exchanges/BaseExchange';
import BasicWsExchange from './exchanges/BasicWsExchange';
import BinanceExchange from './exchanges/BinanceExchange';
import BybitExchange from './exchanges/BybitExchange';
import CoinbaseExchange from './exchanges/CoinbaseExchange';
import KrakenExchange from './exchanges/KrakenExchange';
import PhemexExchange from './exchanges/PhemexExchange';
import PoloniexExchange from './exchanges/PoloniexExchange';
import HitbtcExchange from './exchanges/HitbtcExchange';
import AggrExchange from './exchanges/AggrExchange';
import BinanceFuturesExchange from './exchanges/BinanceFuturesExchange';
import BinanceUsExchange from './exchanges/BinanceUsExchange';
import BitfinexExchangeStub from './exchanges/BitfinexExchangeStub';
import BitgetExchangeStub from './exchanges/BitgetExchangeStub';
import BitmartExchangeStub from './exchanges/BitmartExchangeStub';
import BitmexExchangeStub from './exchanges/BitmexExchangeStub';
import BitstampExchangeStub from './exchanges/BitstampExchangeStub';
import BitunixExchangeStub from './exchanges/BitunixExchangeStub';
import CryptocomExchangeStub from './exchanges/CryptocomExchangeStub';
import DeribitExchangeStub from './exchanges/DeribitExchangeStub';
import DydxExchangeStub from './exchanges/DydxExchangeStub';
import GateioExchangeStub from './exchanges/GateioExchangeStub';
import HuobiExchangeStub from './exchanges/HuobiExchangeStub';
import KucoinExchangeStub from './exchanges/KucoinExchangeStub';
import MexcExchangeStub from './exchanges/MexcExchangeStub';
import OkexExchangeStub from './exchanges/OkexExchangeStub';
import UniswapExchangeStub from './exchanges/UniswapExchangeStub';

export class ExchangeFactory {
  private static exchanges: { [key: string]: ExchangeConnection } = {};

  static registerExchange(name: string, exchange: ExchangeConnection) {
    this.exchanges[name] = exchange;
    connectionManager.addConnection(name, exchange);
  }

  static getExchange(name: string): ExchangeConnection {
    const exchange = this.exchanges[name];
    if (!exchange) {
      // Create and register the exchange if it doesn't exist
      const newExchange = this.createExchange(name, {});
      this.registerExchange(name, newExchange);
      return newExchange;
    }
    return exchange;
  }

  static getAllExchanges(): { [key: string]: ExchangeConnection } {
    return this.exchanges;
  }

  static createExchange(name: string, config: any): ExchangeConnection {
    const exchangeName = name.toUpperCase();
    let exchange: ExchangeConnection;

    switch (exchangeName) {
      case 'BINANCE':
        exchange = new BinanceExchange(config);
        break;
      case 'BYBIT':
        exchange = new BybitExchange(config);
        break;
      case 'AGGR':
        exchange = new AggrExchange();
        break;
      case 'BINANCE_FUTURES':
        exchange = new BinanceFuturesExchange();
        break;
      case 'BINANCE_US':
        exchange = new BinanceUsExchange();
        break;
      case 'COINBASE':
        exchange = new CoinbaseExchange(config);
        break;
      case 'BITFINEX':
        exchange = new BitfinexExchangeStub();
        break;
      case 'BITGET':
        exchange = new BitgetExchangeStub();
        break;
      case 'BITMART':
        exchange = new BitmartExchangeStub();
        break;
      case 'BITMEX':
        exchange = new BitmexExchangeStub();
        break;
      case 'BITSTAMP':
        exchange = new BitstampExchangeStub();
        break;
      case 'BITUNIX':
        exchange = new BitunixExchangeStub();
        break;
      case 'KRAKEN':
        exchange = new KrakenExchange(config);
        break;
      case 'CRYPTOCOM':
        exchange = new CryptocomExchangeStub();
        break;
      case 'DERIBIT':
        exchange = new DeribitExchangeStub(config);
        break;
      case 'DYDX':
        exchange = new DydxExchangeStub();
        break;
      case 'GATEIO':
        exchange = new GateioExchangeStub();
        break;
      case 'HUOBI':
        exchange = new HuobiExchangeStub(config);
        break;
      case 'PHEMEX':
        exchange = new PhemexExchange(config);
        break;
      case 'KUCOIN':
        exchange = new KucoinExchangeStub();
        break;
      case 'MEXC':
        exchange = new MexcExchangeStub();
        break;
      case 'OKEX':
        exchange = new OkexExchangeStub();
        break;
      case 'POLONIEX':
        exchange = new PoloniexExchange(config);
        break;
      case 'UNISWAP':
        exchange = new UniswapExchangeStub();
        break;
      case 'HITBTC':
        exchange = new HitbtcExchange(config);
        break;
      default:
        throw new Error(`Unsupported exchange: ${name}`);
    }

    // Initialize the exchange
    exchange.connect().catch(error => {
      console.error(`Failed to initialize ${name} exchange:`, error);
    });

    return exchange;
  }
}

ExchangeFactory.registerExchange('BINANCE', new BinanceExchange());
ExchangeFactory.registerExchange('BYBIT', new BybitExchange());
ExchangeFactory.registerExchange('AGGR', new AggrExchange());
ExchangeFactory.registerExchange('BINANCE_FUTURES', new BinanceFuturesExchange());
ExchangeFactory.registerExchange('BINANCE_US', new BinanceUsExchange());
ExchangeFactory.registerExchange('BITFINEX', new BitfinexExchangeStub());
ExchangeFactory.registerExchange('BITGET', new BitgetExchangeStub());
ExchangeFactory.registerExchange('BITMART', new BitmartExchangeStub());
ExchangeFactory.registerExchange('BITMEX', new BitmexExchangeStub());
ExchangeFactory.registerExchange('BITSTAMP', new BitstampExchangeStub());
ExchangeFactory.registerExchange('BITUNIX', new BitunixExchangeStub());
ExchangeFactory.registerExchange('COINBASE', new CoinbaseExchange());
ExchangeFactory.registerExchange('CRYPTOCOM', new CryptocomExchangeStub());
ExchangeFactory.registerExchange('DERIBIT', new DeribitExchangeStub());
ExchangeFactory.registerExchange('DYDX', new DydxExchangeStub());
ExchangeFactory.registerExchange('GATEIO', new GateioExchangeStub());
ExchangeFactory.registerExchange('HUOBI', new HuobiExchangeStub());
ExchangeFactory.registerExchange('KRAKEN', new KrakenExchange());
ExchangeFactory.registerExchange('KUCOIN', new KucoinExchangeStub());
ExchangeFactory.registerExchange('MEXC', new MexcExchangeStub());
ExchangeFactory.registerExchange('OKEX', new OkexExchangeStub());
ExchangeFactory.registerExchange('PHEMEX', new PhemexExchange());
ExchangeFactory.registerExchange('POLONIEX', new PoloniexExchange());
ExchangeFactory.registerExchange('UNISWAP', new UniswapExchangeStub());
ExchangeFactory.registerExchange('HITBTC', new HitbtcExchange());

export default ExchangeFactory;
export { BaseExchange, BasicWsExchange };
