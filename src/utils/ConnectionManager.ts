import { ExchangeConnection } from './ExchangeService';

class ConnectionManager {
  private connections: Map<string, ExchangeConnection> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelayBase = 1000; // 1 second base delay

  constructor() {
    this.setupGlobalErrorHandling();
  }

  addConnection(name: string, connection: ExchangeConnection) {
    this.connections.set(name, connection);
    this.setupConnectionHandlers(name, connection);
  }

  private setupConnectionHandlers(name: string, connection: ExchangeConnection) {
    connection.onError((error) => {
      console.error(`[${name}] Connection error:`, error);
      this.handleConnectionError(name);
    });

    connection.onOrderBookUpdate(() => {
      // Reset reconnect attempts on successful update
      this.reconnectAttempts.set(name, 0);
    });
  }

  private handleConnectionError(name: string) {
    const attempts = this.reconnectAttempts.get(name) || 0;
    if (attempts < this.maxReconnectAttempts) {
      const delay = this.calculateReconnectDelay(attempts);
      console.log(`[${name}] Attempting to reconnect in ${delay}ms...`);
      
      setTimeout(() => {
        const connection = this.connections.get(name);
        if (connection) {
          connection.reconnect();
          this.reconnectAttempts.set(name, attempts + 1);
        }
      }, delay);
    } else {
      console.error(`[${name}] Max reconnect attempts reached`);
    }
  }

  private calculateReconnectDelay(attempt: number): number {
    // Exponential backoff with jitter
    const jitter = Math.random() * 500;
    return Math.min(
      this.reconnectDelayBase * Math.pow(2, attempt) + jitter,
      30000 // Max 30 seconds
    );
  }

  private setupGlobalErrorHandling() {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.reconnectAll();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.disconnectAll();
    });
  }

  reconnectAll() {
    this.connections.forEach((connection, name) => {
      connection.reconnect();
    });
  }

  disconnectAll() {
    this.connections.forEach((connection) => {
      connection.disconnect();
    });
  }

  getConnectionStatus(name: string): string {
    const connection = this.connections.get(name);
    return connection ? connection.getStatus() : 'disconnected';
  }

  getConnection(name: string): ExchangeConnection | undefined {
    return this.connections.get(name);
  }
}

export const connectionManager = new ConnectionManager();