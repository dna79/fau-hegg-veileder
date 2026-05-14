import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "hegg_admin_session";

export function getAdminSessionToken() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return null;
  }

  return createHash("sha256").update(`hegg-admin:${password}`).digest("hex");
}

export function isAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD;

  return Boolean(expectedPassword && password === expectedPassword);
}

export async function isAdminSessionValid() {
  const expectedToken = getAdminSessionToken();

  if (!expectedToken) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === expectedToken;
}

export async function setAdminSessionCookie() {
  const token = getAdminSessionToken();

  if (!token) {
    throw new Error("ADMIN_PASSWORD mangler.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdminSession() {
  if (await isAdminSessionValid()) {
    return null;
  }

  return NextResponse.json(
    { error: "Du må være logget inn som admin." },
    { status: 401 },
  );
}
