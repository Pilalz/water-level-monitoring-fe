import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  userId: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  exp?: number;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika user sudah login dan membuka halaman /login, redirect ke /dashboard
  if (token && pathname === "/login") {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (!decoded.exp || decoded.exp * 1000 > Date.now()) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      // Token invalid, biarkan akses halaman login dan hapus cookie
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }
  }

  // 2. Proteksi rute dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);

      // Cek kedaluwarsa token
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
      }

      const userRole = decoded.role;

      // Aturan RBAC rute spesifik (halaman manajemen user hanya untuk ADMIN)
      if ((pathname.startsWith("/dashboard/user") || pathname.startsWith("/dashboard/users")) && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      // Token rusak atau palsu -> hapus cookie pada response dan redirect ke login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};