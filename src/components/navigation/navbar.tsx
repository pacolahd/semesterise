// src/components/navigation/navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Settings,
  Upload,
  User,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AshesiLogo } from "@/components/ui/ashesi-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import TooltipWrapper from "@/components/ui/tooltip-wrapper";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

// src/components/navigation/navbar.tsx

// src/components/navigation/navbar.tsx

// ✅ Props interface
interface NavbarProps {
  showUploadButton?: boolean;
  showNotifications?: boolean;
  showUserDropdown?: boolean;
  showThemeSwitcher?: boolean;
  showSidebarTrigger?: boolean;
}

export function Navbar({
  showUploadButton = true,
  showNotifications = true,
  showUserDropdown = true,
  showThemeSwitcher = true,
  showSidebarTrigger = true,
}: NavbarProps) {
  const { user } = useAuthStore();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [shortName, setShortName] = useState<string>("");

  useEffect(() => {
    if (user?.name) {
      const nameParts = user.name.split(" ");
      setShortName(
        nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1]}` : user.name
      );
    }
  }, [user?.name]);

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-surface-50 dark:bg-[#0C1726] px-4 shadow-sm md:px-8">
      <div className="flex items-center gap-4">
        <AshesiLogo
          className="h-auto"
          lightClassName="w-[55px] md:w-[55px] h-auto md:h-auto"
          darkClassName="w-[39px] md:w-[45px] h-auto md:h-auto"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* ✅ Upload CAMU data button */}
        {showUploadButton && (
          <TooltipWrapper
            tooltipText="Import your latest transcript"
            tooltipSide="bottom"
            hideAboveScreenSize="md"
          >
            <Button
              variant="outline"
              size="sm"
              className="bg-surface-500 dark:bg-[--background] hidden md:flex items-center w-auto text-[16px]"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload New CAMU data
            </Button>
          </TooltipWrapper>
        )}

        {/* ✅ Notifications */}
        {showNotifications && (
          <TooltipWrapper tooltipText="Notifications" tooltipSide="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full"
            >
              <Bell className="size-[24px]" />
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary"></span>
            </Button>
          </TooltipWrapper>
        )}

        {/* ✅ User dropdown menu */}
        {showUserDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isMobile ? (
                <Button
                  variant="ghost"
                  className="relative flex h-8 items-center gap-1 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src="/images/placeholder-avatar.jpg"
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="body2-regular">
                      {user?.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="relative flex h-8 items-center gap-2 px-2 rounded-full"
                >
                  <Avatar className="h-8 w-8 md:hidden">
                    <AvatarImage
                      src="/images/placeholder-avatar.jpg"
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback>
                      {user?.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[100px] truncate text-sm font-medium hidden md:block body2-regular">
                    {shortName}
                  </span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-auto" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none body2-regular">
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground body3-regular">
                  {user?.email || "user@example.com"}
                </p>
              </div>
              <DropdownMenuSeparator />
              {showUploadButton && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center md:hidden body2-regular cursor-pointer"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Upload New Camu Data</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href="/help"
                  className="flex items-center body2-regular cursor-pointer"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Documentation</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center body2-regular cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center body2-regular cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <SignOutButton
                  variant="ghost"
                  className="w-full justify-start px-2 body2-regular cursor-pointer"
                  showIcon={true}
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* ✅ Theme switcher */}
        {showThemeSwitcher && (
          <TooltipWrapper tooltipText="Toggle theme" tooltipSide="bottom">
            <ThemeSwitcher />
          </TooltipWrapper>
        )}

        {/* ✅ Sidebar trigger for mobile */}
        {showSidebarTrigger && (
          <TooltipWrapper
            tooltipText="Toggle sidebar"
            tooltipSide="bottom"
            hideAboveScreenSize="md"
          >
            <SidebarTrigger className="ml-1 md:hidden" />
          </TooltipWrapper>
        )}
      </div>
    </header>
  );
}
