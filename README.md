# AlphaDesk Terminal

A professional-grade cryptocurrency trading terminal built with React and TypeScript, featuring real-time order book data, live price tracking, and advanced charting capabilities.

## Features

- **Real-time Order Book**: Multi-exchange order book aggregation with live updates
- **Live Price Tracking**: Real-time price updates from multiple exchanges
- **Advanced Charting**: TradingView chart integration with customizable indicators
- **Price Range Analysis**: Visual representation of price ranges and market depth
- **Responsive Layout**: Draggable and resizable widgets for customized workspace
- **Multi-Exchange Support**:
  - Bitmex
  - Binance Futures
  - Binance US
  - Kraken
  - Huobi
  - Binance
  - Bitfinex
  - Bitstamp
  - Coinbase
  - HitBTC
  - OKEx
  - Poloniex
  - Deribit
  - Bybit
  - Phemex
  - dYdX
  - Uniswap
  - KuCoin
  - Bitget
  - Bitunix
  - MEXC
  - Gate.io
  - Crypto.com
  - Bitmart
  - Exchange implementations live in [`src/aggr-worker/exchanges/`](src/aggr-worker/exchanges/). The in-app order book currently supports only the exchanges implemented in [`src/utils/ExchangeService.ts`](src/utils/ExchangeService.ts), and additional connectors are being added to provide complete coverage.

## Technology Stack

- **Frontend**:
  - React 18
  - TypeScript 5
  - React Grid Layout
  - TradingView Lightweight Charts
  - WebSocket for real-time data

- **Development**:
  - ESLint with TypeScript support
  - Jest for testing
  - React Testing Library
  - Prettier for code formatting

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/alphadesk-terminal.git
   cd alphadesk-terminal
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Build for Production

```bash
npm run build
# or
yarn build
```

## Project Structure

```
server/                # Webhook server
src/
├── aggr-worker/       # Exchange connectors
├── worker/            # Order-book aggregation web worker
├── components/        # React components
│   ├── OrderBook/     # Order book related components
│   ├── LivePrice/     # Price tracking components
│   └── Charts/        # Chart components
├── hooks/             # Custom React hooks
│   └── useWebSocket   # WebSocket connection hooks
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── services/          # API and service integrations
└── assets/            # Static assets
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run lint` - Runs ESLint
- `npm run format` - Formats code with Prettier

## WebSocket Connections

The terminal maintains WebSocket connections to many cryptocurrency exchanges.
Each exchange has a dedicated module under `src/aggr-worker/exchanges/` that specifies its WebSocket URL.
Refer to that directory for the full list of supported endpoints.
Each connection includes automatic reconnection with exponential backoff and proper error handling.

## Type Safety

The project uses TypeScript with strict type checking enabled. Key type definitions include:

- Exchange interfaces
- WebSocket message types
- Component props
- API responses
- Layout configurations

## Testing

Tests are written using Jest and React Testing Library. Run the test suite:

```bash
npm test
```

Key test areas:
- Component rendering
- WebSocket connection handling
- Order book data processing
- Price calculations
- Layout management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgments

- TradingView for charting library
- React Grid Layout for widget management
- Cryptocurrency exchanges for their WebSocket APIs
