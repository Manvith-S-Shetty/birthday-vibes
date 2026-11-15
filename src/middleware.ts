import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obsolete admin route: immediately return 404 to avoid exposing login URL or layout redirects
  if (pathname === "/admin/login" || pathname === "/admin/login/") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/login",
    "/admin/login/:path*",
  ],
};
