import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Phone } from "lucide-react";
import type { Contact } from "@shared/schema";

interface AudioCallWindowProps {
  contact: Contact;
  isIncoming?: boolean;
  onEnd: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function AudioCallWindow({
  contact,
  isIncoming = false,
  onEnd,
  onAccept,
  onDecline,
}: AudioCallWindowProps) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"connecting" | "active">(
    isIncoming ? "connecting" : "connecting"
  );

  useEffect(() => {
    if (callStatus === "active") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStatus]);

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  if (isIncoming && callStatus === "connecting") {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-in-from-bottom">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {contact.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-1">{contact.displayName}</h2>
              <p className="text-sm text-muted-foreground">Incoming audio call...</p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                data-testid="button-decline-call"
                size="icon"
                variant="destructive"
                onClick={onDecline}
                className="h-16 w-16 rounded-full"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button
                data-testid="button-accept-call"
                size="icon"
                onClick={() => {
                  onAccept?.();
                  setCallStatus("active");
                }}
                className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-96 bg-card md:rounded-3xl md:shadow-2xl z-50 flex flex-col">
      {/* Call info */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Avatar className="h-28 w-28">
            <AvatarFallback className="bg-primary/20 text-primary text-4xl font-semibold">
              {contact.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{contact.displayName}</h2>
          {callStatus === "active" ? (
            <p className="text-lg text-muted-foreground">{formatDuration(callDuration)}</p>
          ) : (
            <p className="text-sm text-muted-foreground animate-pulse-subtle">Connecting...</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-t">
        <div className="flex items-center justify-center gap-3">
          <Button
            data-testid="button-toggle-audio"
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="icon"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="h-14 w-14 rounded-full hover-elevate active-elevate-2"
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            data-testid="button-toggle-speaker"
            variant="secondary"
            size="icon"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className="h-14 w-14 rounded-full hover-elevate active-elevate-2"
          >
            {isSpeakerOn ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>

          <Button
            data-testid="button-end-call"
            variant="destructive"
            size="icon"
            onClick={onEnd}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
