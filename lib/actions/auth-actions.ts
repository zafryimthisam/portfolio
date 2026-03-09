"use server";

import { auth } from "../auth";
import { signUpType } from "../schemas/auth-schema";

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
