import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import type { Contact, Message, UserProfile } from "@shared/schema";
import { getMessagesByContact, saveMessage } from "@/lib/user-storage";
import { usePeerConnection } from "@/lib/peer-connection-context";
import { getWebRTCManager } from "@/lib/webrtc-manager";
import { getNotificationManager } from "@/lib/notifications";
import { nanoid } from "nanoid";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, MoreVertical, Paperclip, Send, Image as ImageIcon, Check, CheckCheck, FileIcon, Download, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  contact: Contact;
  profile: UserProfile | null;
  onBack?: () => void;
}

function getFileType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

export function ChatWindow({ contact, profile, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { connectionStatuses, connectToPeer } = usePeerConnection();
  const webrtcManager = getWebRTCManager();
  const notificationManager = getNotificationManager();
  const fileChunksRef = useRef<Map<string, { meta: any; chunks: (Uint8Array | null)[]; receivedCount: number }>>(new Map());

  useEffect(() => {
    loadMessages();
    setupPeerConnection();
  }, [contact.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    const msgs = await getMessagesByContact(contact.id);
    setMessages(msgs);
  }

  async function setupPeerConnection() {
    // Set up message handler for this contact
    webrtcManager.onMessage(contact.peerId, async (webrtcMessage) => {
      if (webrtcMessage.type === 'chat') {
        const receivedMessage: Message = {
          id: webrtcMessage.messageId,
          contactId: contact.id,
          content: webrtcMessage.data.content,
          type: webrtcMessage.data.type || 'text',
          sender: 'them',
          timestamp: webrtcMessage.timestamp,
          status: 'delivered',
        };
        
        await saveMessage(receivedMessage);
        setMessages(prev => [...prev, receivedMessage]);
        
        // Show notification for new message
        notificationManager.notifyNewMessage(contact.displayName, receivedMessage.content);
      } else if (webrtcMessage.type === 'file') {
        // Handle file transfer
        if (webrtcMessage.data.fileId) {
          // This is a chunk
          const fileId = webrtcMessage.data.fileId;
          const chunkIndex = webrtcMessage.data.chunkIndex;
          const chunkData = new Uint8Array(webrtcMessage.data.chunkData);
          
          if (!fileChunksRef.current.has(fileId)) {
            return; // Metadata not received yet
          }
          
          const fileTransfer = fileChunksRef.current.get(fileId)!;
          
          // Only process if this chunk hasn't been received yet
          if (fileTransfer.chunks[chunkIndex] === null) {
            fileTransfer.chunks[chunkIndex] = chunkData;
            fileTransfer.receivedCount++;
          }
          
          // Check if all chunks received using count
          if (fileTransfer.receivedCount === fileTransfer.chunks.length) {
            // Reconstruct file - verify all chunks are present
            const missingChunks = fileTransfer.chunks.some(c => c === null);
            if (missingChunks) {
              console.error('Missing chunks for file:', fileId);
              fileChunksRef.current.delete(fileId);
              return;
            }
            
            const totalSize = fileTransfer.chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
            const completeFile = new Uint8Array(totalSize);
            let offset = 0;
            for (const chunk of fileTransfer.chunks) {
              if (chunk) {
                completeFile.set(chunk, offset);
                offset += chunk.length;
              }
            }
            
            // Create blob and object URL
            const blob = new Blob([completeFile], { type: fileTransfer.meta.mimeType });
            const url = URL.createObjectURL(blob);
            
            // Update message with file URL
            const receivedMessage: Message = {
              id: fileId,
              contactId: contact.id,
              content: fileTransfer.meta.name,
              type: getFileType(fileTransfer.meta.mimeType),
              sender: 'them',
              timestamp: webrtcMessage.timestamp,
              status: 'delivered',
              fileData: {
                ...fileTransfer.meta,
                url,
              },
            };
            
            await saveMessage(receivedMessage);
            setMessages(prev => [...prev, receivedMessage]);
            fileChunksRef.current.delete(fileId);
            
            // Show notification for received file
            notificationManager.notifyNewMessage(contact.displayName, `Sent a file: ${receivedMessage.content}`);
          }
        } else {
          // This is metadata
          const fileId = webrtcMessage.messageId;
          // Initialize chunks array with explicit nulls, not sparse array
          fileChunksRef.current.set(fileId, {
            meta: webrtcMessage.data,
            chunks: Array.from({ length: webrtcMessage.data.chunks }, () => null as Uint8Array | null),
            receivedCount: 0,
          });
        }
      }
    });

    // Try to connect to peer if not already connected
    const status = connectionStatuses.get(contact.id);
    if (status !== 'connected' && status !== 'connecting') {
      try {
        await connectToPeer(contact);
      } catch (error) {
        console.error('Failed to connect to peer:', error);
      }
    }
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    const messageId = nanoid();
    const timestamp = Date.now();
    const content = messageText.trim();
    
    const message: Message = {
      id: messageId,
      contactId: contact.id,
      content,
      type: "text",
      sender: "me",
      timestamp,
      status: "sending",
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    setMessageText("");

    // Save to IndexedDB
    await saveMessage(message);

    // Ensure connection before sending
    const isConnected = await webrtcManager.ensureConnection(contact);
    
    if (!isConnected) {
      // Connection failed
      const failedMessage = { ...message, status: 'failed' } as Message;
      await saveMessage(failedMessage);
      setMessages(prev => prev.map(m => m.id === messageId ? failedMessage : m));
      setIsSending(false);
      return;
    }

    // Send via WebRTC
    const sent = webrtcManager.sendMessage(contact.peerId, {
      type: 'chat',
      messageId,
      timestamp,
      data: {
        content,
        type: 'text',
      },
    });

    // Update message status
    const updatedMessage = {
      ...message,
      status: sent ? 'sent' : 'failed',
    } as Message;
    
    await saveMessage(updatedMessage);
    setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
    setIsSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size limit: 10MB for WebRTC data channels
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    setIsSending(true);
    const messageId = nanoid();
    const timestamp = Date.now();

    // Create preview for images
    let preview: string | undefined;
    if (file.type.startsWith('image/')) {
      preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const message: Message = {
      id: messageId,
      contactId: contact.id,
      content: file.name,
      type: getFileType(file.type),
      sender: "me",
      timestamp,
      status: "sending",
      fileData: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        thumbnail: preview,
      },
    };

    setMessages(prev => [...prev, message]);
    await saveMessage(message);

    // Ensure connection
    const isConnected = await webrtcManager.ensureConnection(contact);
    
    if (!isConnected) {
      const failedMessage = { ...message, status: 'failed' } as Message;
      await saveMessage(failedMessage);
      setMessages(prev => prev.map(m => m.id === messageId ? failedMessage : m));
      setIsSending(false);
      return;
    }

    // Read file as ArrayBuffer and send in chunks
    const arrayBuffer = await file.arrayBuffer();
    const chunkSize = 16384; // 16KB chunks
    const chunks = Math.ceil(arrayBuffer.byteLength / chunkSize);

    // Send file metadata first
    const metadataSent = webrtcManager.sendMessage(contact.peerId, {
      type: 'file',
      messageId,
      timestamp,
      data: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        chunks,
        preview,
      },
    });

    if (!metadataSent) {
      const failedMessage = { ...message, status: 'failed' } as Message;
      await saveMessage(failedMessage);
      setMessages(prev => prev.map(m => m.id === messageId ? failedMessage : m));
      setIsSending(false);
      return;
    }

    // Send file chunks and track failures
    let allChunksSent = true;
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
      const chunk = arrayBuffer.slice(start, end);
      
      const chunkSent = webrtcManager.sendMessage(contact.peerId, {
        type: 'file',
        messageId: `${messageId}-chunk-${i}`,
        timestamp,
        data: {
          fileId: messageId,
          chunkIndex: i,
          chunkData: Array.from(new Uint8Array(chunk)),
        },
      });
      
      if (!chunkSent) {
        allChunksSent = false;
        break;
      }
    }

    const finalMessage = {
      ...message,
      status: allChunksSent ? 'sent' : 'failed',
    } as Message;
    
    await saveMessage(finalMessage);
    setMessages(prev => prev.map(m => m.id === messageId ? finalMessage : m));
    setIsSending(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              data-testid="button-back"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover-elevate active-elevate-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {contact.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold" data-testid="text-contact-name">
              {contact.displayName}
            </h2>
            <p className="text-xs text-muted-foreground" data-testid="text-contact-status">
              {contact.status === "online" ? "Online" : contact.status === "connecting" ? "Connecting..." : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            data-testid="button-more-options"
            variant="ghost"
            size="icon"
            className="hover-elevate active-elevate-2"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">👋</span>
              </div>
              <p className="text-muted-foreground text-sm">
                No messages yet
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Send a message or greeting sticker below!
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const showTimestamp = index === 0 || 
                messages[index - 1].timestamp < message.timestamp - 300000; // 5 mins

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(message.timestamp, "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex gap-2 mb-2",
                      message.sender === "me" ? "justify-end" : "justify-start"
                    )}
                    data-testid={`message-${message.id}`}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm",
                        message.sender === "me"
                          ? "bg-accent text-accent-foreground"
                          : "bg-card border"
                      )}
                    >
                      {message.type === "text" && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                      {message.type === "image" && message.fileData && (
                        <div className="space-y-2">
                          <img
                            src={message.fileData.url}
                            alt={message.fileData.name}
                            className="rounded-2xl max-w-full h-auto cursor-pointer"
                            onClick={() => window.open(message.fileData?.url)}
                          />
                          <a
                            href={message.fileData.url}
                            download={message.fileData.name}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Download {message.fileData.name}
                          </a>
                        </div>
                      )}
                      {message.type === "video" && message.fileData && (
                        <div className="space-y-2">
                          <video
                            src={message.fileData.url}
                            controls
                            className="rounded-2xl max-w-full h-auto"
                          />
                          <a
                            href={message.fileData.url}
                            download={message.fileData.name}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Download {message.fileData.name}
                          </a>
                        </div>
                      )}
                      {message.type === "audio" && message.fileData && (
                        <div className="space-y-2">
                          <audio
                            src={message.fileData.url}
                            controls
                            className="w-full"
                          />
                          <a
                            href={message.fileData.url}
                            download={message.fileData.name}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Download {message.fileData.name}
                          </a>
                        </div>
                      )}
                      {message.type === "file" && message.fileData && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{message.fileData.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(message.fileData.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <a
                            href={message.fileData.url}
                            download={message.fileData.name}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1",
                          message.sender === "me" ? "justify-end" : "justify-start"
                        )}
                      >
                        <span className="text-xs opacity-60">
                          {format(message.timestamp, "h:mm a")}
                        </span>
                        {message.sender === "me" && (
                          <span className="text-xs opacity-60">
                            {message.status === "read" ? (
                              <CheckCheck className="h-3 w-3 inline" />
                            ) : (
                              <Check className="h-3 w-3 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-end gap-2">
          <Button
            data-testid="button-attach-file"
            variant="ghost"
            size="icon"
            onClick={handleFileSelect}
            className="hover-elevate active-elevate-2 flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                data-testid="button-emoji"
                variant="ghost"
                size="icon"
                className="hover-elevate active-elevate-2 flex-shrink-0"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none" side="top" align="start">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </PopoverContent>
          </Popover>

          <div className="flex-1 relative">
            <Textarea
              data-testid="input-message"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none pr-12 rounded-3xl"
              rows={1}
            />
          </div>

          <Button
            data-testid="button-send-message"
            size="icon"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className="flex-shrink-0 rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />
      </div>
    </div>
  );
}
