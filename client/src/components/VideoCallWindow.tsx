import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { Contact } from "@shared/schema";
import { cn } from "@/lib/utils";

interface VideoCallWindowProps {
  contact: Contact;
  isIncoming?: boolean;
  onEnd: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function VideoCallWindow({
  contact,
  isIncoming = false,
  onEnd,
  onAccept,
  onDecline,
}: VideoCallWindowProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"connecting" | "active">(
    isIncoming ? "connecting" : "connecting"
  );

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (callStatus === "active") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStatus]);

  useEffect(() => {
    // Request camera and microphone access
    async function setupLocalStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    }

    setupLocalStream();

    return () => {
      // Cleanup
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function toggleVideo() {
    setIsVideoEnabled((prev) => !prev);
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }

  function toggleAudio() {
    setIsAudioEnabled((prev) => !prev);
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
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
              <p className="text-sm text-muted-foreground">Incoming video call...</p>
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
    <div
      className={cn(
        "bg-background z-50 flex flex-col",
        isFullscreen ? "fixed inset-0" : "fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-96 md:h-[600px] md:rounded-3xl md:shadow-2xl"
      )}
    >
      {/* Remote video (full screen) */}
      <div className="relative flex-1 bg-gray-900">
        {callStatus === "connecting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Avatar className="h-32 w-32 mb-6">
              <AvatarFallback className="bg-primary/10 text-primary text-4xl font-semibold">
                {contact.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-white mb-2">{contact.displayName}</h2>
            <p className="text-gray-400 animate-pulse-subtle">Connecting...</p>
          </div>
        ) : (
          <video
            ref={remoteVideoRef}
            data-testid="video-remote"
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Top overlay - contact name & duration */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="font-semibold">{contact.displayName}</h3>
              {callStatus === "active" && (
                <p className="text-sm opacity-80">{formatDuration(callDuration)}</p>
              )}
            </div>
            <Button
              data-testid="button-fullscreen"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-20 right-4 w-32 h-40 md:w-40 md:h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
          <video
            ref={localVideoRef}
            data-testid="video-local"
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-card border-t">
        <div className="flex items-center justify-center gap-3">
          <Button
            data-testid="button-toggle-audio"
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="icon"
            onClick={toggleAudio}
            className="h-14 w-14 rounded-full hover-elevate active-elevate-2"
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            data-testid="button-toggle-video"
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="icon"
            onClick={toggleVideo}
            className="h-14 w-14 rounded-full hover-elevate active-elevate-2"
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
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
