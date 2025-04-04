import { NextRequest, NextResponse } from "next/server";

// import { betterFetch } from "@better-fetch/fetch";
import { getSessionCookie } from "better-auth/cookies";

import { ServerSession } from "@/lib/auth/auth";
import { authClient } from "@/lib/auth/auth-client";

const PUBLIC_ROUTES = ["/about"];
const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];
const ADMIN_ROUTES = [];
const STUDENT_ROLE = "student";

// Matcher config (critical for performance)
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|static|images|favicon.ico|.*\\.png$).*)",
  ],
};

async function fetchFullSession(
  request: NextRequest
): Promise<ServerSession | null> {
  try {
    /*   const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      }
    ); */

    const { data: session } = await authClient.getSession({
      fetchOptions: {
        credentials: "include",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      },
      query: { disableCookieCache: true },
    });

    return session;
  } catch (error) {
    console.error("Session fetch error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes - no auth required
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2. Auth routes - prevent access if logged in
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) return NextResponse.next();

    // Validate session if cookie exists
    const session = await fetchFullSession(request);
    return session?.user
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  // 3. Admin routes - strict validation
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const session = await fetchFullSession(request);

    if (!session?.user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (session.user.role === STUDENT_ROLE) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  }

  // 4. General protected routes
  // const sessionCookie = getSessionCookie(request);
  // if (sessionCookie) return NextResponse.next();

  // 5. Fallback validation for routes not caught above
  const session = await fetchFullSession(request);
  return session?.user
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/sign-in", request.url));
}
