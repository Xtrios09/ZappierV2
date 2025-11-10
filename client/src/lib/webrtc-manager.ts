import Peer, { DataConnection } from 'peerjs';
import CryptoJS from 'crypto-js';
import type { Contact } from '@shared/schema';

export type PeerConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface WebRTCMessage {
  type: 'chat' | 'file' | 'typing' | 'read-receipt' | 'call-offer' | 'call-answer' | 'call-end';
  messageId: string;
  timestamp: number;
  data: any;
}

export class WebRTCManager {
  private ws: WebSocket | null = null;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private myPeerId: string = '';
  private myDisplayName: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (message: WebRTCMessage) => void> = new Map();
  private statusHandlers: Map<string, (status: PeerConnectionStatus) => void> = new Map();
  private peerStatusHandlers: Array<(peerId: string, status: 'online' | 'offline') => void> = [];
  private isReinitializing = false;
  private lastReinitTime = 0;

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  registerPeer(peerId: string, displayName: string) {
    this.myPeerId = peerId;
    this.myDisplayName = displayName;
    this.initializePeer(peerId, displayName);
  }

  private initializePeer(peerId: string, displayName: string) {
    // Prevent reinitializing too frequently (cooldown: 3 seconds)
    const now = Date.now();
    if (this.isReinitializing || (now - this.lastReinitTime < 3000)) {
      console.log('Skipping reinitialize - too soon or already in progress');
      return;
    }

    this.isReinitializing = true;
    this.lastReinitTime = now;

    // Clean up existing peer if any
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch (e) {
        console.error('Error destroying peer:', e);
      }
    }
    
    // Initialize PeerJS - use default cloud server for signaling
    try {
      this.peer = new Peer(peerId);

      this.peer.on('open', (id) => {
        console.log('PeerJS connection opened with ID:', id);
        this.isReinitializing = false;
        // Still notify our WebSocket server for presence tracking
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'register',
            peerId: id,
            displayName,
          }));
        }
      });

      this.peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        this.setupConnection(conn);
      });

      this.peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        this.isReinitializing = false;
        // Only recreate on fatal errors, ignore peer-unavailable
        if (error.type === 'server-error' && this.peer && this.peer.destroyed) {
          console.log('Server error, will reinitialize PeerJS');
          setTimeout(() => {
            this.initializePeer(this.myPeerId, this.myDisplayName);
          }, 5000);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('PeerJS disconnected');
        this.isReinitializing = false;
        // Try to reconnect instead of reinitializing
        if (this.peer && !this.peer.destroyed) {
          console.log('Attempting to reconnect...');
          this.peer.reconnect();
        }
      });

      this.peer.on('close', () => {
        console.log('PeerJS closed');
        this.isReinitializing = false;
        // Clear all connections
        this.connections.clear();
      });
    } catch (error) {
      console.error('Error initializing PeerJS:', error);
      this.isReinitializing = false;
    }
  }

  private handleSignalingMessage(message: any) {
    switch (message.type) {
      case 'registered':
        console.log('Successfully registered with signaling server');
        break;

      case 'peer-status':
        this.handlePeerStatus(message.peerId, message.status);
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('Signaling error:', message.message);
        break;
    }
  }

  connectToPeer(contact: Contact): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connections.has(contact.peerId)) {
        resolve();
        return;
      }

      if (!this.peer) {
        reject(new Error('PeerJS not initialized'));
        return;
      }

      const statusHandler = this.statusHandlers.get(contact.id);
      if (statusHandler) {
        statusHandler('connecting');
      }

      try {
        const conn = this.peer.connect(contact.peerId, {
          reliable: true,
        });

        this.setupConnection(conn);

        conn.on('open', () => {
          console.log('Connected to peer:', contact.peerId);
          const statusHandler = this.statusHandlers.get(contact.id);
          if (statusHandler) {
            statusHandler('connected');
          }
          resolve();
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          const statusHandler = this.statusHandlers.get(contact.id);
          if (statusHandler) {
            statusHandler('failed');
          }
          reject(err);
        });

        this.connections.set(contact.peerId, conn);
      } catch (error) {
        console.error('Error connecting to peer:', error);
        const statusHandler = this.statusHandlers.get(contact.id);
        if (statusHandler) {
          statusHandler('failed');
        }
        reject(error);
      }
    });
  }

  private setupConnection(conn: DataConnection) {
    const peerId = conn.peer;

    conn.on('data', (data: any) => {
      this.handlePeerData(peerId, data);
    });

    conn.on('close', () => {
      console.log('Connection closed with peer:', peerId);
      this.connections.delete(peerId);
    });

    conn.on('error', (err) => {
      console.error('Connection error with peer:', peerId, err);
    });

    // Store connection if it's incoming
    if (!this.connections.has(peerId)) {
      this.connections.set(peerId, conn);
    }
  }

  private handlePeerStatus(peerId: string, status: 'online' | 'offline') {
    this.peerStatusHandlers.forEach(handler => handler(peerId, status));
  }

  private handlePeerData(peerId: string, data: any) {
    try {
      const message: WebRTCMessage = typeof data === 'string' ? JSON.parse(data) : data;
      const handler = this.messageHandlers.get(peerId);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      console.error('Error handling peer data:', error);
    }
  }

  sendMessage(peerId: string, message: WebRTCMessage): boolean {
    const conn = this.connections.get(peerId);
    
    // Check if connection exists and is open
    if (conn && conn.open) {
      try {
        conn.send(message);
        console.log('Message sent successfully to:', peerId);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        // Connection failed, remove it
        this.connections.delete(peerId);
        return false;
      }
    }
    
    // Connection doesn't exist or is closed
    console.warn('Cannot send message - connection not open for peer:', peerId);
    // Remove stale connection
    if (conn) {
      this.connections.delete(peerId);
    }
    return false;
  }

  async ensureConnection(contact: { id: string; peerId: string; displayName: string }): Promise<boolean> {
    const conn = this.connections.get(contact.peerId);
    
    // If connection exists and is open, we're good
    if (conn && conn.open) {
      return true;
    }
    
    // Remove stale connection
    if (conn) {
      this.connections.delete(contact.peerId);
    }
    
    // Try to establish connection
    try {
      await this.connectToPeer(contact);
      // Wait a bit for connection to open
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newConn = this.connections.get(contact.peerId);
      return newConn ? newConn.open : false;
    } catch (error) {
      console.error('Failed to ensure connection:', error);
      return false;
    }
  }

  onMessage(peerId: string, handler: (message: WebRTCMessage) => void) {
    this.messageHandlers.set(peerId, handler);
  }

  onStatusChange(contactId: string, handler: (status: PeerConnectionStatus) => void) {
    this.statusHandlers.set(contactId, handler);
  }

  onPeerStatusChange(handler: (peerId: string, status: 'online' | 'offline') => void) {
    this.peerStatusHandlers.push(handler);
  }

  updateStatus(status: 'online' | 'offline') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'status-update',
        status,
      }));
    }
  }

  disconnect(peerId: string) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  disconnectAll() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  // Encryption utilities
  encryptMessage(message: string, key: string): string {
    return CryptoJS.AES.encrypt(message, key).toString();
  }

  decryptMessage(encryptedMessage: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

// Singleton instance
let webrtcManager: WebRTCManager | null = null;

export function getWebRTCManager(): WebRTCManager {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager();
  }
  return webrtcManager;
}
