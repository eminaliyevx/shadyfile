import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDialog } from "@/context";
import { AuthDialog } from "@/features/auth";
import { CreateRoomDialog } from "@/features/room";
import { useSession } from "@/hooks";
import { env } from "@/lib/env/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Share2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated } = useSession();
  const { open } = useDialog();

  function openCreateRoomDialog() {
    open({
      isAlert: true,
      content: (dialog) => <CreateRoomDialog dialog={dialog} />,
    });
  }

  function openAuthDialog() {
    open({
      content: (dialog) => <AuthDialog dialog={dialog} />,
    });
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 blur-3xl"
          aria-hidden="true"
        >
          <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary/30 to-secondary/30 opacity-30" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {env.VITE_APP_TITLE}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              A modern and secure file sharing platform with end-to-end
              encryption and peer-to-peer capabilities.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <>
                  <Button size="lg" onClick={openCreateRoomDialog}>
                    <Share2 />
                    Create room
                  </Button>

                  <Link to="/share">
                    <Button size="lg">
                      <Lock />
                      E2EE file sharing
                    </Button>
                  </Link>
                </>
              ) : (
                <Button size="lg" onClick={openAuthDialog}>
                  Get started
                  <ArrowRight />
                </Button>
              )}
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="mx-auto max-w-2xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col items-center p-6 text-center">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold">
                      End-to-End Encryption
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your files are encrypted before leaving your device,
                      ensuring maximum privacy
                    </p>
                  </CardContent>
                </Card>

                <Card className="h-full">
                  <CardContent className="flex h-full flex-col items-center p-6 text-center">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Share2 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold">Peer-to-Peer File Transfer</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Direct peer-to-peer sharing for enhanced privacy
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
