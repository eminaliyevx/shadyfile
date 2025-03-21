import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  FileIcon,
  Send,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Define types for our file transfer
type FileTransfer = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "transferring" | "completed" | "error";
  error?: string;
};

type PeerMessage = {
  type: "file-info" | "file-chunk" | "file-complete" | "file-error" | "chat";
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  data?: ArrayBuffer | string;
  message?: string;
};

// Create the route
export const Route = createFileRoute("/_authed/share/$roomId")({
  component: ShareRoom,
});

// Main component
function ShareRoom() {
  const { session } = useSession();
  const params = Route.useParams();
  const navigate = useNavigate();
  const { copy } = useCopyToClipboard();

  // WebSocket and WebRTC references
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const fileChunksRef = useRef<{ [key: string]: ArrayBuffer[] }>({});

  // State for room and connection
  const [roomId] = useState<string>(params.roomId);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [peerUsername, setPeerUsername] = useState<string>("");

  // State for file transfers
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendingFiles, setSendingFiles] = useState<FileTransfer[]>([]);
  const [receivingFiles, setReceivingFiles] = useState<FileTransfer[]>([]);

  // Constants for file chunking
  const CHUNK_SIZE = 16 * 1024; // 16KB chunks

  // Initialize the room connection
// In the useEffect for WebSocket connection in app/routes/_authed/share/[roomId].tsx

