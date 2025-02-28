import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/lib/env/client";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Lock, Share2, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 blur-3xl"
          aria-hidden="true"
        >
          <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary/30 to-secondary/30 opacity-30" />
        </div>
      </div>

      {/* Hero content */}
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
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                Learn more
              </Button>
            </div>
          </div>

          {/* Feature cards */}
          <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              <Card className="h-full">
                <CardContent className="flex h-full flex-col items-center p-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">End-to-End Encryption</h3>
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
                  <h3 className="mt-4 font-semibold">P2P File Transfer</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Direct peer-to-peer sharing for faster transfers and
                    enhanced privacy
                  </p>
                </CardContent>
              </Card>

              <Card className="h-full sm:col-span-2 lg:col-span-1">
                <CardContent className="flex h-full flex-col items-center p-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">Hybrid Storage</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose between P2P sharing or secure server storage for
                    reliable access
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
