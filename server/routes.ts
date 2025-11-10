import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

interface PeerConnection {
  peerId: string;
  ws: WebSocket;
  displayName?: string;
}

const peers = new Map<string, PeerConnection>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for WebRTC signaling on a distinct path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentPeerId: string | null = null;

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'register':
            // Register peer with their ID
            currentPeerId = message.peerId;
            peers.set(currentPeerId, {
              peerId: currentPeerId,
              ws,
              displayName: message.displayName,
            });
            console.log(`Peer registered: ${currentPeerId}`);
            
            // Send success response
            ws.send(JSON.stringify({
              type: 'registered',
              peerId: currentPeerId,
            }));
            break;

          case 'signal':
            // Forward signaling message to target peer
            const { to, from, signal: signalData } = message;
            const targetPeer = peers.get(to);
            
            if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
              targetPeer.ws.send(JSON.stringify({
                type: 'signal',
                from,
                signal: signalData,
              }));
            } else {
              // Target peer not found or not connected
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Target peer not available',
              }));
            }
            break;

          case 'offer':
            // Forward WebRTC offer to target peer
            const offerTarget = peers.get(message.to);
            if (offerTarget && offerTarget.ws.readyState === WebSocket.OPEN) {
              offerTarget.ws.send(JSON.stringify({
                type: 'offer',
                from: message.from,
                offer: message.offer,
                callType: message.callType,
              }));
            }
            break;

          case 'answer':
            // Forward WebRTC answer to target peer
            const answerTarget = peers.get(message.to);
            if (answerTarget && answerTarget.ws.readyState === WebSocket.OPEN) {
              answerTarget.ws.send(JSON.stringify({
                type: 'answer',
                from: message.from,
                answer: message.answer,
              }));
            }
            break;

          case 'ice-candidate':
            // Forward ICE candidate to target peer
            const iceTarget = peers.get(message.to);
            if (iceTarget && iceTarget.ws.readyState === WebSocket.OPEN) {
              iceTarget.ws.send(JSON.stringify({
                type: 'ice-candidate',
                from: message.from,
                candidate: message.candidate,
              }));
            }
            break;

          case 'status-update':
            // Broadcast status update to all connected peers
            const statusUpdate = {
              type: 'peer-status',
              peerId: currentPeerId,
              status: message.status,
              timestamp: Date.now(),
            };

            peers.forEach((peer, id) => {
              if (id !== currentPeerId && peer.ws.readyState === WebSocket.OPEN) {
                peer.ws.send(JSON.stringify(statusUpdate));
              }
            });
            break;

          case 'ping':
            // Respond to ping with pong
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      if (currentPeerId) {
        console.log(`Peer disconnected: ${currentPeerId}`);
        peers.delete(currentPeerId);

        // Notify other peers about disconnection
        const disconnectNotification = {
          type: 'peer-status',
          peerId: currentPeerId,
          status: 'offline',
          timestamp: Date.now(),
        };

        peers.forEach((peer) => {
          if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(JSON.stringify(disconnectNotification));
          }
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('WebSocket signaling server initialized on /ws');

  return httpServer;
}
