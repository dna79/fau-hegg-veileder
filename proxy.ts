import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "hegg_admin_session";

async function getAdminSessionToken() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return null;
  }

  const bytes = new TextEncoder().encode(`hegg-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hasValidSession(request: NextRequest) {
  const expectedToken = await getAdminSessionToken();

  if (!expectedToken) {
    return false;
  }

  return request.cookies.get(ADMIN_SESSION_COOKIE)?.value === expectedToken;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname.startsWith("/admin/login");
  const isAdminPage = pathname.startsWith("/admin");

  if (isLoginPage) {
    return NextResponse.next();
  }

  if ((isAdminApi || isAdminPage) && !(await hasValidSession(request))) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Du må være logget inn som admin." },
        { status: 401 },
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
