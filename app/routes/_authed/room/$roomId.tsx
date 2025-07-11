import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileInput,
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
} from "@/components/ui/file-uploader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDialog } from "@/context";
import { ECDHKeyPair, useCopyToClipboard, useECDH, useSession } from "@/hooks";
import {
  base64ToUint8Array,
  cn,
  decryptData,
  encryptData,
  formatFileSize,
  generateRandomKey,
  Nullable,
  safeJsonParse,
  selfOrUndefined,
  uint8ArrayToBase64,
  WebSocketMessage,
  WebSocketMessageErrorEnum,
  webSocketMessageSchema,
} from "@/lib";
import { getIceServers } from "@/lib/server/fn";
import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, Copy, Paperclip, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import Peer from "simple-peer";
import { toast } from "sonner";
import streamsaver from "streamsaver";

declare module "simple-peer" {
  interface Instance {
    _channel: RTCDataChannel;
  }
}

type RoomUser = {
  id: string;
  username: string;
  isHost: boolean;
};

type FileTransfer = {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "transferring" | "completed" | "error";
  error?: string;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  downloadUrl?: string;
};

type FileInfoMessage = {
  type: "file-info";
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
};

type ChunkInfoMessage = {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  isLastChunk: boolean;
};

type FileErrorMessage = {
  type: "file-error";
  fileId: string;
  error: string;
};

const CHUNK_SIZE = 16 * 1024;

const WEBSOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/_ws`
    : "";

export const Route = createFileRoute("/_authed/room/$roomId")({
  component: RoomComponent,
  loader: async () => {
    const iceServers = await getIceServers();

    return {
      iceServers,
    };
  },
  ssr: false,
});

function RoomComponent() {
  const { roomId } = Route.useParams();

  const { iceServers } = Route.useLoaderData();

  const { session } = useSession();

  const { copy } = useCopyToClipboard();

  const { open } = useDialog();

  const { generateKeyPair, importPublicKey, deriveSharedSecret, deriveAESKey } =
    useECDH();

  const [you, setYou] = useState<Nullable<RoomUser>>(null);
  const [peer, setPeer] = useState<Nullable<RoomUser>>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const [keyPair, setKeyPair] = useState<Nullable<ECDHKeyPair>>(null);
  const [secretKey, setSecretKey] = useState<Nullable<CryptoKey>>(null);

  const [selectedFiles, setSelectedFiles] = useState<Nullable<File[]>>(null);
  const [sendingFiles, setSendingFiles] = useState<FileTransfer[]>([]);
  const [receivingFiles, setReceivingFiles] = useState<FileTransfer[]>([]);

  const webRTCPeer = useRef<Nullable<Peer.Instance>>(null);
  const sendJsonMessageRef = useRef<SendJsonMessage | null>(null);

  const currentFileReceiving =
    useRef<Nullable<{ fileId: string; chunkIndex: number }>>(null);

  const receivingFilesRef = useRef<FileTransfer[]>([]);

  useEffect(() => {
    const fn = async () => {
      const keyPair = await generateKeyPair();

      setKeyPair(keyPair);
    };

    fn();
  }, [generateKeyPair]);

  useEffect(() => {
    receivingFilesRef.current = receivingFiles;
  }, [receivingFiles]);

  const handleChunkData = useCallback(
    async (data: Uint8Array) => {
      try {
        // Read the length of chunk info (first 4 bytes)
        if (data.length < 4) {
          throw new Error("Invalid chunk data: too short");
        }

        const chunkInfoLength = new DataView(
          data.buffer,
          data.byteOffset,
          4,
        ).getUint32(0, true);

        if (data.length < 4 + chunkInfoLength) {
          throw new Error("Invalid chunk data: chunk info length mismatch");
        }

        // Extract chunk info JSON
        const chunkInfoBytes = data.slice(4, 4 + chunkInfoLength);
        const chunkInfoString = new TextDecoder().decode(chunkInfoBytes);
        const chunkInfo: ChunkInfoMessage = JSON.parse(chunkInfoString);

        // Extract actual chunk data
        let chunkData = data.slice(4 + chunkInfoLength);

        // Find the file being received
        const fileIndex = receivingFilesRef.current.findIndex(
          (f) => f.id === chunkInfo.fileId,
        );

        if (fileIndex < 0 || !receivingFilesRef.current[fileIndex].writer) {
          throw new Error("File not found or writer not available");
        }

        const file = receivingFilesRef.current[fileIndex];

        // Decrypt chunk if we have a shared secret key
        if (secretKey && chunkData.length > 16) {
          try {
            const iv = chunkData.slice(0, 16);
            const encryptedData = chunkData.slice(16);

            const decryptedData = await decryptData(
              encryptedData,
              secretKey,
              iv,
            );
            chunkData = new Uint8Array(decryptedData);
          } catch (decryptError) {
            console.error("Failed to decrypt chunk:", decryptError);
            throw new Error("Failed to decrypt chunk");
          }
        }

        // Write chunk to file
        if (!file.writer) {
          throw new Error("File writer not available");
        }
        await file.writer.write(chunkData);

        // Update progress
        const bytesReceived = (chunkInfo.chunkIndex + 1) * CHUNK_SIZE;
        const progress = Math.min(
          Math.round((bytesReceived / file.size) * 100),
          chunkInfo.isLastChunk ? 100 : 99,
        );

        setReceivingFiles((value) => {
          const newFiles = [...value];
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            progress,
            status: chunkInfo.isLastChunk ? "completed" : "transferring",
          };
          receivingFilesRef.current = newFiles;
          return newFiles;
        });

        // Complete the file if this is the last chunk
        if (chunkInfo.isLastChunk && file.writer) {
          file.writer.close();

          setReceivingFiles((value) => {
            const newFiles = [...value];
            newFiles[fileIndex] = {
              ...newFiles[fileIndex],
              writer: undefined,
            };
            receivingFilesRef.current = newFiles;
            return newFiles;
          });

          toast.success(`File "${file.name}" received successfully`);
        }

        // Update current receiving state
        currentFileReceiving.current = {
          fileId: chunkInfo.fileId,
          chunkIndex: chunkInfo.chunkIndex + 1,
        };
      } catch (error) {
        console.error("Failed to handle chunk data:", error);

        // Try to find the file and mark it as error
        if (currentFileReceiving.current) {
          const fileIndex = receivingFilesRef.current.findIndex(
            (f) => f.id === currentFileReceiving.current!.fileId,
          );

          if (fileIndex >= 0) {
            const file = receivingFilesRef.current[fileIndex];

            if (file.writer) {
              file.writer.abort();
            }

            setReceivingFiles((value) => {
              const newFiles = [...value];
              newFiles[fileIndex] = {
                ...newFiles[fileIndex],
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to process chunk",
                writer: undefined,
              };
              receivingFilesRef.current = newFiles;
              return newFiles;
            });

            // Send error back to sender
            if (webRTCPeer.current) {
              webRTCPeer.current.send(
                JSON.stringify({
                  type: "file-error",
                  fileId: currentFileReceiving.current.fileId,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Failed to process chunk",
                } satisfies FileErrorMessage),
              );
            }
          }
        }

        toast.error("Failed to save file chunk");
      }
    },
    [secretKey],
  );

  const handleDataChannelMessage = useCallback(
    async (data: unknown) => {
      try {
        if (typeof data === "string") {
          // Handle file info messages
          const message: FileInfoMessage | FileErrorMessage = JSON.parse(data);

          if (message.type === "file-info") {
            try {
              const fileStream = streamsaver.createWriteStream(
                message.fileName,
              );
              const writer = fileStream.getWriter();

              setReceivingFiles((value) => {
                const newFiles = [
                  ...value,
                  {
                    id: message.fileId,
                    name: message.fileName,
                    size: message.fileSize,
                    type: message.fileType,
                    progress: 0,
                    status: "pending",
                    writer: writer as WritableStreamDefaultWriter<Uint8Array>,
                  } satisfies FileTransfer,
                ];

                receivingFilesRef.current = newFiles;
                return newFiles;
              });

              currentFileReceiving.current = {
                fileId: message.fileId,
                chunkIndex: 0,
              };
            } catch (error) {
              console.error("Failed to create download stream:", error);

              if (webRTCPeer.current) {
                webRTCPeer.current.send(
                  JSON.stringify({
                    type: "file-error",
                    fileId: message.fileId,
                    error: "Failed to create download stream",
                  } satisfies FileErrorMessage),
                );
              }

              toast.error("Failed to create download stream");
            }
          } else if (message.type === "file-error") {
            const fileIndex = receivingFilesRef.current.findIndex(
              (f) => f.id === message.fileId,
            );

            if (fileIndex >= 0 && receivingFilesRef.current[fileIndex].writer) {
              receivingFilesRef.current[fileIndex].writer.abort();

              setReceivingFiles((value) => {
                const newFiles = [...value];
                newFiles[fileIndex] = {
                  ...newFiles[fileIndex],
                  status: "error",
                  error: message.error,
                  writer: undefined,
                };
                receivingFilesRef.current = newFiles;
                return newFiles;
              });
            }

            toast.error(`File transfer error: ${message.error}`);
          }
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          // Handle binary chunk data
          await handleChunkData(
            data instanceof ArrayBuffer ? new Uint8Array(data) : data,
          );
        }
      } catch (error) {
        console.error("Failed to process received data:", error);
        toast.error("Failed to process received data");
      }
    },
    [handleChunkData],
  );

  const handleRoomJoined = useCallback(
    async (message: Extract<WebSocketMessage, { type: "room-joined" }>) => {
      setYou({
        id: message.data.id,
        username: message.data.username,
        isHost: message.data.isHost,
      });

      if (message.data.isHost) {
        toast.success("You are host of the room");
      } else {
        toast.success("You have joined the room");
      }
    },
    [],
  );

  const handlePeerJoined = useCallback(
    async (message: Extract<WebSocketMessage, { type: "peer-joined" }>) => {
      setPeer({
        id: message.data.id,
        username: message.data.username,
        isHost: message.data.isHost,
      });

      const publicKey = await crypto.subtle.exportKey(
        "raw",
        keyPair?.publicKey as CryptoKey,
      );

      if (sendJsonMessageRef.current) {
        sendJsonMessageRef.current<WebSocketMessage>({
          type: "send-public-key",
          data: {
            roomId,
            publicKey: uint8ArrayToBase64(new Uint8Array(publicKey)),
          },
        });
      }

      toast.success("Peer joined the room");
    },
    [keyPair, roomId],
  );

  const handlePeerLeft = useCallback(() => {
    setPeer(null);

    setYou((you) => (you ? { ...you, isHost: true } : null));

    setConnected(false);

    toast.success("Peer left the room");
  }, []);

  const handlePeerSignal = useCallback(
    (message: Extract<WebSocketMessage, { type: "peer-signal" }>) => {
      if (message.data.to !== you?.id) {
        return;
      }

      setLoading(true);

      if (!webRTCPeer.current && !you.isHost) {
        const rtcPeer = new Peer({
          initiator: false,
          trickle: false,
          objectMode: true,
          config: { iceServers: iceServers as RTCIceServer[] },
        });

        webRTCPeer.current = rtcPeer;

        webRTCPeer.current.on("signal", (data) => {
          if (sendJsonMessageRef.current) {
            sendJsonMessageRef.current<WebSocketMessage>({
              type: "peer-signal",
              data: {
                roomId,
                signal: data,
                from: you.id,
                to: message.data.from,
              },
            });
          }
        });

        webRTCPeer.current.on("connect", () => {
          setConnected(true);

          setLoading(false);

          if (webRTCPeer.current) {
            const dataChannel = webRTCPeer.current._channel;

            if (dataChannel) {
              dataChannel.onbufferedamountlow = () => {};
            }
          }

          toast.success("Connection established");
        });

        webRTCPeer.current.on("data", (data) => {
          handleDataChannelMessage(data);
        });

        webRTCPeer.current.on("close", () => {
          setConnected(false);
        });

        webRTCPeer.current.on("error", (error) => {
          setLoading(false);

          toast.error("Connection error", {
            description: error.message,
          });
        });
      }

      if (webRTCPeer.current) {
        webRTCPeer.current.signal(message.data.signal);
      }
    },
    [you, roomId, iceServers, handleDataChannelMessage],
  );

  const handlePublicKeyReceived = useCallback(
    async (
      message: Extract<WebSocketMessage, { type: "public-key-received" }>,
    ) => {
      const peerPublicKey = await importPublicKey(
        base64ToUint8Array(message.data.publicKey),
      );

      const sharedSecret = await deriveSharedSecret(
        keyPair?.privateKey as CryptoKey,
        peerPublicKey,
      );

      const aesKey = await deriveAESKey(sharedSecret);

      setSecretKey(aesKey);
    },
    [keyPair, importPublicKey, deriveSharedSecret, deriveAESKey],
  );

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case "room-joined":
          handleRoomJoined(message);
          break;

        case "peer-joined":
          handlePeerJoined(message);
          break;

        case "peer-left":
          handlePeerLeft();
          break;

        case "peer-signal":
          handlePeerSignal(message);
          break;

        case "public-key-received":
          handlePublicKeyReceived(message);
          break;

        case "error":
          toast.error(message.data?.message ?? "An error occurred");
          break;
      }
    },
    [
      handleRoomJoined,
      handlePeerJoined,
      handlePeerLeft,
      handlePeerSignal,
      handlePublicKeyReceived,
    ],
  );

  const { sendJsonMessage } = useWebSocket<WebSocketMessage>(WEBSOCKET_URL, {
    onOpen: () => {
      sendJsonMessage<WebSocketMessage>({
        type: "join-room",
        data: {
          id: session?.user.id as string,
          username: session?.user.username as string,
          roomId,
        },
      });
    },
    onMessage: (event) => {
      try {
        const message = webSocketMessageSchema.parse(safeJsonParse(event.data));

        handleMessage(message);
      } catch {
        toast.error(WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_0);
      }
    },
    onError: () => {
      toast.error(WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_5);
    },
  });

  useEffect(() => {
    sendJsonMessageRef.current = sendJsonMessage;

    return () => {
      if (webRTCPeer.current) {
        webRTCPeer.current.destroy();
        webRTCPeer.current = null;
      }
    };
  }, [sendJsonMessage]);

  function handleCopy() {
    copy(location.href)
      .then(() => {
        toast.success("Room link copied to clipboard.");
      })
      .catch(() => {
        toast.error("Room link could not be copied to clipboard.");
      });
  }

  function handleOpenQrCode() {
    open({
      content: () => (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room QR Code</DialogTitle>

            <DialogDescription>
              Scan the QR code below to join the room.
            </DialogDescription>
          </DialogHeader>

          <div className="grid place-items-center bg-white p-4">
            <QRCodeSVG value={location.href} className="max-w-64" />
          </div>
        </DialogContent>
      ),
    });
  }

  const handleConnect = useCallback(() => {
    if (!peer || !you?.isHost) {
      return;
    }

    setLoading(true);

    const rtcPeer = new Peer({
      initiator: true,
      trickle: false,
      objectMode: true,
      config: { iceServers: iceServers as RTCIceServer[] },
    });

    webRTCPeer.current = rtcPeer;

    webRTCPeer.current.on("signal", (data) => {
      sendJsonMessage<WebSocketMessage>({
        type: "peer-signal",
        data: {
          roomId,
          signal: data,
          from: you.id,
          to: peer.id,
        },
      });
    });

    webRTCPeer.current.on("connect", () => {
      setConnected(true);

      setLoading(false);

      if (webRTCPeer.current) {
        const dataChannel = webRTCPeer.current._channel;

        if (dataChannel) {
          dataChannel.onbufferedamountlow = () => {};
        }
      }

      toast.success("Connection established");
    });

    webRTCPeer.current.on("data", (data) => {
      handleDataChannelMessage(data);
    });

    webRTCPeer.current.on("close", () => {
      setConnected(false);
    });

    webRTCPeer.current.on("error", (error) => {
      setLoading(false);

      toast.error("Connection error", {
        description: error.message,
      });
    });
  }, [
    peer,
    you,
    roomId,
    iceServers,
    sendJsonMessage,
    handleDataChannelMessage,
  ]);

  const sendFiles = useCallback(async () => {
    if (!connected || !webRTCPeer.current || !selectedFiles) {
      return;
    }

    for (const file of selectedFiles) {
      const fileId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      setSendingFiles((value) => [
        ...value,
        {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "pending",
        },
      ]);

      try {
        // Send file info first
        const fileInfo: FileInfoMessage = {
          type: "file-info",
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks,
        };

        webRTCPeer.current.send(JSON.stringify(fileInfo));

        setSendingFiles((value) => {
          return value.map((v) => {
            if (v.id === fileId) {
              return { ...v, status: "transferring" };
            }
            return v;
          });
        });

        let transferredBytes = 0;

        // Send chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const isLastChunk = chunkIndex === totalChunks - 1;

          const chunk = await file.slice(start, end).arrayBuffer();

          // Prepare chunk info
          const chunkInfo: ChunkInfoMessage = {
            fileId,
            chunkIndex,
            totalChunks,
            isLastChunk,
          };

          // Encrypt chunk if we have a shared secret key
          let chunkToSend: Uint8Array;

          if (secretKey) {
            try {
              const iv = generateRandomKey(16);
              const encryptedData = await encryptData(chunk, secretKey, iv);

              // Combine IV + encrypted data
              const combinedData = new Uint8Array(
                iv.length + encryptedData.byteLength,
              );
              combinedData.set(iv, 0);
              combinedData.set(new Uint8Array(encryptedData), iv.length);

              chunkToSend = combinedData;
            } catch (error) {
              console.error("Failed to encrypt chunk:", error);
              throw new Error("Failed to encrypt file chunk");
            }
          } else {
            // Send unencrypted if no shared key
            chunkToSend = new Uint8Array(chunk);
          }

          // Create the binary message: [4 bytes length][chunk info JSON][chunk data]
          const chunkInfoString = JSON.stringify(chunkInfo);
          const chunkInfoBytes = new TextEncoder().encode(chunkInfoString);

          // Create length prefix (4 bytes, little endian)
          const lengthBuffer = new ArrayBuffer(4);
          new DataView(lengthBuffer).setUint32(0, chunkInfoBytes.length, true);

          // Combine all parts
          const binaryMessage = new Uint8Array(
            4 + chunkInfoBytes.length + chunkToSend.length,
          );
          binaryMessage.set(new Uint8Array(lengthBuffer), 0);
          binaryMessage.set(chunkInfoBytes, 4);
          binaryMessage.set(chunkToSend, 4 + chunkInfoBytes.length);

          // Send the binary message
          webRTCPeer.current.send(binaryMessage);

          transferredBytes += chunk.byteLength;

          const progress = Math.round((transferredBytes / file.size) * 100);

          setSendingFiles((value) => {
            return value.map((v) => {
              if (v.id === fileId) {
                return { ...v, progress };
              }
              return v;
            });
          });

          // Add a small delay to prevent overwhelming the data channel
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Check if peer is still connected
          if (!webRTCPeer.current || webRTCPeer.current.destroyed) {
            throw new Error("Connection lost during file transfer");
          }
        }

        setSendingFiles((value) => {
          return value.map((v) => {
            if (v.id === fileId) {
              return { ...v, progress: 100, status: "completed" };
            }
            return v;
          });
        });

        toast.success(`File "${file.name}" sent successfully`);
      } catch (error) {
        console.error("Failed to send file:", error);

        setSendingFiles((value) => {
          return value.map((v) => {
            if (v.id === fileId) {
              return {
                ...v,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to send file",
              };
            }
            return v;
          });
        });

        // Send error message to receiver
        if (webRTCPeer.current && !webRTCPeer.current.destroyed) {
          try {
            webRTCPeer.current.send(
              JSON.stringify({
                type: "file-error",
                fileId,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to send file",
              } satisfies FileErrorMessage),
            );
          } catch (sendError) {
            console.error("Failed to send error message:", sendError);
          }
        }

        toast.error(`Failed to send file "${file.name}"`);
      }
    }

    // Clear selected files after processing all files
    setSelectedFiles(null);
  }, [connected, selectedFiles, secretKey]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">P2P File Sharing Room</CardTitle>

              <CardDescription className="text-base">
                You can share files with the person you connect to directly
                without any third party involvement. Your room will expire in 24
                hours.
              </CardDescription>
            </div>

            <div className="space-x-2">
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="size-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={handleOpenQrCode}>
                <QrCode className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!you ? (
            <>
              <Skeleton className="mb-2 h-3" />
              <Skeleton className="h-3" />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="order-1 sm:order-0">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>

                    <span className="text-lg/none text-muted-foreground">
                      You are online as <strong>{you?.username}</strong>
                    </span>

                    {you.isHost && <Badge className="leading-none">Host</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        peer ? "bg-green-500" : "bg-gray-500",
                      )}
                    ></div>

                    <span className="text-lg/none text-muted-foreground">
                      {peer ? (
                        <>
                          <strong>{peer.username}</strong> is online
                        </>
                      ) : (
                        "No peer connected"
                      )}
                    </span>

                    {peer?.isHost && (
                      <Badge className="leading-none">Host</Badge>
                    )}
                  </div>
                </div>

                {connected && (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <Button className="cursor-default bg-green-500 hover:bg-green-500">
                      Connected
                    </Button>

                    {secretKey && (
                      <Badge className="bg-blue-500 text-white">
                        🔐 E2E Encrypted
                      </Badge>
                    )}
                  </div>
                )}

                {!connected && (
                  <Button
                    onClick={handleConnect}
                    loading={loading}
                    disabled={!peer || !you.isHost}
                  >
                    {!peer
                      ? "Waiting for peer"
                      : you.isHost
                        ? "Connect"
                        : "Waiting for host"}
                  </Button>
                )}
              </div>

              {connected && (
                <>
                  <FileUploader
                    value={selectedFiles}
                    onValueChange={setSelectedFiles}
                    dropzoneOptions={{
                      multiple: true,
                      maxFiles: Infinity,
                    }}
                    className="mt-8 mb-4 rounded-lg"
                  >
                    <FileInput className="border-2 border-dashed border-border">
                      <div className="grid place-items-center p-8">
                        <CloudUpload className="size-12 text-muted-foreground" />

                        <span className="text-center text-sm text-muted-foreground">
                          <strong>Click to upload</strong> or drag and drop
                        </span>
                      </div>
                    </FileInput>

                    <FileUploaderContent>
                      {selectedFiles?.map((file, index) => (
                        <FileUploaderItem key={index} index={index}>
                          <Paperclip className="size-4" />

                          <span>{file.name}</span>
                        </FileUploaderItem>
                      ))}
                    </FileUploaderContent>
                  </FileUploader>

                  <Button
                    className="w-full"
                    disabled={!selectedFiles?.length}
                    onClick={sendFiles}
                  >
                    Send Files
                  </Button>

                  <Tabs defaultValue="send" className="w-full">
                    <TabsList className="mt-4 grid w-full grid-cols-2">
                      <TabsTrigger value="send">Send</TabsTrigger>
                      <TabsTrigger value="receive">Receive</TabsTrigger>
                    </TabsList>

                    <TabsContent value="send">
                      {sendingFiles.length > 0 ? (
                        <div className="mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {sendingFiles.map((file) => (
                                <TableRow key={file.id}>
                                  <TableCell className="flex items-center gap-2">
                                    <Paperclip className="size-4 text-muted-foreground" />

                                    <span className="truncate">
                                      {file.name}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    {formatFileSize(file.size)}
                                  </TableCell>

                                  <TableCell>
                                    {file.status === "pending" && (
                                      <Badge variant="outline">Pending</Badge>
                                    )}

                                    {file.status === "transferring" && (
                                      <Badge
                                        variant="secondary"
                                        className="flex items-center gap-1"
                                      >
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500 leading-none"></span>
                                        {file.progress}%
                                      </Badge>
                                    )}

                                    {file.status === "completed" && (
                                      <Badge className="border-transparent bg-green-500 text-white hover:bg-green-500">
                                        Completed
                                      </Badge>
                                    )}

                                    {file.status === "error" && (
                                      <Badge variant="destructive">Error</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="mt-4 grid place-items-center rounded-lg border-2 border-dashed px-4 py-12 text-center">
                          <Paperclip className="mb-2 h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No files have been sent yet
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="receive">
                      {receivingFiles.length > 0 ? (
                        <div className="mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {receivingFiles.map((file) => (
                                <TableRow key={file.id}>
                                  <TableCell className="flex items-center gap-2">
                                    <Paperclip className="size-4 text-muted-foreground" />

                                    <span className="truncate">
                                      {file.name}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    {formatFileSize(file.size)}
                                  </TableCell>

                                  <TableCell>
                                    {file.status === "pending" && (
                                      <Badge variant="outline">Pending</Badge>
                                    )}

                                    {file.status === "transferring" && (
                                      <Badge
                                        variant="secondary"
                                        className="flex items-center gap-1"
                                      >
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500 leading-none"></span>
                                        {file.progress}%
                                      </Badge>
                                    )}

                                    {file.status === "completed" && (
                                      <Badge className="border-transparent bg-green-500 text-white hover:bg-green-500">
                                        Completed
                                      </Badge>
                                    )}

                                    {file.status === "error" && (
                                      <Badge variant="destructive">Error</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="mt-4 grid place-items-center rounded-lg border-2 border-dashed px-4 py-12 text-center">
                          <Paperclip className="mb-2 h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No files have been received yet
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoomUser({ user }: { user: RoomUser }) {
  const { session } = useSession();

  return (
    <Avatar className="size-32 cursor-pointer">
      <AvatarImage src={selfOrUndefined(session?.user.image)} />

      <AvatarFallback>{user.username}</AvatarFallback>
    </Avatar>
  );
}
