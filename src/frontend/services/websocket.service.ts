import { toast } from "react-hot-toast";
import { io, Socket } from "socket.io-client";

export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: string;
}

export interface NotificationData {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

export type WebSocketConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface ResumeAnalysisProgress {
  analysisId: string;
  progress: number;
  status: string;
  timestamp: string;
}

export interface ResumeAnalysisComplete {
  analysisId: string;
  result: any;
  status: "completed";
  timestamp: string;
}

export interface ResumeAnalysisError {
  analysisId: string;
  error: string;
  status: "error";
  timestamp: string;
}

export interface JobUpdateData {
  job?: any;
  jobId?: string;
  action: "created" | "updated" | "deleted" | "status_changed";
  oldStatus?: string;
  newStatus?: string;
  timestamp: string;
}

export interface JDMatchingProgress {
  matchingId: string;
  progress: number;
  status: string;
  timestamp: string;
}

export interface JDMatchingComplete {
  matchingId: string;
  result: any;
  status: "completed";
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionStatus: WebSocketConnectionStatus = "disconnected";
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private statusListeners = new Set<
    (status: WebSocketConnectionStatus) => void
  >();

  // Singleton pattern
  private static instance: WebSocketService | null = null;

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Initialize WebSocket connection with authentication token
   */
  public connect(token: string): void {
    if (this.socket?.connected && this.token === token) {
      return; // Already connected with the same token
    }

    this.token = token;
    this.disconnect(); // Disconnect existing connection

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 5000,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect WebSocket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus("disconnected");
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): WebSocketConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to WebSocket events
   */
  public on<T = any>(event: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Set up socket listener if not already set
    if (this.socket && this.eventListeners.get(event)!.size === 1) {
      this.socket.on(event, (data: T) => {
        this.eventListeners.get(event)?.forEach((listener) => listener(data));
      });
    }

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
      if (this.eventListeners.get(event)?.size === 0) {
        this.socket?.off(event);
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionStatusChange(
    callback: (status: WebSocketConnectionStatus) => void
  ): () => void {
    this.statusListeners.add(callback);

    // Immediately call with current status
    callback(this.connectionStatus);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Emit event to server
   */
  public emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("WebSocket not connected. Event not sent:", event);
    }
  }

  /**
   * Join a room
   */
  public joinRoom(room: string): void {
    this.emit("join_room", { room });
  }

  /**
   * Leave a room
   */
  public leaveRoom(room: string): void {
    this.emit("leave_room", { room });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      this.updateConnectionStatus("connected");
      this.reconnectAttempts = 0;

      // Authenticate after connection
      if (this.token) {
        this.socket?.emit("authenticate", { token: this.token });
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.updateConnectionStatus("disconnected");
      console.log("WebSocket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      this.updateConnectionStatus("error");
      console.error("WebSocket connection error:", error);
      this.handleReconnection();
    });

    // Authentication events
    this.socket.on("authenticated", (data) => {
      console.log("WebSocket authenticated:", data);
      toast.success("Connected to real-time updates");
    });

    this.socket.on("authentication_error", (error) => {
      console.error("WebSocket authentication error:", error);
      toast.error("Failed to authenticate WebSocket connection");
      this.updateConnectionStatus("error");
    });

    // Set up listeners for existing event subscriptions
    this.eventListeners.forEach((listeners, event) => {
      this.socket?.on(event, (data) => {
        listeners.forEach((listener) => listener(data));
      });
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      toast.error("Connection lost. Please refresh the page.");
      return;
    }

    this.reconnectAttempts++;
    this.updateConnectionStatus("connecting");

    setTimeout(
      () => {
        if (this.token && !this.socket?.connected) {
          console.log(
            `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );
          this.connect(this.token);
        }
      },
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    ); // Exponential backoff
  }

  private updateConnectionStatus(status: WebSocketConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export default WebSocketService;
