import { ErrorHandler, ErrorContext, ErrorCategory } from '../ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let errorCallback: jest.Mock;
  let reconnectCallback: jest.Mock;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorCallback = jest.fn();
    reconnectCallback = jest.fn();
    errorHandler.onError(errorCallback);
    errorHandler.onReconnect(reconnectCallback);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle network errors and trigger reconnection', () => {
    const context: ErrorContext = {
      exchangeId: 'BINANCE',
      symbol: 'BTCUSDT',
      originalError: 'Connection lost',
      category: 'network',
      timestamp: Date.now()
    };

    errorHandler.handleError(context);

    expect(errorCallback).toHaveBeenCalledWith(context);
    expect(reconnectCallback).toHaveBeenCalledWith('BINANCE');
  });

  it('should handle rate limit errors with longer backoff', () => {
    const context: ErrorContext = {
      exchangeId: 'BINANCE',
      originalError: 'Rate limit exceeded',
      category: 'rateLimit',
      timestamp: Date.now()
    };

    errorHandler.handleError(context);
    expect(errorCallback).toHaveBeenCalledWith(context);
    expect(reconnectCallback).toHaveBeenCalledWith('BINANCE');
  });

  it('should not trigger reconnection for data parsing errors', () => {
    const context: ErrorContext = {
      exchangeId: 'BINANCE',
      originalError: 'Invalid JSON',
      category: 'data',
      timestamp: Date.now()
    };

    errorHandler.handleError(context);
    expect(errorCallback).toHaveBeenCalledWith(context);
    expect(reconnectCallback).not.toHaveBeenCalled();
  });

  it('should implement exponential backoff for reconnection attempts', () => {
    const exchangeId = 'BINANCE';
    
    // First error
    errorHandler.handleError({
      exchangeId,
      originalError: 'Connection lost',
      category: 'network',
      timestamp: Date.now()
    });

    expect(reconnectCallback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000); // Initial backoff

    // Second error
    errorHandler.handleError({
      exchangeId,
      originalError: 'Connection lost again',
      category: 'network',
      timestamp: Date.now()
    });

    expect(reconnectCallback).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(2000); // Double backoff

    // Third error
    errorHandler.handleError({
      exchangeId,
      originalError: 'Connection lost third time',
      category: 'network',
      timestamp: Date.now()
    });

    expect(reconnectCallback).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(4000); // Double backoff again
  });

  it('should reset backoff on successful connection', () => {
    const exchangeId = 'BINANCE';
    
    // Trigger an error
    errorHandler.handleError({
      exchangeId,
      originalError: 'Connection lost',
      category: 'network',
      timestamp: Date.now()
    });

    // Reset backoff
    errorHandler.resetBackoff(exchangeId);

    // Next error should use initial backoff
    errorHandler.handleError({
      exchangeId,
      originalError: 'Connection lost again',
      category: 'network',
      timestamp: Date.now()
    });

    expect(reconnectCallback).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1000); // Should be back to initial backoff
  });
}); 