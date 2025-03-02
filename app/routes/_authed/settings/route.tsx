import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatchRoute,
} from "@tanstack/react-router";
import { ShieldUser, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
  beforeLoad: (d) => {
    if (d.location.pathname === "/settings") {
      throw redirect({ to: "/settings/profile" });
    }
  },
});

function Settings() {
  const matchRoute = useMatchRoute();

  return (
    <div className="mx-auto max-w-screen-lg p-4">
      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>

          <CardDescription className="text-base">
            Manage your account settings
          </CardDescription>
        </CardHeader>

        <CardContent className="border-t pr-0 pl-0 lg:pr-6">
          <SidebarProvider className="flex-col lg:flex-row">
            <Sidebar
              collapsible="none"
              className="w-full lg:min-h-svh lg:w-[var(--sidebar-width)]"
            >
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-2">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={!!matchRoute({ to: "/settings/profile" })}
                          className="h-10 text-base"
                          asChild
                        >
                          <Link to="/settings/profile">
                            <UserRound />
                            Profile
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={!!matchRoute({ to: "/settings/security" })}
                          className="h-10 text-base"
                          asChild
                        >
                          <Link to="/settings/security">
                            <ShieldUser />
                            Security
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <div className="flex-1 p-4">
              <Outlet />
            </div>
          </SidebarProvider>
        </CardContent>
      </Card>
    </div>
  );
}
