"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  BookOpen,
  Calendar,
  ChevronRight,
  FileText,
  Grid3x3,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import ROUTES from "@/constants/routes";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

export function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Check active sections
  const isYearViewActive = pathname === ROUTES.YEAR_VIEW;
  const isCategoryActive = pathname === ROUTES.CATEGORY_VIEW;
  const isDegreeAuditingActive = isYearViewActive || isCategoryActive;
  const isPetitionActive = pathname === ROUTES.STUDENT_PETITIONS;

  // Navigation handler to close sidebar on mobile
  const handleNavigation = (href: string) => (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      setOpenMobile(false);
      // Use a slight delay to make the transition smoother
      // setTimeout(() => {
      router.push(href);
      // }, 150);
    }
  };

  const menuButtonStyles = cn(
    "py-[25px] body2-regular hover:bg-muted hover:text-foreground",
    "transition-all duration-200 data-[active=true]:border data-[active=true]:border-[0.5px] data-[active=true]:shadow-inner data-[active=true]:text-tcol-500 data-[active=true]:dark:font-medium data-[active=true]:dark:text-[--foreground] data-[active=true]:font-bold"
  );

  return (
    <Sidebar
      collapsible="icon"
      className="top-16 h-[calc(100vh-4rem)] mt-2 border"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="hidden">Semesterise</SidebarGroupLabel>
          <SidebarMenu>
            {/* Show this when NOT collapsed */}
            {!isCollapsed && (
              <Collapsible
                asChild
                defaultOpen={isDegreeAuditingActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  {/* Main menu trigger */}
                  <CollapsibleTrigger asChild className="mb-2">
                    <SidebarMenuButton tooltip="Degree Auditing">
                      <BookOpen
                        className={cn(
                          "h-5 w-5",
                          isDegreeAuditingActive ? "text-primary" : ""
                        )}
                      />
                      <span className="body2-regular">Degree Auditing</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {/* Submenu content */}
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === ROUTES.YEAR_VIEW}
                          className={menuButtonStyles}
                        >
                          <Link
                            href={ROUTES.YEAR_VIEW}
                            onClick={handleNavigation(ROUTES.YEAR_VIEW)}
                          >
                            <span className="flex items-center">
                              <Calendar
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isYearViewActive ? "text-primary" : ""
                                )}
                              />
                              Year by Year Plan
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === ROUTES.CATEGORY_VIEW}
                          className={menuButtonStyles}
                        >
                          <Link
                            href={ROUTES.CATEGORY_VIEW}
                            onClick={handleNavigation(ROUTES.CATEGORY_VIEW)}
                          >
                            <span className="flex items-center">
                              <Grid3x3
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isCategoryActive ? "text-primary" : ""
                                )}
                              />
                              Category View
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}

            {/* Show these when collapsed */}
            {isCollapsed && (
              <>
                {/* Year View as direct menu item when collapsed */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isYearViewActive}
                    tooltip="Year by Year Plan"
                  >
                    <Link
                      href={ROUTES.YEAR_VIEW}
                      onClick={handleNavigation(ROUTES.YEAR_VIEW)}
                    >
                      <Calendar
                        className={cn(
                          "h-5 w-5",
                          isYearViewActive ? "text-primary" : ""
                        )}
                      />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Category View as direct menu item when collapsed */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isCategoryActive}
                    tooltip="Category View"
                  >
                    <Link
                      href={ROUTES.CATEGORY_VIEW}
                      onClick={handleNavigation(ROUTES.CATEGORY_VIEW)}
                    >
                      <Grid3x3
                        className={cn(
                          "h-5 w-5",
                          isCategoryActive ? "text-primary" : ""
                        )}
                      />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {/* Petition Processing - always visible */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isPetitionActive}
                tooltip="Petition Processing"
                className={menuButtonStyles}
              >
                <Link
                  href={ROUTES.STUDENT_PETITIONS}
                  onClick={handleNavigation(ROUTES.STUDENT_PETITIONS)}
                >
                  <FileText
                    className={cn(
                      "h-5 w-5",
                      isPetitionActive ? "text-primary" : ""
                    )}
                  />
                  <span>Petition Processing</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
