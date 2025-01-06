import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionState, WebSocketMessage } from '../types/exchange';

interface UseWebSocketProps {
  url: string;
  onMessage: (data: WebSocketMessage) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseWebSocketResult {
  connectionState: ConnectionState;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  error: string | null;
}

const INITIAL_RETRY_DELAY = 3000;  // Increased initial delay
const MAX_RETRY_DELAY = 30000;
const BACKOFF_FACTOR = 2;      // More aggressive backoff
const MAX_RETRIES = 5;         // Fewer retries

export const useWebSocket = ({
  url,
  onMessage,
  onError,
  onConnected,
  onDisconnected
}: UseWebSocketProps): UseWebSocketResult => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef<number>(0);
  const retryDelay = useRef<number>(INITIAL_RETRY_DELAY);
  const isManualClose = useRef<boolean>(false);
  const lastMessageTime = useRef<number>(Date.now());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  const resetConnection = useCallback(() => {
    clearTimeouts();
    if (ws.current) {
      isManualClose.current = true;
      ws.current.close();
      ws.current = null;
    }
    retryCount.current = 0;
    retryDelay.current = INITIAL_RETRY_DELAY;
  }, [clearTimeouts]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    heartbeatInterval.current = setInterval(() => {
      const now = Date.now();
      if (now - lastMessageTime.current > 10000) { // 10 seconds without messages
        console.warn('No messages received for 10 seconds from:', url);
        
        // Try to send a ping before reconnecting
        try {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
            lastMessageTime.current = now;
          } else {
            console.warn('WebSocket not open, reconnecting...');
            resetConnection();
            connect();
          }
        } catch (err) {
          console.error('Failed to send ping, reconnecting...', err);
          resetConnection();
          connect();
        }
      }
    }, 3000); // Check every 3 seconds
  }, []);

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        return;
      }

      clearTimeouts();
      setConnectionState('connecting');
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected to:', url);
        setConnectionState('connected');
        retryCount.current = 0;
        retryDelay.current = INITIAL_RETRY_DELAY;
        lastMessageTime.current = Date.now();
        startHeartbeat();
        
        // Send a ping immediately after connection
        try {
          ws.current?.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.warn('Failed to send initial ping:', err);
        }
        
        onConnected?.();
      };

      ws.current.onmessage = (event) => {
        try {
          lastMessageTime.current = Date.now();
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.warn('Failed to parse message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error for:', url, error);
        setConnectionState('error');
        // Don't call onError here as it will be called in onclose
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected from:', url, 'Code:', event.code, 'Reason:', event.reason);
        setConnectionState('disconnected');
        clearTimeouts();
        onDisconnected?.();

        // Handle different close codes
        if (!isManualClose.current) {
          let errorMessage = 'Connection closed';
          switch (event.code) {
            case 1000:
              // Normal closure, no retry needed
              return;
            case 1006:
              errorMessage = 'Connection lost unexpectedly';
              break;
            case 1008:
              errorMessage = 'Invalid message format';
              break;
            case 1011:
              errorMessage = 'Internal server error';
              break;
            default:
              errorMessage = `Connection closed (code: ${event.code})`;
          }

          onError?.(errorMessage);

          if (retryCount.current < MAX_RETRIES) {
            const delay = Math.min(retryDelay.current * BACKOFF_FACTOR, MAX_RETRY_DELAY);
            console.log(`Reconnecting to ${url} in ${delay}ms (attempt ${retryCount.current + 1}/${MAX_RETRIES})`);
            
            reconnectTimeout.current = setTimeout(() => {
              retryCount.current++;
              retryDelay.current = delay;
              connect();
            }, delay);
          } else {
            console.error(`Max reconnection attempts (${MAX_RETRIES}) reached for:`, url);
            onError?.('Max reconnection attempts reached. Please try again later.');
          }
        }
        isManualClose.current = false;
      };
    } catch (error) {
      setConnectionState('error');
      onError?.(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [url, onMessage, onError, onConnected, onDisconnected, startHeartbeat, clearTimeouts]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
        onError?.('Failed to send message');
      }
    } else {
      console.warn('WebSocket is not connected, attempting to reconnect...');
      connect();
    }
  }, [connect, onError]);

  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    resetConnection();
    connect();
  }, [connect, resetConnection]);

  useEffect(() => {
    connect();
    return () => {
      isManualClose.current = true;
      resetConnection();
    };
  }, [connect, resetConnection]);

  return {
    connectionState,
    sendMessage,
    reconnect,
    error
  };
};

export default useWebSocket;