import { z } from "zod";

// User Profile Schema
export const userProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(50),
  avatar: z.string().optional(),
  createdAt: z.number(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// Contact Schema
export const contactSchema = z.object({
  id: z.string(),
  peerId: z.string(),
  displayName: z.string(),
  avatar: z.string().optional(),
  status: z.enum(["online", "offline", "connecting"]),
  lastSeen: z.number(),
  addedAt: z.number(),
  unreadCount: z.number().default(0),
});

export type Contact = z.infer<typeof contactSchema>;

// Message Schema
export const messageSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  content: z.string(),
  type: z.enum(["text", "file", "image", "video", "audio", "gif"]),
  sender: z.enum(["me", "them"]),
  timestamp: z.number(),
  status: z.enum(["sending", "sent", "delivered", "read", "failed"]).default("sending"),
  fileData: z.object({
    name: z.string(),
    size: z.number(),
    mimeType: z.string(),
    url: z.string().optional(),
    thumbnail: z.string().optional(),
  }).optional(),
});

export type Message = z.infer<typeof messageSchema>;

// Call Session Schema
export const callSessionSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  type: z.enum(["audio", "video"]),
  status: z.enum(["incoming", "outgoing", "active", "ended", "declined", "missed"]),
  startTime: z.number(),
  endTime: z.number().optional(),
  duration: z.number().optional(),
});

export type CallSession = z.infer<typeof callSessionSchema>;

// WebRTC Signaling Messages
export const signalingMessageSchema = z.object({
  type: z.enum(["offer", "answer", "ice-candidate", "user-info", "status-update"]),
  from: z.string(),
  to: z.string(),
  data: z.any(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

// P2P Message Types
export const p2pMessageSchema = z.object({
  type: z.enum(["chat", "file", "typing", "read-receipt", "call-offer", "call-answer", "call-end"]),
  messageId: z.string(),
  timestamp: z.number(),
  data: z.any(),
});

export type P2PMessage = z.infer<typeof p2pMessageSchema>;
