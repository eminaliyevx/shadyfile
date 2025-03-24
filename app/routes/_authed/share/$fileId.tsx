import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useDialog } from "@/context";
import { useCopyToClipboard } from "@/hooks";
import {
  base64ToUint8Array,
  decryptData,
  deriveIvForChunk,
  fileMetaSchema,
  formatFileSize,
  importKey,
  queries,
  safeJsonParse,
} from "@/lib";
import { downloadFileChunk } from "@/lib/server/fn";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { AlertCircle, Copy, FileKey, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import streamsaver from "streamsaver";
import { z } from "zod";

export const Route = createFileRoute("/_authed/share/$fileId")({
  component: ShareComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    const { fileId } = params;

    await context.queryClient.ensureQueryData(queries.fileMeta(fileId));
  },
  errorComponent: () => {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>

          <AlertDescription>
            Invalid file link. Please check the link and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  },
});

function ShareComponent() {
  const { fileId } = Route.useParams();

  const { hash } = useLocation();

  const { copy } = useCopyToClipboard();

  const { open } = useDialog();

  const { iv, key } = useMemo(() => {
    const [iv, key] = hash.split(":");

    return {
      iv: base64ToUint8Array(iv),
      key,
    };
  }, [hash]);

  const { data: encryptedMeta } = useSuspenseQuery(queries.fileMeta(fileId));

  const [meta, setMeta] = useState<z.infer<typeof fileMetaSchema>>();

  const metaFn = useCallback(async () => {
    try {
      const meta = fileMetaSchema.parse(
        safeJsonParse(
          new TextDecoder().decode(
            await decryptData(
              base64ToUint8Array(encryptedMeta),
              await importKey(key),
              iv,
            ),
          ),
        ),
      );

      setMeta(meta);
    } catch {
      setMeta(undefined);
    }
  }, [iv, key, encryptedMeta]);

  useEffect(() => {
    metaFn();
  }, [metaFn]);

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

  async function download() {
    if (!meta) {
      return;
    }

    try {
      const fileStream = streamsaver.createWriteStream(
        meta?.fileName as string,
        {
          size: meta?.fileSize,
        },
      );

      const writer = fileStream.getWriter();

      const decryptionStream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < meta.totalChunks; i++) {
            const chunk = await downloadFileChunk({
              data: { fileId, fileSize: meta.fileSize, chunkIndex: i },
            });

            const encryptedChunk = await chunk.arrayBuffer();

            const masterKey = await importKey(key);
            const chunkIv = deriveIvForChunk(iv, i);

            const decryptedChunk = await decryptData(
              new Uint8Array(encryptedChunk),
              masterKey,
              chunkIv,
            );

            controller.enqueue(new Uint8Array(decryptedChunk));
          }

          controller.close();
        },
      });

      const reader = decryptionStream.getReader();

      function pump() {
        reader.read().then(async (result) => {
          if (result.done) {
            writer.close();
          } else {
            writer.write(result.value).then(pump);
          }
        });
      }

      pump();
    } catch {
      toast.error("Failed to download file");
    }
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
                automatically expires in 24 hours.
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
          <div className="flex items-center gap-4 rounded-lg border-2 border-dashed border-border p-8">
            <FileKey className="size-10" />

            <div className="flex flex-col gap-1">
              <span className="text-lg text-muted-foreground">
                <strong>Name:</strong> {meta?.fileName}
              </span>

              <span className="text-lg text-muted-foreground">
                <strong>Size:</strong> {formatFileSize(meta?.fileSize ?? 0)}
              </span>

              <span className="text-lg text-muted-foreground">
                <strong>Type:</strong> {meta?.fileType}
              </span>
            </div>
          </div>

          <Button className="mt-4 w-full" onClick={download}>
            Download
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
