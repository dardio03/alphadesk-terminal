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
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const BACKOFF_FACTOR = 1.5;
const MAX_RETRIES = 10;

export const useWebSocket = ({
  url,
  onMessage,
  onError,
  onConnected,
  onDisconnected
}: UseWebSocketProps): UseWebSocketResult => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
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
      if (now - lastMessageTime.current > 30000) { // 30 seconds without messages
        console.warn('No messages received for 30 seconds, reconnecting...');
        resetConnection();
        connect();
      }
    }, 5000); // Check every 5 seconds
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
        console.log('WebSocket connected');
        setConnectionState('connected');
        retryCount.current = 0;
        retryDelay.current = INITIAL_RETRY_DELAY;
        lastMessageTime.current = Date.now();
        startHeartbeat();
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
        console.error('WebSocket error:', error);
        setConnectionState('error');
        onError?.(`WebSocket error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionState('disconnected');
        clearTimeouts();
        onDisconnected?.();

        if (!isManualClose.current && event.code !== 1000) { // Not a normal closure
          if (retryCount.current < MAX_RETRIES) {
            const delay = Math.min(retryDelay.current * BACKOFF_FACTOR, MAX_RETRY_DELAY);
            console.log(`Reconnecting in ${delay}ms (attempt ${retryCount.current + 1}/${MAX_RETRIES})`);
            
            reconnectTimeout.current = setTimeout(() => {
              retryCount.current++;
              retryDelay.current = delay;
              connect();
            }, delay);
          } else {
            console.error('Max reconnection attempts reached');
            onError?.('Max reconnection attempts reached. Please check your connection and try again.');
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
    reconnect
  };
};

export default useWebSocket;