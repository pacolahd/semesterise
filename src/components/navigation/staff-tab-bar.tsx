// components/layout/staff-tab-bar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FileText, Home } from "lucide-react";

import ROUTES from "@/constants/routes";

// components/layout/staff-tab-bar.tsx

export function StaffTabBar() {
  const pathname = usePathname();

  // Tab definitions
  const tabs = [
    {
      title: "Dashboard",
      href: ROUTES.STAFF,
      icon: Home,
      isActive: pathname === ROUTES.STAFF,
    },
    {
      title: "Petitions",
      href: ROUTES.STAFF_PETITIONS,
      icon: FileText,
      isActive: pathname === ROUTES.STAFF_PETITIONS,
    },
  ];

  return (
    <div className="flex border-b space-x-1 overflow-x-auto px-4 py-2 bg-background">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`
            inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${
              tab.isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          <tab.icon className="mr-2 h-4 w-4" />
          {tab.title}
        </Link>
      ))}
    </div>
  );
}
