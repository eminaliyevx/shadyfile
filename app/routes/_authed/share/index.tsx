import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/hooks";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/share/")({
  component: CreateShareRoom,
});

function CreateShareRoom() {
  const { session } = useSession();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const createRoom = () => {
    setIsCreating(true);

    // Create WebSocket connection
    const ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/_ws`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
      // Request to create a new room
      ws.send(
        JSON.stringify({
          type: "create-room",
          username: session?.user.username || "Anonymous",
        }),
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "room-created") {
        // Navigate to the new room
        navigate({ to: `/share/${message.roomId}` });
      } else if (message.type === "error") {
        toast.error(message.message || "Failed to create room");
        setIsCreating(false);
      }
    };

    ws.onerror = () => {
      toast.error("Connection error. Please try again.");
      setIsCreating(false);
    };

    ws.onclose = () => {
      if (isCreating) {
        setIsCreating(false);
      }
    };
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="mb-6 text-2xl font-bold">Secure File Sharing</h1>

      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Create a Sharing Room</CardTitle>
          <CardDescription>
            Create a private room to securely share files with another person
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="mb-6 rounded-full bg-primary/10 p-6">
            <Share2 className="h-12 w-12 text-primary" />
          </div>

          <p className="mb-6 text-center text-sm text-muted-foreground">
            When you create a room, you'll get a unique link that you can share
            with one other person. Files are transferred directly between
            browsers with end-to-end encryption.
          </p>

          <Button
            className="w-full"
            size="lg"
            onClick={createRoom}
            disabled={isCreating}
            loading={isCreating}
          >
            Create Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
