"use client";

import { ExclamationTriangleIcon, WifiIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-hot-toast";

// Network status context
interface NetworkContextType {
  isOnline: boolean;
  isSlowConnection: boolean;
  lastOnlineTime: Date | null;
  retryConnection: () => Promise<boolean>;
  connectionQuality: "fast" | "slow" | "offline";
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

// Network provider component
interface NetworkProviderProps {
  children: React.ReactNode;
  showNotifications?: boolean;
  monitorSlowConnection?: boolean;
  slowConnectionThreshold?: number; // ms
}

export function NetworkProvider({
  children,
  showNotifications = true,
  monitorSlowConnection = true,
  slowConnectionThreshold = 3000,
}: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<
    "fast" | "slow" | "offline"
  >("fast");

  // Test connection speed
  const testConnectionSpeed = useCallback(async (): Promise<number> => {
    try {
      const startTime = performance.now();
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
      });
      const endTime = performance.now();

      if (response.ok) {
        return endTime - startTime;
      }
      return Infinity;
    } catch {
      return Infinity;
    }
  }, []);

  // Retry connection
  const retryConnection = useCallback(async (): Promise<boolean> => {
    try {
      const speed = await testConnectionSpeed();
      const online = speed < 10000; // 10 seconds timeout

      setIsOnline(online);

      if (online) {
        setLastOnlineTime(new Date());
        const slow = speed > slowConnectionThreshold;
        setIsSlowConnection(slow);
        setConnectionQuality(slow ? "slow" : "fast");

        if (showNotifications) {
          toast.success("Connection restored", {
            id: "connection-restored",
            duration: 3000,
          });
        }
      } else {
        setConnectionQuality("offline");
      }

      return online;
    } catch {
      setIsOnline(false);
      setConnectionQuality("offline");
      return false;
    }
  }, [testConnectionSpeed, slowConnectionThreshold, showNotifications]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());

      if (monitorSlowConnection) {
        testConnectionSpeed().then((speed) => {
          const slow = speed > slowConnectionThreshold;
          setIsSlowConnection(slow);
          setConnectionQuality(slow ? "slow" : "fast");
        });
      } else {
        setConnectionQuality("fast");
      }

      if (showNotifications) {
        toast.success("Back online!", {
          id: "back-online",
          duration: 3000,
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality("offline");

      if (showNotifications) {
        toast.error("You are offline", {
          id: "offline-notification",
          duration: 5000,
        });
      }
    };

    // Set initial state
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnlineTime(new Date());
    }

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic connection quality check
    let intervalId: NodeJS.Timeout | null = null;
    if (monitorSlowConnection && navigator.onLine) {
      intervalId = setInterval(async () => {
        if (navigator.onLine) {
          const speed = await testConnectionSpeed();
          const slow = speed > slowConnectionThreshold;
          setIsSlowConnection(slow);
          setConnectionQuality(
            speed === Infinity ? "offline" : slow ? "slow" : "fast"
          );
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    testConnectionSpeed,
    monitorSlowConnection,
    slowConnectionThreshold,
    showNotifications,
  ]);

  const value: NetworkContextType = {
    isOnline,
    isSlowConnection,
    lastOnlineTime,
    retryConnection,
    connectionQuality,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

// Network status indicator component
interface NetworkStatusProps {
  className?: string;
  showWhenOnline?: boolean;
  compact?: boolean;
}

export function NetworkStatus({
  className = "",
  showWhenOnline = false,
  compact = false,
}: NetworkStatusProps) {
  const { isOnline, isSlowConnection, connectionQuality, retryConnection } =
    useNetwork();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryConnection();
    setIsRetrying(false);
  };

  if (isOnline && !showWhenOnline && !isSlowConnection) {
    return null;
  }

  const getStatusColor = () => {
    if (!isOnline) return "text-red-500 bg-red-50 border-red-200";
    if (isSlowConnection)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSlowConnection) return "Slow connection";
    return "Online";
  };

  const getStatusIcon = () => {
    if (!isOnline) return <ExclamationTriangleIcon className="w-4 h-4" />;
    return <WifiIcon className="w-4 h-4" />;
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded ${getStatusColor()} ${className}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor()} ${className}`}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <div className="font-medium text-sm">{getStatusText()}</div>
            {!isOnline && (
              <div className="text-xs opacity-75">
                Some features may not be available
              </div>
            )}
            {isSlowConnection && (
              <div className="text-xs opacity-75">
                Experience may be slower than usual
              </div>
            )}
          </div>
        </div>

        {!isOnline && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-3 py-1 text-xs font-medium bg-white border border-current rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Offline fallback component
interface OfflineFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showRetry?: boolean;
}

export function OfflineFallback({
  children,
  fallback,
  showRetry = true,
}: OfflineFallbackProps) {
  const { isOnline, retryConnection } = useNetwork();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryConnection();
    setIsRetrying(false);
  };

  if (isOnline) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
        <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        You're offline
      </h3>

      <p className="text-gray-600 mb-4 max-w-sm">
        Please check your internet connection and try again.
      </p>

      {showRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? "Checking connection..." : "Try again"}
        </button>
      )}
    </div>
  );
}

// Hook for handling offline-aware operations
export function useOfflineAware() {
  const { isOnline, connectionQuality } = useNetwork();

  const executeWhenOnline = useCallback(
    async function <T>(
      operation: () => Promise<T>,
      fallback?: () => T
    ): Promise<T> {
      if (isOnline) {
        try {
          return await operation();
        } catch (error) {
          // If operation fails and we have a fallback, use it
          if (fallback) {
            return fallback();
          }
          throw error;
        }
      } else {
        if (fallback) {
          return fallback();
        }
        throw new Error("Operation requires internet connection");
      }
    },
    [isOnline]
  );

  const queueForWhenOnline = useCallback(
    (operation: () => Promise<void>, key?: string) => {
      if (isOnline) {
        operation();
      } else {
        // Store in localStorage for when we come back online
        const queueKey = `offline_queue_${key || Date.now()}`;
        localStorage.setItem(queueKey, "pending");

        const handleOnline = () => {
          const item = localStorage.getItem(queueKey);
          if (item === "pending") {
            localStorage.removeItem(queueKey);
            operation();
          }
          window.removeEventListener("online", handleOnline);
        };

        window.addEventListener("online", handleOnline);
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    connectionQuality,
    executeWhenOnline,
    queueForWhenOnline,
  };
}

// Connection quality badge
export function ConnectionQualityBadge({
  className = "",
}: {
  className?: string;
}) {
  const { connectionQuality } = useNetwork();

  const getQualityConfig = () => {
    switch (connectionQuality) {
      case "fast":
        return {
          label: "Fast",
          color: "bg-green-100 text-green-800",
          icon: <WifiIcon className="w-3 h-3" />,
        };
      case "slow":
        return {
          label: "Slow",
          color: "bg-yellow-100 text-yellow-800",
          icon: <WifiIcon className="w-3 h-3" />,
        };
      case "offline":
        return {
          label: "Offline",
          color: "bg-red-100 text-red-800",
          icon: <ExclamationTriangleIcon className="w-3 h-3" />,
        };
      default:
        return {
          label: "Unknown",
          color: "bg-gray-100 text-gray-800",
          icon: <WifiIcon className="w-3 h-3" />,
        };
    }
  };

  const config = getQualityConfig();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
