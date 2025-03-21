import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDialog } from "@/context";
import { createRoom } from "@/lib/server/fn";
import { DialogProps } from "@/lib/types";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export function CreateRoomDialog({ dialog }: DialogProps) {
  const router = useRouter();

  const createRoomFn = useServerFn(createRoom);

  const { close } = useDialog();

  async function handleCreateRoom() {
    close(dialog.id);

    const toastId = toast.loading("Creating room...");

    try {
      const roomId = await createRoomFn();

      toast.success("Room created. Redirecting...", {
        id: toastId,
      });

      await router.navigate({
        to: "/room/$roomId",
        params: {
          roomId,
        },
      });

      toast.dismiss(toastId);
    } catch {
      toast.error("Failed to create room. Please try again.", {
        id: toastId,
      });
    }
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Create a room</AlertDialogTitle>

        <AlertDialogDescription>
          Create a room and invite others to start peer-to-peer file sharing.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>

        <AlertDialogAction onClick={handleCreateRoom}>
          Create room
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
