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
import { Progress } from "@/components/ui/progress";
import { useDialog } from "@/context";
import { useCopyToClipboard } from "@/hooks";
import {
  encryptData,
  exportKey,
  generateMasterKey,
  generateRandomKey,
  Nullable,
  uint8ArrayToBase64,
} from "@/lib";
import { uploadFileChunk } from "@/lib/server/fn";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CloudUpload, Copy, Paperclip, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

const CHUNK_SIZE = 64 * 1024 * 1024;

export const Route = createFileRoute("/_authed/share/")({
  component: ShareComponent,
});

function ShareComponent() {
  const router = useRouter();

  const { copy } = useCopyToClipboard();

  const { open } = useDialog();

  const uploadFileChunkFn = useServerFn(uploadFileChunk);

  const [selectedFiles, setSelectedFiles] = useState<Nullable<File[]>>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  function handleCopy() {
    copy(location.href)
      .then(() => {
        toast.success("File link copied to clipboard.");
      })
      .catch(() => {
        toast.error("File link could not be copied to clipboard.");
      });
  }

  function handleOpenQrCode() {
    open({
      content: () => (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share QR Code</DialogTitle>

            <DialogDescription>
              Scan the QR code below to share the file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid place-items-center bg-white p-4">
            <QRCodeSVG value={location.href} className="max-w-64" />
          </div>
        </DialogContent>
      ),
    });
  }

  async function upload() {
    if (!selectedFiles?.length || uploading) {
      return;
    }

    setUploading(true);

    const fileId = crypto.randomUUID();
    const file = selectedFiles[0];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    let transferredBytes = 0;

    const MAX_CONCURRENT_UPLOADS = 3;

    try {
      const masterKey = await generateMasterKey();
      const iv = generateRandomKey(16);

      for (
        let batchStart = 0;
        batchStart < totalChunks;
        batchStart += MAX_CONCURRENT_UPLOADS
      ) {
        const chunkPromises = [];

        for (
          let i = 0;
          i < MAX_CONCURRENT_UPLOADS && batchStart + i < totalChunks;
          i++
        ) {
          const chunkIndex = batchStart + i;

          chunkPromises.push(
            uploadChunk({
              fileId,
              file,
              chunkIndex,
              totalChunks,
              masterKey,
              iv,
            }),
          );
        }

        const results = await Promise.all(chunkPromises);

        for (const result of results) {
          if (!result.success) {
            toast.error("Failed to upload file");

            setUploading(false);

            return;
          }

          transferredBytes += result.size;

          const progress = Math.round((transferredBytes / file.size) * 100);

          setProgress(progress);
        }
      }

      toast.success("File uploaded successfully");

      const keyAsBase64 = await exportKey(masterKey);
      const ivAsBase64 = uint8ArrayToBase64(iv);

      await router.navigate({
        to: "/share/$fileId",
        params: { fileId },
        hash: `${ivAsBase64}:${keyAsBase64}`,
      });
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function uploadChunk({
    fileId,
    file,
    chunkIndex,
    totalChunks,
    masterKey,
    iv,
  }: {
    fileId: string;
    file: File;
    chunkIndex: number;
    totalChunks: number;
    masterKey: CryptoKey;
    iv: Uint8Array;
  }) {
    const data = new FormData();

    data.set("fileId", fileId);
    data.set("chunkIndex", `${chunkIndex}`);
    data.set("totalChunks", `${totalChunks}`);

    if (chunkIndex === 0) {
      const encryptedMeta = await encryptData(
        new TextEncoder().encode(
          JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks,
          }),
        ),
        masterKey,
        iv,
      );

      data.set("meta", uint8ArrayToBase64(new Uint8Array(encryptedMeta)));
    }

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const chunkIv = generateRandomKey(16);

    const encryptedChunk = await encryptData(
      await chunk.arrayBuffer(),
      masterKey,
      chunkIv,
    );

    data.set("chunkData", new Blob([chunkIv, encryptedChunk]));

    const { success } = await uploadFileChunkFn({ data });

    return {
      success,
      size: chunk.size,
      chunkIndex,
    };
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">
                Pretty Secure File Sharing
              </CardTitle>

              <CardDescription className="text-base">
                You can share files with end-to-end encryption and a link that
                automatically expires.
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
          <FileUploader
            value={selectedFiles}
            onValueChange={setSelectedFiles}
            dropzoneOptions={{
              multiple: false,
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
            loading={uploading}
            onClick={upload}
          >
            Upload
          </Button>

          {uploading && <Progress value={progress} className="mt-4" />}
        </CardContent>
      </Card>
    </div>
  );
}
