import { useState } from "react";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveContact } from "@/lib/user-storage";
import type { Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Scan, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded: () => void;
  currentUserId: string;
}

export function AddContactDialog({
  open,
  onOpenChange,
  onContactAdded,
  currentUserId,
}: AddContactDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [peerId, setPeerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddContact() {
    if (!peerId.trim() || !displayName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both peer ID and display name",
        variant: "destructive",
      });
      return;
    }

    if (peerId === currentUserId) {
      toast({
        title: "Invalid ID",
        description: "You cannot add yourself as a contact",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      const contact: Contact = {
        id: nanoid(),
        peerId: peerId.trim(),
        displayName: displayName.trim(),
        status: "offline",
        lastSeen: Date.now(),
        addedAt: Date.now(),
        unreadCount: 0,
      };

      await saveContact(contact);
      
      toast({
        title: "Contact added!",
        description: `${displayName} has been added to your contacts`,
      });

      setPeerId("");
      setDisplayName("");
      onContactAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  }

  function handleScanQR() {
    onOpenChange(false);
    setLocation("/scan");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Add a contact by entering their ID or scanning their QR code
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Enter ID</TabsTrigger>
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="peerId" className="text-sm font-medium">
                Peer ID
              </label>
              <Input
                id="peerId"
                data-testid="input-peer-id"
                placeholder="Enter their unique ID"
                value={peerId}
                onChange={(e) => setPeerId(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contactName" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="contactName"
                data-testid="input-contact-name"
                placeholder="Enter a name for this contact"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Button
              data-testid="button-add-contact-submit"
              onClick={handleAddContact}
              disabled={isAdding || !peerId.trim() || !displayName.trim()}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4 mt-4">
            <div className="text-center py-8 space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Scan className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Use your camera to scan a contact's QR code
                </p>
              </div>
              <Button
                data-testid="button-open-scanner"
                onClick={handleScanQR}
                className="w-full"
              >
                <Scan className="h-4 w-4 mr-2" />
                Open QR Scanner
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