useEffect(() => {
  // Create WebSocket connection
  const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/_ws`);
  wsRef.current = ws;
  
  // Set up WebSocket event handlers
  ws.onopen = () => {
    console.log("WebSocket connected");
    // Join the room
    ws.send(JSON.stringify({
      type: 'join-room',
      roomId,
      username: session?.user.username || 'Anonymous',
    }));
  };
  
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'room-joined':
        setIsHost(message.isHost);
        setIsConnecting(false);
        break;
        
      case 'peer-joined':
        setPeerUsername(message.username);
        // If we're the host, initiate the WebRTC connection
        if (message.isHost) {
          initiatePeerConnection();
        }
        break;
        
      // Handle other message types...
    }
  };
  
  // Rest of the WebSocket event handlers...
}, [roomId, session?.user.username, navigate]);

  // Initialize WebRTC peer connection
  const setupPeerConnection = async () => {
    // Create a new RTCPeerConnection
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnectionRef.current = peerConnection;

    // Set up data channel for file transfer
    const dataChannel = peerConnection.createDataChannel("fileTransfer", {
      ordered: true,
    });

    setupDataChannel(dataChannel);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(
          JSON.stringify({
            type: "ice-candidate",
            roomId,
            candidate: event.candidate,
          }),
        );
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        setIsConnected(true);
        toast.success(`Connected to ${peerUsername}`);
      } else if (
        ["disconnected", "failed", "closed"].includes(
          peerConnection.connectionState,
        )
      ) {
        setIsConnected(false);
        toast.error(`Disconnected from peer`);
      }
    };

    // Handle data channel creation by the peer
    peerConnection.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    return peerConnection;
  };

  // Initiate the peer connection as the host
  const initiatePeerConnection = async () => {
    await setupPeerConnection();

    // Create an offer
    const offer = await peerConnectionRef.current!.createOffer();
    await peerConnectionRef.current!.setLocalDescription(offer);

    // Send the offer to the peer
    wsRef.current?.send(
      JSON.stringify({
        type: "webrtc-offer",
        roomId,
        offer,
      }),
    );
  };

  // Set up the data channel for file transfer
  const setupDataChannel = (dataChannel: RTCDataChannel) => {
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log("Data channel opened");
      setIsConnected(true);
    };

    dataChannel.onclose = () => {
      console.log("Data channel closed");
      setIsConnected(false);
    };

    dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
      toast.error("Data channel error");
    };

    dataChannel.onmessage = async (event) => {
      // Handle incoming messages
      try {
        if (typeof event.data === "string") {
          // Handle JSON messages
          const message: PeerMessage = JSON.parse(event.data);

          switch (message.type) {
            case "file-info":
              // Initialize a new file transfer
              if (message.fileId && message.fileName && message.fileSize) {
                fileChunksRef.current[message.fileId] = [];

                setReceivingFiles((prev) => [
                  ...prev,
                  {
                    id: message.fileId!,
                    file: new File([], message.fileName!, {
                      type: message.fileType,
                    }),
                    progress: 0,
                    status: "pending",
                  },
                ]);

                // Acknowledge that we're ready to receive the file
                dataChannel.send(
                  JSON.stringify({
                    type: "file-info",
                    fileId: message.fileId,
                    status: "ready",
                  }),
                );
              }
              break;

            case "file-complete":
              if (message.fileId) {
                // Combine all chunks into a single file
                const fileId = message.fileId;
                const chunks = fileChunksRef.current[fileId];

                if (chunks) {
                  // Combine chunks into a single blob
                  const blob = new Blob(chunks, { type: message.fileType });

                  // Update the receiving file
                  setReceivingFiles((prev) =>
                    prev.map((file) => {
                      if (file.id === fileId) {
                        // Create a File object from the Blob
                        const newFile = new File(
                          [blob],
                          message.fileName || file.file.name,
                          {
                            type: message.fileType || file.file.type,
                          },
                        );

                        return {
                          ...file,
                          file: newFile,
                          progress: 100,
                          status: "completed",
                        };
                      }
                      return file;
                    }),
                  );

                  // Clean up the chunks
                  delete fileChunksRef.current[fileId];

                  toast.success(`Received file: ${message.fileName}`);
                }
              }
              break;

            case "file-error":
              if (message.fileId) {
                setReceivingFiles((prev) =>
                  prev.map((file) => {
                    if (file.id === message.fileId) {
                      return {
                        ...file,
                        status: "error",
                        error: message.message || "Unknown error",
                      };
                    }
                    return file;
                  }),
                );

                toast.error(`Error receiving file: ${message.message}`);
              }
              break;
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Handle binary data (file chunks)
          // The first 36 bytes contain the fileId (as a UUID string)
          const fileIdBytes = new Uint8Array(event.data.slice(0, 36));
          const fileId = new TextDecoder().decode(fileIdBytes);

          // The next 4 bytes contain the chunk index
          const chunkIndexBytes = new Uint8Array(event.data.slice(36, 40));
          const chunkIndex = new DataView(chunkIndexBytes.buffer).getUint32(
            0,
            true,
          );

          // The rest is the actual chunk data
          const chunkData = event.data.slice(40);

          // Store the chunk
          if (!fileChunksRef.current[fileId]) {
            fileChunksRef.current[fileId] = [];
          }

          fileChunksRef.current[fileId][chunkIndex] = chunkData;

          // Update progress
          setReceivingFiles((prev) =>
            prev.map((file) => {
              if (file.id === fileId) {
                // Calculate progress based on received chunks
                const receivedChunks =
                  fileChunksRef.current[fileId].filter(Boolean).length;
                const totalChunks = Math.ceil(file.file.size / CHUNK_SIZE) || 1;
                const progress = Math.min(
                  Math.round((receivedChunks / totalChunks) * 100),
                  99,
                );

                return {
                  ...file,
                  progress,
                  status: "transferring",
                };
              }
              return file;
            }),
          );
        }
      } catch (error) {
        console.error("Error processing message:", error);
        toast.error("Error processing received data");
      }
    };
  };

  // Clean up the peer connection
  const cleanupPeerConnection = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnected(false);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // Remove a selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Send files to peer
  const sendFiles = async () => {
    if (!isConnected || !dataChannelRef.current || selectedFiles.length === 0) {
      return;
    }

    // Process each selected file
    for (const file of selectedFiles) {
      const fileId = crypto.randomUUID();

      // Add to sending files
      setSendingFiles((prev) => [
        ...prev,
        {
          id: fileId,
          file,
          progress: 0,
          status: "pending",
        },
      ]);

      try {
        // Send file info to peer
        dataChannelRef.current.send(
          JSON.stringify({
            type: "file-info",
            fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          }),
        );

        // Read the file and send in chunks
        const reader = new FileReader();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // Process the file in chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          // Read the chunk as an ArrayBuffer
          const chunkArrayBuffer = await new Promise<ArrayBuffer>(
            (resolve, reject) => {
              reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
              reader.onerror = reject;
              reader.readAsArrayBuffer(chunk);
            },
          );

          // Create a buffer to hold the fileId, chunkIndex, and chunk data
          const buffer = new ArrayBuffer(40 + chunkArrayBuffer.byteLength);
          const view = new Uint8Array(buffer);

          // Add the fileId (as UTF-8 bytes)
          const fileIdBytes = new TextEncoder().encode(fileId);
          view.set(fileIdBytes, 0);

          // Add the chunk index (as a 32-bit integer)
          const chunkIndexView = new DataView(buffer, 36, 4);
          chunkIndexView.setUint32(0, chunkIndex, true);

          // Add the chunk data
          view.set(new Uint8Array(chunkArrayBuffer), 40);

          // Send the chunk
          dataChannelRef.current.send(buffer);

          // Update progress
          setSendingFiles((prev) =>
            prev.map((f) => {
              if (f.id === fileId) {
                const progress = Math.min(
                  Math.round(((chunkIndex + 1) / totalChunks) * 100),
                  99,
                );
                return {
                  ...f,
                  progress,
                  status: "transferring",
                };
              }
              return f;
            }),
          );

          // Small delay to prevent overwhelming the data channel
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Notify peer that the file is complete
        dataChannelRef.current.send(
          JSON.stringify({
            type: "file-complete",
            fileId,
            fileName: file.name,
            fileType: file.type,
          }),
        );

        // Update file status to completed
        setSendingFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return {
                ...f,
                progress: 100,
                status: "completed",
              };
            }
            return f;
          }),
        );

        toast.success(`Sent file: ${file.name}`);
      } catch (error) {
        console.error("Error sending file:", error);

        // Update file status to error
        setSendingFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return {
                ...f,
                status: "error",
                error: "Failed to send file",
              };
            }
            return f;
          }),
        );

        // Notify peer about the error
        dataChannelRef.current.send(
          JSON.stringify({
            type: "file-error",
            fileId,
            message: "Failed to send file",
          }),
        );

        toast.error(`Failed to send file: ${file.name}`);
      }
    }

    // Clear selected files after sending
    setSelectedFiles([]);
  };

  // Download a received file
  const downloadFile = (file: FileTransfer) => {
    if (file.status !== "completed") return;

    const url = URL.createObjectURL(file.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy room link to clipboard
  const copyRoomLink = () => {
    const url = `${window.location.origin}/_authed/share/${roomId}`;
    copy(url)
      .then(() => {
        toast.success("Room link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy room link");
      });
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Render loading state
  if (isConnecting) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connecting to room...</CardTitle>
            <CardDescription>
              Please wait while we set up your secure connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={undefined} className="h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Secure File Sharing Room</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Room Information</CardTitle>
              <CardDescription>
                {isHost ? "You created this room" : "You joined this room"}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={copyRoomLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isConnected ? "bg-green-500" : "bg-red-500",
                  )}
                />
                <span>Connection Status:</span>
                <span className="font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {peerUsername && (
                <div className="text-sm text-muted-foreground">
                  Connected to:{" "}
                  <span className="font-medium">{peerUsername}</span>
                </div>
              )}
            </div>

            {!isConnected && !peerUsername && (
              <div className="rounded-lg bg-muted p-4 text-center">
                <Share2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Share this room link with someone to start a secure file
                  transfer session
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">
            <Upload className="mr-2 h-4 w-4" />
            Send Files
          </TabsTrigger>
          <TabsTrigger value="receive">
            <Download className="mr-2 h-4 w-4" />
            Received Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Files</CardTitle>
              <CardDescription>
                Select files to send securely to your peer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File selection area */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6",
                    !isConnected && "opacity-50",
                  )}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={!isConnected}
                  />
                  <label
                    htmlFor="file-upload"
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center",
                      !isConnected && "cursor-not-allowed",
                    )}
                  >
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="mb-1 font-medium">Click to select files</p>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop files here
                    </p>
                  </label>
                </div>

                {/* Selected files list */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 font-medium">Selected Files</h3>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-6 w-6 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send button */}
                <Button
                  className="w-full"
                  disabled={!isConnected || selectedFiles.length === 0}
                  onClick={sendFiles}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Files
                </Button>
              </div>

              {/* Sending progress */}
              {sendingFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 font-medium">Sending Progress</h3>
                  <div className="space-y-4">
                    {sendingFiles.map((file) => (
                      <div key={file.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">
                              {file.file.name}
                            </span>
                          </div>
                          <span className="text-sm">
                            {file.status === "completed"
                              ? "Completed"
                              : file.status === "error"
                                ? "Error"
                                : `${file.progress}%`}
                          </span>
                        </div>
                        <Progress
                          value={file.progress}
                          className={cn(
                            "h-2",
                            file.status === "error" && "bg-destructive/20",
                          )}
                        />
                        {file.status === "error" && (
                          <p className="text-sm text-destructive">
                            {file.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Received Files</CardTitle>
              <CardDescription>
                Files sent to you will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receivingFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                  <Download className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No files received yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivingFiles.map((file) => (
                    <div key={file.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {file.file.name || "Unnamed file"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {file.status === "completed"
                              ? "Completed"
                              : file.status === "error"
                                ? "Error"
                                : `${file.progress}%`}
                          </span>
                          {file.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
