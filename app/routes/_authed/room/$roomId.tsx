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
import { useCopyToClipboard, useSession } from "@/hooks";
import {
  cn,
  formatFileSize,
  Nullable,
  safeJsonParse,
  selfOrUndefined,
  WebSocketMessage,
  WebSocketMessageErrorEnum,
  webSocketMessageSchema,
} from "@/lib";
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

type FileMessage = {
  type: "file-info" | "file-chunk" | "file-complete" | "file-error";
  fileId: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  error?: string;
};

const CHUNK_SIZE = 64 * 1024;

const WEBSOCKET_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/_ws`
    : "";

export const Route = createFileRoute("/_authed/room/$roomId")({
  component: RoomComponent,
  ssr: false,
});

function RoomComponent() {
  const { roomId } = Route.useParams();

  const { session } = useSession();

  const { copy } = useCopyToClipboard();

  const { open } = useDialog();

  const [you, setYou] = useState<Nullable<RoomUser>>(null);
  const [peer, setPeer] = useState<Nullable<RoomUser>>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Nullable<File[]>>(null);
  const [sendingFiles, setSendingFiles] = useState<FileTransfer[]>([]);
  const [receivingFiles, setReceivingFiles] = useState<FileTransfer[]>([]);

  const webRTCPeer = useRef<Nullable<Peer.Instance>>(null);
  const sendJsonMessageRef = useRef<SendJsonMessage | null>(null);

  const currentFileReceiving =
    useRef<Nullable<{ fileId: string; chunkIndex: number }>>(null);

  const receivingFilesRef = useRef<FileTransfer[]>([]);

  useEffect(() => {
    receivingFilesRef.current = receivingFiles;
  }, [receivingFiles]);

  const handleDataChannelMessage = useCallback((data: unknown) => {
    try {
      if (typeof data === "string") {
        const message: FileMessage = JSON.parse(data);

        switch (message.type) {
          case "file-info": {
            if (message.fileId && message.fileName && message.fileSize) {
              try {
                const fileStream = streamsaver.createWriteStream(
                  message.fileName,
                );
                const writer = fileStream.getWriter();

                setReceivingFiles((value) => {
                  const newFiles = [
                    ...value,
                    {
                      id: message.fileId as string,
                      name: message.fileName as string,
                      size: message.fileSize as number,
                      type: message.fileType as string,
                      progress: 0,
                      status: "pending",
                      writer: writer as WritableStreamDefaultWriter<Uint8Array>,
                    } satisfies FileTransfer,
                  ];

                  receivingFilesRef.current = newFiles;

                  return newFiles;
                });

                currentFileReceiving.current = {
                  fileId: message.fileId as string,
                  chunkIndex: 0,
                };
              } catch {
                if (webRTCPeer.current) {
                  webRTCPeer.current.send(
                    JSON.stringify({
                      type: "file-error",
                      fileId: message.fileId,
                      error: "Failed to create download stream",
                    }),
                  );
                }

                toast.error("Failed to create download stream");
              }
            }

            break;
          }

          case "file-chunk": {
            if (message.fileId) {
              currentFileReceiving.current = {
                fileId: message.fileId,
                chunkIndex: message.chunkIndex || 0,
              };
            }

            break;
          }

          case "file-complete": {
            if (message.fileId) {
              const fileIndex = receivingFilesRef.current.findIndex(
                (f) => f.id === message.fileId,
              );

              if (
                fileIndex >= 0 &&
                receivingFilesRef.current[fileIndex].writer
              ) {
                receivingFilesRef.current[fileIndex].writer.close();

                setReceivingFiles((value) => {
                  const newFiles = [...value];

                  newFiles[fileIndex] = {
                    ...newFiles[fileIndex],
                    progress: 100,
                    status: "completed",
                    writer: undefined,
                  };

                  receivingFilesRef.current = newFiles;

                  return newFiles;
                });
              }
            }

            break;
          }

          case "file-error":
            if (message.fileId) {
              const fileIndex = receivingFilesRef.current.findIndex(
                (f) => f.id === message.fileId,
              );

              if (
                fileIndex >= 0 &&
                receivingFilesRef.current[fileIndex].writer
              ) {
                receivingFilesRef.current[fileIndex].writer.abort();

                setReceivingFiles((value) => {
                  const newFiles = [...value];

                  newFiles[fileIndex] = {
                    ...newFiles[fileIndex],
                    status: "error",
                    error: message.error || "An error occurred",
                    writer: undefined,
                  };

                  receivingFilesRef.current = newFiles;

                  return newFiles;
                });
              }
            }

            break;
        }
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        if (currentFileReceiving.current) {
          const { fileId, chunkIndex } = currentFileReceiving.current;

          const fileIndex = receivingFilesRef.current.findIndex(
            (f) => f.id === fileId,
          );

          if (fileIndex >= 0 && receivingFilesRef.current[fileIndex].writer) {
            try {
              const chunk =
                data instanceof ArrayBuffer ? new Uint8Array(data) : data;

              receivingFilesRef.current[fileIndex].writer.write(chunk);

              const bytesReceived = (chunkIndex + 1) * CHUNK_SIZE;
              const totalSize = receivingFilesRef.current[fileIndex].size;
              const progress = Math.min(
                Math.round((bytesReceived / totalSize) * 100),
                99,
              );

              setReceivingFiles((value) => {
                const newFiles = [...value];

                newFiles[fileIndex] = {
                  ...newFiles[fileIndex],
                  progress,
                  status: "transferring",
                };

                return newFiles;
              });

              currentFileReceiving.current.chunkIndex++;
            } catch {
              setReceivingFiles((value) => {
                const newFiles = [...value];

                newFiles[fileIndex] = {
                  ...newFiles[fileIndex],
                  status: "error",
                  error: "Failed to write data",
                  writer: undefined,
                };

                return newFiles;
              });

              if (webRTCPeer.current) {
                webRTCPeer.current.send(
                  JSON.stringify({
                    type: "file-error",
                    fileId,
                    error: "Failed to write data",
                  }),
                );
              }

              toast.error("Failed to save file chunk");
            }
          }
        }
      }
    } catch {
      toast.error("Failed to process received data");
    }
  }, []);

  const handleRoomJoined = useCallback(
    (message: Extract<WebSocketMessage, { type: "room-joined" }>) => {
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
    (message: Extract<WebSocketMessage, { type: "peer-joined" }>) => {
      setPeer({
        id: message.data.id,
        username: message.data.username,
        isHost: message.data.isHost,
      });

      toast.success("Peer joined the room");
    },
    [],
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
    [you, roomId, handleDataChannelMessage],
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

        case "error":
          toast.error(message.data?.message ?? "An error occurred");
          break;
      }
    },
    [handleRoomJoined, handlePeerJoined, handlePeerLeft, handlePeerSignal],
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
  }, [peer, you, roomId, sendJsonMessage, handleDataChannelMessage]);

  const sendFiles = useCallback(async () => {
    if (!connected || !webRTCPeer.current || !selectedFiles) {
      return;
    }

    for (const file of selectedFiles) {
      const fileId = crypto.randomUUID();

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
        const fileInfo: FileMessage = {
          type: "file-info",
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
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

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        let transferredBytes = 0;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);

          const chunk = await file.slice(start, end).arrayBuffer();

          const chunkInfo: FileMessage = {
            type: "file-chunk",
            fileId,
            chunkIndex,
            totalChunks,
          };

          webRTCPeer.current?.send(JSON.stringify(chunkInfo));

          webRTCPeer.current?.send(new Uint8Array(chunk));

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

          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const fileComplete: FileMessage = {
          type: "file-complete",
          fileId,
        };

        webRTCPeer.current?.send(JSON.stringify(fileComplete));

        setSendingFiles((value) => {
          return value.map((v) => {
            if (v.id === fileId) {
              return { ...v, progress: 100, status: "completed" };
            }

            return v;
          });
        });

        toast.success("File sent successfully");
      } catch (error) {
        setSendingFiles((value) => {
          return value.map((v) => {
            if (v.id === fileId) {
              return { ...v, status: "error", error: String(error) };
            }

            return v;
          });
        });

        toast.error("Failed to send file");
      } finally {
        setSelectedFiles(null);
      }
    }
  }, [connected, selectedFiles]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">
                Private File Sharing Room
              </CardTitle>

              <CardDescription className="text-base">
                Share files securely between two users
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
                  <Button className="cursor-default bg-green-500 hover:bg-green-500">
                    Connected
                  </Button>
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

              <FileUploader
                value={selectedFiles}
                onValueChange={setSelectedFiles}
                dropzoneOptions={{
                  multiple: true,
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

                                <span className="truncate">{file.name}</span>
                              </TableCell>

                              <TableCell>{formatFileSize(file.size)}</TableCell>

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

                                <span className="truncate">{file.name}</span>
                              </TableCell>

                              <TableCell>{formatFileSize(file.size)}</TableCell>

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
