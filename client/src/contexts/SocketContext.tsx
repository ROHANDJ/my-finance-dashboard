import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  subscribeToStocks: (symbols: string[]) => void;
  unsubscribeFromStocks: (symbols: string[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = io('http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      socketRef.current.on('stock-update', (data) => {
        console.log('Stock update received:', data);
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const subscribeToStocks = (symbols: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe-stocks', symbols);
    }
  };

  const unsubscribeFromStocks = (symbols: string[]) => {
    if (socketRef.current) {
      symbols.forEach(symbol => {
        socketRef.current?.emit('unsubscribe-stock', symbol);
      });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    subscribeToStocks,
    unsubscribeFromStocks,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
