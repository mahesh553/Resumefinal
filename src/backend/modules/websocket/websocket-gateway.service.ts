import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WsAuthGuard } from './guards/ws-auth.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGatewayService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');
  private userSockets = new Map<string, Socket[]>(); // userId -> Socket[]

  handleConnection(client: Socket, ..._args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove client from user socket map
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.findIndex(socket => socket.id === client.id);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @MessageBody() data: { token: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Authentication is handled by the guard
      // If we reach here, the user is authenticated
      const userId = client.data.userId;
      
      // Store the socket for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      const userSocketList = this.userSockets.get(userId);
      if (userSocketList) {
        userSocketList.push(client);
      }

      client.emit('authenticated', { success: true });
      this.logger.log(`User authenticated: ${userId} on socket ${client.id}`);
      
      return { success: true };
    } catch (error: any) {
      this.logger.error('Authentication failed:', error);
      client.emit('authentication_error', { message: 'Authentication failed' });
      client.disconnect();
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    return { success: true, room: data.room };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);
    return { success: true, room: data.room };
  }

  // Utility methods for emitting to specific users or rooms

  /**
   * Emit event to all sockets of a specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socket => socket.emit(event, data));
      this.logger.log(`Emitted ${event} to user ${userId} (${sockets.length} sockets)`);
    }
  }

  /**
   * Emit event to a specific room
   */
  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
    this.logger.log(`Emitted ${event} to room ${room}`);
  }

  /**
   * Emit event to all connected clients
   */
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Emitted ${event} to all clients`);
  }

  /**
   * Get number of connected clients for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.length || 0;
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Resume Analysis WebSocket Events

  /**
   * Notify user about resume analysis progress
   */
  notifyResumeAnalysisProgress(userId: string, analysisId: string, progress: number, status: string) {
    const data = {
      analysisId,
      progress,
      status,
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'resume_analysis_progress', data);
  }

  /**
   * Notify user when resume analysis is completed
   */
  notifyResumeAnalysisComplete(userId: string, analysisId: string, result: any) {
    const data = {
      analysisId,
      result,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'resume_analysis_complete', data);
  }

  /**
   * Notify user about resume analysis error
   */
  notifyResumeAnalysisError(userId: string, analysisId: string, error: string) {
    const data = {
      analysisId,
      error,
      status: 'error',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'resume_analysis_error', data);
  }

  // Job Tracker WebSocket Events

  /**
   * Notify user about job creation
   */
  notifyJobCreated(userId: string, job: any) {
    const data = {
      job,
      action: 'created',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'job_updated', data);
  }

  /**
   * Notify user about job updates
   */
  notifyJobUpdated(userId: string, job: any) {
    const data = {
      job,
      action: 'updated', 
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'job_updated', data);
  }

  /**
   * Notify user about job deletion
   */
  notifyJobDeleted(userId: string, jobId: string) {
    const data = {
      jobId,
      action: 'deleted',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'job_updated', data);
  }

  /**
   * Notify user about job status change
   */
  notifyJobStatusChanged(userId: string, jobId: string, oldStatus: string, newStatus: string) {
    const data = {
      jobId,
      oldStatus,
      newStatus,
      action: 'status_changed',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'job_status_updated', data);
  }

  // JD Matching WebSocket Events

  /**
   * Notify user about JD matching progress
   */
  notifyJDMatchingProgress(userId: string, matchingId: string, progress: number, status: string) {
    const data = {
      matchingId,
      progress,
      status,
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'jd_matching_progress', data);
  }

  /**
   * Notify user when JD matching is completed
   */
  notifyJDMatchingComplete(userId: string, matchingId: string, result: any) {
    const data = {
      matchingId,
      result,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'jd_matching_complete', data);
  }

  // General Notification Events

  /**
   * Send general notification to user
   */
  sendNotification(userId: string, notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  }) {
    const data = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    this.emitToUser(userId, 'notification', data);
  }
}