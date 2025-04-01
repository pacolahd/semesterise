// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";

import { betterFetch } from "@better-fetch/fetch";

import { Session } from "@/lib/auth/auth";

// Routes that don't require authentication
const authRoutes = [
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/forgot-password",
  "/email-verified",
];

// Routes that require specific roles
const adminRoutes = ["/admin"];
const registryRoutes = ["/registry"];
const advisorRoutes = ["/advisor"];

export async function middleware(request: NextRequest) {
  const pathName = request.nextUrl.pathname;

  try {
    // Skip authentication for public routes like static assets
    if (
      pathName.startsWith("/_next") ||
      pathName.startsWith("/api/auth") ||
      pathName.startsWith("/assets") ||
      pathName === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: "http://localhost:3000",
        headers: {
          // get the cookie from the request
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    // Handle auth routes (sign-in, sign-up, etc.)
    if (authRoutes.some((route) => pathName.startsWith(route))) {
      if (session?.user) {
        // User is already logged in, redirect to home
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    }

    // For protected routes, require authentication
    if (!session?.user) {
      // We can't log to the database here due to Edge limitations
      // Just redirect to login
      return NextResponse.redirect(
        new URL(
          `/sign-in?redirect=${encodeURIComponent(request.url)}`,
          request.url
        )
      );
    }

    const user = session.user;

    // Role-based access control for specific routes
    if (
      (adminRoutes.some((route) => pathName.startsWith(route)) &&
        user.role !== "admin") ||
      (registryRoutes.some((route) => pathName.startsWith(route)) &&
        user.role !== "registry") ||
      (advisorRoutes.some((route) => pathName.startsWith(route)) &&
        user.role !== "academic_advisor")
    ) {
      // We can't log to the database here
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Skip activity logging in middleware
    // All checks passed, proceed to the requested page
    return NextResponse.next();
  } catch (error) {
    console.error(`Middleware error:`, error);
    // For auth errors, redirect to login
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
