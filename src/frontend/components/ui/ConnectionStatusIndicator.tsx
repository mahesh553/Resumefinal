'use client';

import React from 'react';
import { useWebSocketContext } from '../providers/WebSocketProvider';
import { WebSocketConnectionStatus } from '../../services/websocket.service';

interface ConnectionStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function ConnectionStatusIndicator({ 
  className = '', 
  showText = false 
}: ConnectionStatusIndicatorProps) {
  const { connectionStatus, isConnected } = useWebSocketContext();

  const getStatusColor = (status: WebSocketConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: WebSocketConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getTooltipText = (status: WebSocketConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Real-time updates active';
      case 'connecting':
        return 'Connecting to real-time updates...';
      case 'disconnected':
        return 'Real-time updates inactive';
      case 'error':
        return 'Real-time connection failed';
      default:
        return 'Connection status unknown';
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title={getTooltipText(connectionStatus)}
    >
      <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)}`} />
      {showText && (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {getStatusText(connectionStatus)}
        </span>
      )}
    </div>
  );
}

export default ConnectionStatusIndicator;