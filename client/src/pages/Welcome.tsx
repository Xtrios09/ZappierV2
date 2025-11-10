import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { nanoid } from "nanoid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Scan, Copy, Check, Smartphone } from "lucide-react";
import { saveProfile, getProfile } from "@/lib/user-storage";
import type { UserProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"name" | "id">("name");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const existing = await getProfile();
    if (existing) {
      setProfile(existing);
      setStep("id");
    }
  }

  async function handleCreateProfile() {
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name to continue",
        variant: "destructive",
      });
      return;
    }

    const newProfile: UserProfile = {
      id: nanoid(12),
      displayName: displayName.trim(),
      createdAt: Date.now(),
    };

    await saveProfile(newProfile);
    setProfile(newProfile);
    setStep("id");
    toast({
      title: "Profile created!",
      description: `Welcome, ${newProfile.displayName}!`,
    });
  }

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

  function handleContinue() {
    setLocation("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-slide-in-from-bottom">
        {/* Logo/Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl transition-transform hover:scale-105">
              <Lock className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">SecureChat</h1>
          <p className="text-muted-foreground">
            End-to-end encrypted peer-to-peer messaging
          </p>
        </div>

        {step === "name" ? (
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Create your profile to start chatting securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </label>
                <Input
                  id="displayName"
                  data-testid="input-display-name"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
                  className="text-base"
                  autoFocus
                />
              </div>

              <Button
                data-testid="button-create-profile"
                onClick={handleCreateProfile}
                className="w-full"
                size="lg"
              >
                Continue
              </Button>

              <div className="pt-6 space-y-3">
                <div className="flex items-start gap-3 text-sm text-muted-foreground transition-transform hover:translate-x-1">
                  <Lock className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                  <p>All your data is stored locally on your device</p>
                </div>
                <div className="flex items-start gap-3 text-sm text-muted-foreground transition-transform hover:translate-x-1">
                  <Smartphone className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                  <p>No account or phone number required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Your Unique ID</CardTitle>
              <CardDescription>
                Share this with others to connect securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={profile?.id || ""}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* ID Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Your ID
                </label>
                <div className="flex gap-2">
                  <Input
                    data-testid="text-user-id"
                    value={profile?.id || ""}
                    readOnly
                    className="font-mono text-center text-sm"
                  />
                  <Button
                    data-testid="button-copy-id"
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

              <div className="grid grid-cols-2 gap-3">
                <Button
                  data-testid="button-scan-qr"
                  variant="outline"
                  onClick={() => setLocation("/scan")}
                  className="hover-elevate active-elevate-2"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scan QR
                </Button>
                <Button
                  data-testid="button-continue"
                  onClick={handleContinue}
                >
                  Continue
                </Button>
              </div>

              <div className="pt-2">
                <p className="text-xs text-center text-muted-foreground">
                  Others can scan your QR code or type your ID to connect
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            No data collection • All messages encrypted • Privacy first
          </p>
        </div>
      </div>
    </div>
  );
}
