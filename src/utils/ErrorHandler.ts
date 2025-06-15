import { ConnectionState } from '../types/exchange';

export type ErrorCategory = 'unknown' | 'connection' | 'api' | 'parsing' | 'subscription' | 'network' | 'rateLimit' | 'data';

export interface ErrorContext {
  exchangeId: string;
  symbol?: string;
  originalError: Error | string;
  category: ErrorCategory;
  timestamp: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCallbacks: ((context: ErrorContext) => void)[] = [];
  private reconnectCallbacks: ((exchangeId: string) => void)[] = [];
  private backoffTimes: Map<string, number> = new Map();
  private readonly MAX_BACKOFF = 30000; // 30 seconds
  private readonly INITIAL_BACKOFF = 1000; // 1 second

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(context: ErrorContext): void {
    const formattedError = this.formatError(context);
    console.error(`[${context.exchangeId}] ${formattedError}`);

    // Notify all error callbacks
    this.errorCallbacks.forEach(callback => callback(context));

    // Handle reconnection based on error category
    if (this.shouldAttemptReconnect(context)) {
      this.scheduleReconnect(context.exchangeId);
    }
  }

  private formatError(context: ErrorContext): string {
    const errorMessage = typeof context.originalError === 'string' 
      ? context.originalError 
      : context.originalError.message;

    return `[${context.category.toUpperCase()}] ${errorMessage}`;
  }

  private shouldAttemptReconnect(context: ErrorContext): boolean {
    switch (context.category) {
      case 'network':
      case 'api':
        return true;
      case 'rateLimit':
        return true; // But with longer backoff
      case 'data':
        return false; // Don't reconnect for data parsing errors
      default:
        return false;
    }
  }

  private scheduleReconnect(exchangeId: string): void {
    const currentBackoff = this.backoffTimes.get(exchangeId) || this.INITIAL_BACKOFF;
    const nextBackoff = Math.min(currentBackoff * 2, this.MAX_BACKOFF);
    
    this.backoffTimes.set(exchangeId, nextBackoff);

    setTimeout(() => {
      this.reconnectCallbacks.forEach(callback => callback(exchangeId));
    }, currentBackoff);
  }

  onError(callback: (context: ErrorContext) => void): void {
    this.errorCallbacks.push(callback);
  }

  onReconnect(callback: (exchangeId: string) => void): void {
    this.reconnectCallbacks.push(callback);
  }

  resetBackoff(exchangeId: string): void {
    this.backoffTimes.delete(exchangeId);
  }
} 