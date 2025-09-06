'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { WebSocketConnectionStatus } from '../../services/websocket.service';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: WebSocketConnectionStatus;
  connect: (token: string) => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  on: <T = any>(event: string, callback: (data: T) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  /**
   * Whether to automatically connect when user is authenticated
   */
  autoConnect?: boolean;
  
  /**
   * Whether to show connection status notifications
   */
  showNotifications?: boolean;
}

export function WebSocketProvider({ 
  children, 
  autoConnect = true, 
  showNotifications = true 
}: WebSocketProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const webSocket = useWebSocket({ 
    autoConnect, 
    showNotifications,
    handlers: {
      // Add any global handlers here if needed
    }
  });

  // Update local state when WebSocket status changes
  useEffect(() => {
    setConnectionStatus(webSocket.connectionStatus);
    setIsConnected(webSocket.isConnected);
  }, [webSocket.connectionStatus, webSocket.isConnected]);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect: webSocket.connect,
    disconnect: webSocket.disconnect,
    emit: webSocket.emit,
    joinRoom: webSocket.joinRoom,
    leaveRoom: webSocket.leaveRoom,
    on: webSocket.on,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}