import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getProfile, getAllContacts } from "@/lib/user-storage";
import type { UserProfile, Contact } from "@shared/schema";
import { ContactsList } from "@/components/ContactsList";
import { ChatWindow } from "@/components/ChatWindow";
import { AddContactDialog } from "@/components/AddContactDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatApp() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    loadData();

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadData() {
    const userProfile = await getProfile();
    if (!userProfile) {
      setLocation("/");
      return;
    }
    setProfile(userProfile);

    const allContacts = await getAllContacts();
    setContacts(allContacts);
  }

  function handleSelectContact(contactId: string) {
    setSelectedContactId(contactId);
    if (isMobileView) {
      setShowMobileChat(true);
    }
  }

  function handleBackToContacts() {
    setShowMobileChat(false);
    setSelectedContactId(null);
  }

  function handleContactAdded() {
    loadData();
    setShowAddContact(false);
  }

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  // Mobile view: show either contacts or chat
  if (isMobileView) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {showMobileChat && selectedContact ? (
          <ChatWindow
            contact={selectedContact}
            profile={profile}
            onBack={handleBackToContacts}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-card">
              <h1 className="text-xl font-semibold">Messages</h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  data-testid="button-add-contact"
                  size="icon"
                  onClick={() => setShowAddContact(true)}
                  className="hover-elevate active-elevate-2"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Contacts List */}
            <ContactsList
              contacts={contacts}
              selectedContactId={selectedContactId}
              onSelectContact={handleSelectContact}
            />
          </>
        )}

        <AddContactDialog
          open={showAddContact}
          onOpenChange={setShowAddContact}
          onContactAdded={handleContactAdded}
          currentUserId={profile?.id || ""}
        />
      </div>
    );
  }

  // Desktop view: side-by-side layout
  return (
    <div className="h-screen flex bg-background">
      {/* Contacts Sidebar */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Messages</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              data-testid="button-add-contact"
              size="icon"
              onClick={() => setShowAddContact(true)}
              className="hover-elevate active-elevate-2"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Contacts List */}
        <ContactsList
          contacts={contacts}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <ChatWindow
            contact={selectedContact}
            profile={profile}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="space-y-4 max-w-sm">
              <div className="h-20 w-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                <MessageSquarePlus className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No chat selected</h3>
                <p className="text-muted-foreground text-sm">
                  Select a conversation from the sidebar or add a new contact to start chatting
                </p>
              </div>
              <Button onClick={() => setShowAddContact(true)}>
                Add Contact
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        onContactAdded={handleContactAdded}
        currentUserId={profile?.id || ""}
      />
    </div>
  );
}
