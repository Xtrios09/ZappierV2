import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import type { UserProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
}

export function ProfileDialog({ open, onOpenChange, profile }: ProfileDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  function handleCopyId() {
    if (profile) {
      navigator.clipboard.writeText(profile.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Your ID has been copied to clipboard",
      });
    }
  }

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
          <DialogDescription>
            Share your ID or QR code with others to connect
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-md">
              <QRCodeSVG
                value={profile.id}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Your ID
            </label>
            <div className="flex gap-2">
              <Input
                value={profile.id}
                readOnly
                className="font-mono text-center text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyId}
                className="hover-elevate active-elevate-2 flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Display Name
            </label>
            <Input
              value={profile.displayName}
              readOnly
              className="text-sm"
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Others can scan your QR code or enter your ID to add you as a contact
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
