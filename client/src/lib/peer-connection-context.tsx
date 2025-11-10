import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getWebRTCManager, PeerConnectionStatus } from './webrtc-manager';
import { getProfile, getAllContacts, saveContact } from './user-storage';
import type { Contact } from '@shared/schema';

interface PeerConnectionContextType {
  connectionStatuses: Map<string, PeerConnectionStatus>;
  connectToPeer: (contact: Contact) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
  sendMessage: (peerId: string, message: any) => boolean;
}

const PeerConnectionContext = createContext<PeerConnectionContextType | undefined>(undefined);

export function PeerConnectionProvider({ children }: { children: ReactNode }) {
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, PeerConnectionStatus>>(new Map());
  const webrtcManager = getWebRTCManager();

  useEffect(() => {
    initializePeerConnection();

    return () => {
      webrtcManager.disconnectAll();
    };
  }, []);

  async function initializePeerConnection() {
    const profile = await getProfile();
    if (profile) {
      webrtcManager.registerPeer(profile.id, profile.displayName);
      webrtcManager.updateStatus('online');

      // Set up peer status change handler
      webrtcManager.onPeerStatusChange(async (peerId, status) => {
        const contacts = await getAllContacts();
        const contact = contacts.find(c => c.peerId === peerId);
        
        if (contact) {
          const updatedContact = {
            ...contact,
            status: status === 'online' ? 'online' : 'offline',
            lastSeen: Date.now(),
          } as Contact;
          
          await saveContact(updatedContact);
          
          // Update connection status
          setConnectionStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(contact.id, status === 'online' ? 'connected' : 'disconnected');
            return newMap;
          });
        }
      });
    }

    // Handle visibility change to update online status
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        webrtcManager.updateStatus('offline');
      } else {
        webrtcManager.updateStatus('online');
      }
    });

    // Handle before unload to notify peers
    window.addEventListener('beforeunload', () => {
      webrtcManager.updateStatus('offline');
    });
  }

  async function connectToPeer(contact: Contact): Promise<void> {
    setConnectionStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(contact.id, 'connecting');
      return newMap;
    });

    webrtcManager.onStatusChange(contact.id, (status) => {
      setConnectionStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(contact.id, status);
        return newMap;
      });

      // Update contact status in storage
      const updatedContact = {
        ...contact,
        status: status === 'connected' ? 'online' : 'offline',
        lastSeen: Date.now(),
      } as Contact;
      saveContact(updatedContact);
    });

    try {
      await webrtcManager.connectToPeer(contact);
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      setConnectionStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(contact.id, 'failed');
        return newMap;
      });
    }
  }

  function disconnectFromPeer(peerId: string) {
    webrtcManager.disconnect(peerId);
  }

  function sendMessage(peerId: string, message: any): boolean {
    return webrtcManager.sendMessage(peerId, message);
  }

  return (
    <PeerConnectionContext.Provider
      value={{
        connectionStatuses,
        connectToPeer,
        disconnectFromPeer,
        sendMessage,
      }}
    >
      {children}
    </PeerConnectionContext.Provider>
  );
}

export function usePeerConnection() {
  const context = useContext(PeerConnectionContext);
  if (context === undefined) {
    throw new Error('usePeerConnection must be used within a PeerConnectionProvider');
  }
  return context;
}
