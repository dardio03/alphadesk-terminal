"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// WebSocket connection to the main application
const wsUrl = process.env.WS_URL || 'ws://localhost:8080';
let ws = null;
function connectWebSocket() {
    ws = new ws_1.WebSocket(wsUrl);
    ws.on('open', () => {
        console.log('Connected to main application WebSocket');
    });
    ws.on('close', () => {
        console.log('Disconnected from main application WebSocket');
        setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}
connectWebSocket();
// Webhook endpoints for different exchanges
app.post('/webhooks/:exchange', async (req, res) => {
    const { exchange } = req.params;
    const payload = req.body;
    console.log(`Received webhook from ${exchange}:`, payload);
    if (!ws || ws.readyState !== ws_1.WebSocket.OPEN) {
        return res.status(503).json({ error: 'WebSocket connection not available' });
    }
    try {
        // Format the webhook data to match the exchange format
        const formattedData = formatWebhookData(exchange, payload);
        if (formattedData) {
            ws.send(JSON.stringify({
                type: 'webhook',
                exchange,
                data: formattedData
            }));
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(`Error processing webhook for ${exchange}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
function formatWebhookData(exchange, data) {
    // Format webhook data based on the exchange
    switch (exchange.toLowerCase()) {
        case 'binance':
            return {
                exchange: 'BINANCE',
                pair: data.symbol?.toLowerCase(),
                timestamp: data.E || Date.now(),
                price: parseFloat(data.p || data.price || '0'),
                size: parseFloat(data.q || data.quantity || '0'),
                side: data.side?.toLowerCase() || 'buy'
            };
        case 'coinbase':
            return {
                exchange: 'COINBASE',
                pair: data.product_id?.toLowerCase(),
                timestamp: new Date(data.time).getTime(),
                price: parseFloat(data.price || '0'),
                size: parseFloat(data.size || '0'),
                side: data.side?.toLowerCase() || 'buy'
            };
        // Add more exchange formats as needed
        default:
            console.warn(`No formatter available for exchange: ${exchange}`);
            return null;
    }
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.listen(port, () => {
    console.log(`Webhook server listening at http://localhost:${port}`);
});
