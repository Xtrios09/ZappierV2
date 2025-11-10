import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Contact } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePeerConnection } from "@/lib/peer-connection-context";
import { cn } from "@/lib/utils";

interface ContactsListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
}

export function ContactsList({ contacts, selectedContactId, onSelectContact }: ContactsListProps) {
  const { connectionStatuses } = usePeerConnection();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Search bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <input
            type="search"
            data-testid="input-search-contacts"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-muted rounded-full text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </p>
            <p className="text-muted-foreground text-xs">
              {searchQuery ? "Try a different search term" : "Add a contact to start chatting"}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredContacts.map((contact) => {
              const connectionStatus = connectionStatuses.get(contact.id);
              const isOnline = connectionStatus === 'connected';
              
              return (
          <button
            key={contact.id}
            data-testid={`contact-${contact.id}`}
            onClick={() => onSelectContact(contact.id)}
            className={cn(
              "w-full p-3 rounded-2xl text-left transition-all hover-elevate active-elevate-2",
              selectedContactId === contact.id
                ? "bg-secondary"
                : "bg-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Avatar with status */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {contact.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-status-online rounded-full border-2 border-card" />
                )}
              </div>

              {/* Contact info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold truncate text-sm">
                    {contact.displayName}
                  </h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {contact.lastSeen && formatDistanceToNow(contact.lastSeen, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {connectionStatus === "connected" ? "Online" : 
                     connectionStatus === "connecting" ? "Connecting..." : 
                     connectionStatus === "failed" ? "Connection failed" : "Offline"}
                  </p>
                  {contact.unreadCount > 0 && (
                    <Badge
                      data-testid={`badge-unread-${contact.id}`}
                      variant="default"
                      className="h-5 min-w-5 px-1.5 text-xs rounded-full"
                    >
                      {contact.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
            )})}
          </div>
        </ScrollArea>
      )}
    </>
  );
}
