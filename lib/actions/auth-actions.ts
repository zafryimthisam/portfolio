"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { signUpType } from "../schemas/auth-schema";
import { redirect } from "next/navigation";

export const signUp = async (values: signUpType) => {
  const { name, email, password } = values;
  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      callbackURL: "/home",
    },
  });

  return result;
};

export const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/home");
};
