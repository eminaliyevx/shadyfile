import { AlertDialog } from "@/components/ui/alert-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Nullable } from "@/lib";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ComponentProps,
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useState,
} from "react";

type DialogOptions = {
  id?: string;
  modal?: ComponentProps<typeof DialogPrimitive.Root>["modal"];
  isAlert?: boolean;
  content?: (dialog: DialogInstance) => ReactNode;
};

export type DialogInstance = DialogOptions & {
  id: string;
  isOpen: boolean;
};

type DialogContextType = {
  open: (options: DialogOptions) => string;
  close: (id: string) => void;
  closeAll: () => void;
};

const DialogContext = createContext<Nullable<DialogContextType>>(null);

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
}

export function DialogProvider({ children }: PropsWithChildren) {
  const [dialogs, setDialogs] = useState<DialogInstance[]>([]);

  function open(options: DialogOptions) {
    const id = options.id ?? crypto.randomUUID();

    setDialogs((dialogs) => [
      ...dialogs,
      {
        ...options,
        id,
        isOpen: true,
      },
    ]);

    return id;
  }

  function close(id: string) {
    setDialogs((dialogs) =>
      dialogs.map((dialog) =>
        dialog.id === id ? { ...dialog, isOpen: false } : dialog,
      ),
    );

    setTimeout(() => {
      setDialogs((dialogs) => dialogs.filter((dialog) => dialog.id !== id));
    }, 200);

    return id;
  }

  function closeAll() {
    setDialogs((dialogs) =>
      dialogs.map((dialog) => ({ ...dialog, isOpen: false })),
    );

    setTimeout(() => {
      setDialogs([]);
    }, 200);
  }

  function handleDialogOpenChange(isOpen: boolean, id: string) {
    if (!isOpen) {
      close(id);
    }
  }

  return (
    <DialogContext.Provider value={{ open, close, closeAll }}>
      {children}

      {dialogs.map((dialog) =>
        dialog.isAlert ? (
          <AlertDialog
            key={dialog.id}
            open={dialog.isOpen}
            onOpenChange={(isOpen) => handleDialogOpenChange(isOpen, dialog.id)}
          >
            {dialog.content?.(dialog)}
          </AlertDialog>
        ) : (
          <Dialog
            key={dialog.id}
            open={dialog.isOpen}
            onOpenChange={(isOpen) => handleDialogOpenChange(isOpen, dialog.id)}
          >
            {dialog.content?.(dialog)}
          </Dialog>
        ),
      )}
    </DialogContext.Provider>
  );
}
