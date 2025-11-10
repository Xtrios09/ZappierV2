import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { getWebRTCManager, PeerConnectionStatus } from './webrtc-manager';
import { getProfile, getAllContacts, saveContact } from './user-storage';
import { getNotificationManager } from './notifications';
import type { Contact } from '@shared/schema';

interface PeerConnectionContextType {
  connectionStatuses: Map<string, PeerConnectionStatus>;
  connectToPeer: (contact: Contact) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
  sendMessage: (peerId: string, message: any) => boolean;
  onContactsChanged: (callback: () => void) => () => void;
}

const PeerConnectionContext = createContext<PeerConnectionContextType | undefined>(undefined);

export function PeerConnectionProvider({ children }: { children: ReactNode }) {
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, PeerConnectionStatus>>(new Map());
  const contactsChangedCallbacksRef = useRef<Array<() => void>>([]);
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

      // Set up global message handler for contact info exchange
      webrtcManager.onGlobalMessage(async (peerId, message) => {
        if (message.type === 'contact-info') {
          // Validation: Reject self-addition
          if (peerId === profile.id) {
            console.warn('Rejected contact-info from self');
            return;
          }
          
          // Validation: Verify peerId matches sender
          if (message.data.peerId && message.data.peerId !== peerId) {
            console.warn('Rejected contact-info: peerId mismatch');
            return;
          }
          
          // Validation: Ensure displayName is provided and valid
          if (!message.data.displayName || typeof message.data.displayName !== 'string' || message.data.displayName.trim().length === 0) {
            console.warn('Rejected contact-info: invalid displayName');
            return;
          }
          
          // Check if this contact already exists
          const contacts = await getAllContacts();
          const existingContact = contacts.find(c => c.peerId === peerId);
          
          if (!existingContact) {
            // Auto-add the contact who added us
            const { nanoid } = await import('nanoid');
            const newContact: Contact = {
              id: nanoid(),
              peerId: peerId,
              displayName: message.data.displayName.trim(),
              status: 'online',
              lastSeen: Date.now(),
              addedAt: Date.now(),
              unreadCount: 0,
            };
            
            await saveContact(newContact);
            console.log(`Auto-added contact: ${newContact.displayName} (${peerId})`);
            
            // Notify user about new contact
            const notificationManager = getNotificationManager();
            notificationManager.notifyNewContact(newContact.displayName);
            
            // Trigger contacts changed callbacks to refresh UI
            contactsChangedCallbacksRef.current.forEach(callback => callback());
          } else {
            console.log(`Contact ${peerId} already exists, skipping auto-add`);
          }
        }
      });

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

  function onContactsChanged(callback: () => void): () => void {
    contactsChangedCallbacksRef.current.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = contactsChangedCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        contactsChangedCallbacksRef.current.splice(index, 1);
      }
    };
  }

  return (
    <PeerConnectionContext.Provider
      value={{
        connectionStatuses,
        connectToPeer,
        disconnectFromPeer,
        sendMessage,
        onContactsChanged,
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
