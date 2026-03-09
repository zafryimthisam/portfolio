import { z } from "zod";
//Sign Up Schema
export const signUpSchema = z
  .object({
    name: z.string().min(3).max(20),
    email: z.email(),
    password: z.string().min(8).max(30),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
//Export Sign Up Type
export type signUpType = z.infer<typeof signUpSchema>;

//Login Schema
export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});
//Export Login Type
export type loginType = z.infer<typeof loginSchema>;
