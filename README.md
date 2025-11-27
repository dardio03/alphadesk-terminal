# AlphaDesk Terminal

A professional cryptocurrency trading terminal application built with React and TypeScript. This application provides real-time order book data, price charts, and trading information aggregated from multiple cryptocurrency exchanges.

## Features

- **Multi-Exchange Support**: Real-time data aggregation from 20+ cryptocurrency exchanges including Binance, Coinbase, Kraken, Bybit, and more
- **Real-Time Order Book**: Live order book visualization with aggregated data from multiple exchanges
- **Interactive Charts**: TradingView integration for advanced charting capabilities
- **Responsive Layout**: Customizable drag-and-drop widget layout system
- **WebSocket Integration**: Efficient real-time data streaming using WebSocket connections
- **Error Handling**: Robust error handling and automatic reconnection mechanisms
- **Modern UI**: Built with Material-UI and styled-components for a professional dark theme

## Tech Stack

- **Frontend**: React 18, TypeScript
- **UI Libraries**: Material-UI, styled-components
- **State Management**: React Hooks, EventEmitter
- **Charts**: TradingView Widget, Lightweight Charts
- **Layout**: react-grid-layout
- **WebSocket**: Native WebSocket API with custom connection management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with WebSocket support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd alphadesk-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   └── ...             # Feature-specific components
├── services/           # Business logic and services
├── utils/              # Utility functions and helpers
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── styles/             # Theme and styling
└── aggr-worker/        # Web Worker for data aggregation
```

## Key Components

- **OrderBook**: Real-time order book visualization with multi-exchange aggregation
- **TradingViewWidget**: Advanced charting with TradingView integration
- **PriceRange**: Price range visualization with exchange comparison
- **ExchangeSettings**: Exchange selection and configuration
- **WidgetLayoutService**: Layout persistence and management

## Architecture

The application uses a modular architecture with:
- **ExchangeService**: Manages connections to various cryptocurrency exchanges
- **AggregatorService**: Aggregates data from multiple exchanges
- **ErrorHandler**: Centralized error handling and reconnection logic
- **ConnectionManager**: WebSocket connection lifecycle management

## Supported Exchanges

- Binance, Binance Futures, Binance US
- Coinbase, Kraken, Bybit
- Bitfinex, Bitget, Bitmart, Bitmex, Bitstamp
- Deribit, DYDX, Gate.io
- Huobi, Kucoin, MEXC, OKX
- Phemex, Poloniex, HitBTC
- And more...

## Development

The project uses TypeScript for type safety and follows React best practices. Code is organized into logical modules with clear separation of concerns.

## License

Private project - All rights reserved

