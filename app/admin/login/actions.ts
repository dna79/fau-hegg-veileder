"use server";

import { redirect } from "next/navigation";
import { isAdminPassword, setAdminSessionCookie } from "@/lib/admin-auth";

export type LoginState = {
  error?: string;
};

export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || !isAdminPassword(password)) {
    return { error: "Feil passord" };
  }

  await setAdminSessionCookie();
  redirect("/admin");
}
