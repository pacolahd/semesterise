"use client";

import { IconPackage } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SessionStatus } from "@/components/providers/session-status";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSession } from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function Home() {
  const { user } = useAuthStore();
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-10">
      <div className="flex items-center space-x-4 pb-6">
        <p className="text-2xl font-bold"> Welcome to Semesterise</p>
        <IconPackage />
        <ThemeSwitcher />
      </div>
      <SessionStatus className="w-40 h-10">
        <h1>Welcome, {user?.name}</h1>
        <p>Role: {user?.role}</p>
      </SessionStatus>

      <SignOutButton
        variant="destructive"
        text="Sign out of your account"
        className="w-full sm:w-auto"
      />

      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter>
      </Card>

      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Place content for the popover here.</PopoverContent>
      </Popover>

      <Dialog>
        <DialogTrigger className="rounded-full border p-6 hover:bg-primary-50 dark:hover:bg-primary-300">
          Open
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Button className="body2-medium h-[58px] w-[290px] rounded-[50px]">
        Login
      </Button>
    </div>
  );
}
