import { io } from 'socket.io-client';

// Get Socket.IO server URL from environment or use localhost
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.socket = io(SOCKET_SERVER_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.setupEventListeners();

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay on successful connection
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.handleReconnect();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.connected = false;
        this.handleReconnect();
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.handleReconnect();
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Listen for cart updates
    this.socket.on('cart-updated', (data) => {
      console.log('Cart update received:', data);
      // Dispatch custom event to notify components
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: data }));
    });

    // Listen for connection status
    this.socket.on('connect', () => {
      console.log('Socket reconnected successfully');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  // Handle reconnection logic
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    console.log(`Reconnect delay: ${delay}ms`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  // Join user room for cart updates
  joinUserRoom(userId) {
    if (this.socket && this.connected) {
      this.socket.emit('join-user-room', userId);
      console.log(`Joined user room: user:${userId}`);
    } else {
      console.warn('Socket not connected. Cannot join user room.');
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('Socket disconnected');
    }
  }

  // Get connection status
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  // Get socket instance (for advanced usage)
  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

// Auto-connect when token is available
const token = localStorage.getItem('token');
if (token) {
  socketService.connect(token);
}

export default socketService;