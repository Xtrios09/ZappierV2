import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { UserProfile, Contact, Message, CallSession } from '@shared/schema';

interface ChatDB extends DBSchema {
  profile: {
    key: string;
    value: UserProfile;
  };
  contacts: {
    key: string;
    value: Contact;
    indexes: { 'by-peerId': string };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-contact': string; 'by-timestamp': number };
  };
  calls: {
    key: string;
    value: CallSession;
    indexes: { 'by-contact': string };
  };
  files: {
    key: string;
    value: { id: string; messageId: string; blob: Blob };
  };
}

let dbInstance: IDBPDatabase<ChatDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ChatDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ChatDB>('secure-chat-db', 1, {
    upgrade(db) {
      // Profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // Contacts store
      if (!db.objectStoreNames.contains('contacts')) {
        const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
        contactStore.createIndex('by-peerId', 'peerId');
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('by-contact', 'contactId');
        messageStore.createIndex('by-timestamp', 'timestamp');
      }

      // Calls store
      if (!db.objectStoreNames.contains('calls')) {
        const callStore = db.createObjectStore('calls', { keyPath: 'id' });
        callStore.createIndex('by-contact', 'contactId');
      }

      // Files store
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// Profile operations
export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', profile);
}

export async function getProfile(): Promise<UserProfile | undefined> {
  const db = await getDB();
  const allProfiles = await db.getAll('profile');
  return allProfiles[0];
}

// Contact operations
export async function saveContact(contact: Contact): Promise<void> {
  const db = await getDB();
  // Merge with existing contact to preserve unreadCount and other fields
  const existing = await db.get('contacts', contact.id);
  const merged = existing ? { ...existing, ...contact } : contact;
  await db.put('contacts', merged);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const db = await getDB();
  return await db.get('contacts', id);
}

export async function getAllContacts(): Promise<Contact[]> {
  const db = await getDB();
  return await db.getAll('contacts');
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('contacts', id);
}

// Message operations
export async function saveMessage(message: Message): Promise<void> {
  const db = await getDB();
  await db.put('messages', message);
}

export async function getMessagesByContact(contactId: string): Promise<Message[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-contact', contactId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteMessagesByContact(contactId: string): Promise<void> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-contact', contactId);
  const tx = db.transaction('messages', 'readwrite');
  await Promise.all(messages.map(msg => tx.store.delete(msg.id)));
  await tx.done;
}

// File operations
export async function saveFile(id: string, messageId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put('files', { id, messageId, blob });
}

export async function getFile(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const file = await db.get('files', id);
  return file?.blob;
}

// Call operations
export async function saveCall(call: CallSession): Promise<void> {
  const db = await getDB();
  await db.put('calls', call);
}

export async function getCallsByContact(contactId: string): Promise<CallSession[]> {
  const db = await getDB();
  return await db.getAllFromIndex('calls', 'by-contact', contactId);
}
