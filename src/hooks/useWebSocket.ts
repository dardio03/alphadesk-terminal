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
}

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
  const maxRetries = 5;
  const retryCount = useRef<number>(0);

  const connect = useCallback(() => {
    try {
      setConnectionState('connecting');
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnectionState('connected');
        retryCount.current = 0;
        onConnected?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          onError?.(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      ws.current.onerror = (error) => {
        setConnectionState('error');
        onError?.(`WebSocket error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        ws.current?.close();
      };

      ws.current.onclose = (event) => {
        setConnectionState('disconnected');
        onDisconnected?.();
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        
        if (retryCount.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current += 1;
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          onError?.('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      setConnectionState('error');
      onError?.(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [url, onMessage, onError, onConnected, onDisconnected]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      onError?.('WebSocket is not connected');
    }
  }, [onError]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  return {
    connectionState,
    sendMessage
  };
};

export default useWebSocket;