'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import WebSocketService, { 
  WebSocketConnectionStatus,
  NotificationData,
  ResumeAnalysisProgress,
  ResumeAnalysisComplete,
  ResumeAnalysisError,
  JobUpdateData,
  JDMatchingProgress,
  JDMatchingComplete,
} from '../services/websocket.service';

export interface UseWebSocketOptions {
  /**
   * Whether to automatically connect when user is authenticated
   */
  autoConnect?: boolean;
  
  /**
   * Whether to show connection status notifications
   */
  showNotifications?: boolean;
  
  /**
   * Custom handlers for specific events
   */
  handlers?: {
    onResumeAnalysisProgress?: (data: ResumeAnalysisProgress) => void;
    onResumeAnalysisComplete?: (data: ResumeAnalysisComplete) => void;
    onResumeAnalysisError?: (data: ResumeAnalysisError) => void;
    onJobUpdate?: (data: JobUpdateData) => void;
    onJDMatchingProgress?: (data: JDMatchingProgress) => void;
    onJDMatchingComplete?: (data: JDMatchingComplete) => void;
    onNotification?: (data: NotificationData) => void;
  };
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    showNotifications = true,
    handlers = {},
  } = options;

  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const wsService = useRef(WebSocketService.getInstance());
  
  // Connection status state
  const connectionStatusRef = useRef<WebSocketConnectionStatus>('disconnected');

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (autoConnect && session?.accessToken) {
      wsService.current.connect(session.accessToken);
    } else if (!session?.accessToken) {
      wsService.current.disconnect();
    }
  }, [session?.accessToken, autoConnect]);

  // Setup event listeners
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Connection status listener
    const unsubscribeStatus = wsService.current.onConnectionStatusChange((status) => {
      connectionStatusRef.current = status;
      
      if (showNotifications) {
        switch (status) {
          case 'connected':
            if (connectionStatusRef.current !== 'connected') {
              toast.success('Connected to real-time updates');
            }
            break;
          case 'disconnected':
            toast.error('Disconnected from real-time updates');
            break;
          case 'error':
            toast.error('Connection error. Retrying...');
            break;
        }
      }
    });
    unsubscribers.push(unsubscribeStatus);

    // Resume Analysis Events
    const unsubscribeResumeProgress = wsService.current.on<ResumeAnalysisProgress>(
      'resume_analysis_progress',
      (data) => {
        handlers.onResumeAnalysisProgress?.(data);
        
        // Optionally invalidate resume queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['resumes', 'analysis', data.analysisId] });
      }
    );
    unsubscribers.push(unsubscribeResumeProgress);

    const unsubscribeResumeComplete = wsService.current.on<ResumeAnalysisComplete>(
      'resume_analysis_complete',
      (data) => {
        handlers.onResumeAnalysisComplete?.(data);
        
        // Invalidate and refetch resume data
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
        queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
        
        if (showNotifications) {
          toast.success('Resume analysis completed!');
        }
      }
    );
    unsubscribers.push(unsubscribeResumeComplete);

    const unsubscribeResumeError = wsService.current.on<ResumeAnalysisError>(
      'resume_analysis_error',
      (data) => {
        handlers.onResumeAnalysisError?.(data);
        
        // Invalidate resume queries to update status
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
        
        if (showNotifications) {
          toast.error(`Resume analysis failed: ${data.error}`);
        }
      }
    );
    unsubscribers.push(unsubscribeResumeError);

    // Job Tracker Events
    const unsubscribeJobUpdate = wsService.current.on<JobUpdateData>(
      'job_updated',
      (data) => {
        handlers.onJobUpdate?.(data);
        
        // Invalidate job queries for real-time updates
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        
        if (showNotifications && data.action === 'created') {
          toast.success('New job added!');
        } else if (showNotifications && data.action === 'updated') {
          toast.success('Job updated!');
        } else if (showNotifications && data.action === 'deleted') {
          toast.success('Job deleted!');
        }
      }
    );
    unsubscribers.push(unsubscribeJobUpdate);

    const unsubscribeJobStatus = wsService.current.on<JobUpdateData>(
      'job_status_updated',
      (data) => {
        handlers.onJobUpdate?.(data);
        
        // Invalidate job queries
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        
        if (showNotifications) {
          toast.success(`Job status updated to ${data.newStatus}`);
        }
      }
    );
    unsubscribers.push(unsubscribeJobStatus);

    // JD Matching Events
    const unsubscribeJDProgress = wsService.current.on<JDMatchingProgress>(
      'jd_matching_progress',
      (data) => {
        handlers.onJDMatchingProgress?.(data);
        
        // Invalidate JD matching queries
        queryClient.invalidateQueries({ queryKey: ['jd-matching', data.matchingId] });
      }
    );
    unsubscribers.push(unsubscribeJDProgress);

    const unsubscribeJDComplete = wsService.current.on<JDMatchingComplete>(
      'jd_matching_complete',
      (data) => {
        handlers.onJDMatchingComplete?.(data);
        
        // Invalidate JD matching queries
        queryClient.invalidateQueries({ queryKey: ['jd-matching'] });
        
        if (showNotifications) {
          toast.success('JD matching analysis completed!');
        }
      }
    );
    unsubscribers.push(unsubscribeJDComplete);

    // General Notification Events
    const unsubscribeNotification = wsService.current.on<NotificationData>(
      'notification',
      (data) => {
        handlers.onNotification?.(data);
        
        if (showNotifications) {
          const toastOptions = {
            duration: data.duration || 5000,
          };
          
          switch (data.type) {
            case 'success':
              toast.success(data.message, toastOptions);
              break;
            case 'error':
              toast.error(data.message, toastOptions);
              break;
            case 'warning':
              toast(data.message, { icon: '⚠️', ...toastOptions });
              break;
            case 'info':
              toast(data.message, { icon: 'ℹ️', ...toastOptions });
              break;
          }
        }
      }
    );
    unsubscribers.push(unsubscribeNotification);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [queryClient, handlers, showNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsService.current.disconnect();
    };
  }, []);

  // Public API
  const connect = useCallback((token: string) => {
    wsService.current.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    wsService.current.disconnect();
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    wsService.current.emit(event, data);
  }, []);

  const joinRoom = useCallback((room: string) => {
    wsService.current.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    wsService.current.leaveRoom(room);
  }, []);

  const on = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
    return wsService.current.on(event, callback);
  }, []);

  return {
    // Connection methods
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom,
    on,
    
    // Status
    isConnected: wsService.current.isConnected(),
    connectionStatus: wsService.current.getConnectionStatus(),
  };
}