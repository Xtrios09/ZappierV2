import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X } from "lucide-react";
import { nanoid } from "nanoid";
import { saveContact, getProfile } from "@/lib/user-storage";
import type { Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [scannedId, setScannedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const qrScanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    qrScanner.render(onScanSuccess, onScanError);
    setScanner(qrScanner);

    return () => {
      qrScanner.clear();
    };
  }, []);

  function onScanSuccess(decodedText: string) {
    setScannedId(decodedText);
    scanner?.clear();
    toast({
      title: "QR Code scanned!",
      description: "Enter a name for this contact",
    });
  }

  function onScanError(error: string) {
    // Ignore scan errors as they happen constantly during scanning
  }

  async function handleAddContact() {
    if (!scannedId || !displayName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a display name",
        variant: "destructive",
      });
      return;
    }

    const profile = await getProfile();
    if (!profile) {
      setLocation("/");
      return;
    }

    if (scannedId === profile.id) {
      toast({
        title: "Invalid ID",
        description: "You cannot add yourself as a contact",
        variant: "destructive",
      });
      return;
    }

    const contact: Contact = {
      id: nanoid(),
      peerId: scannedId,
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

    setLocation("/chat");
  }

  function handleCancel() {
    setScannedId("");
    setDisplayName("");
    const qrScanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );
    qrScanner.render(onScanSuccess, onScanError);
    setScanner(qrScanner);
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            data-testid="button-back"
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/chat")}
            className="hover-elevate active-elevate-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scan QR Code</h1>
            <p className="text-sm text-muted-foreground">
              Scan a contact's QR code to connect
            </p>
          </div>
        </div>

        {!scannedId ? (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Position QR code in frame</CardTitle>
              <CardDescription>
                The code will be scanned automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                id="qr-reader"
                data-testid="qr-scanner"
                className="w-full rounded-2xl overflow-hidden"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Add Contact</CardTitle>
              <CardDescription>
                QR code scanned successfully!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Scanned ID
                </label>
                <div className="flex gap-2">
                  <Input
                    data-testid="text-scanned-id"
                    value={scannedId}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    data-testid="button-cancel-scan"
                    variant="outline"
                    size="icon"
                    onClick={handleCancel}
                    className="hover-elevate active-elevate-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </label>
                <Input
                  id="displayName"
                  data-testid="input-display-name"
                  placeholder="Enter a name for this contact"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                  autoFocus
                />
              </div>

              <Button
                data-testid="button-add-contact"
                onClick={handleAddContact}
                className="w-full"
                disabled={!displayName.trim()}
              >
                Add Contact
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
