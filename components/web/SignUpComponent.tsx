"use client";

import { Controller, useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { signUpSchema, signUpType } from "@/lib/schemas/auth-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { signUp } from "@/lib/actions/auth-actions";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";

import StackIcon from "tech-stack-icons";
import { authClient } from "@/lib/auth-client";

export default function SignUpComponent() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    control,
  } = useForm<signUpType>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: signUpType) {
    try {
      const result = await signUp(data);
      if (result?.user) {
        toast.success("Account Created Successfully!");
        reset();
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create and account");
    }
  }

  async function handleLoginWithGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/works",
    });
  }

  async function handleLoginWithGithub() {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/works",
    });
  }
  return (
    <div>
      <Card className="p-3 md:p-6">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>
            Sign Up with your Google or GitHub account
          </CardDescription>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleLoginWithGoogle}
              type="button"
              className="cursor-pointer flex items-center justify-center gap-2 rounded-none bg-white text-sm text-black px-3 py-2 w-full"
            >
              <StackIcon name="google" className="w-5 h-5" variant="dark" />
              <span>Sign Up with Google</span>
            </Button>

            <Button
              onClick={handleLoginWithGithub}
              type="button"
              className="cursor-pointer flex items-center justify-center gap-2 rounded-none bg-white text-sm text-black px-3 py-2 w-full"
            >
              <StackIcon name="github" className="w-5 h-5" />
              <span>Sign Up with GitHub</span>
            </Button>
          </div>

          <p className="text-center text-xs md:text-base">OR</p>
          <CardDescription className="text-center">
            Create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup className="flex gap-y-2 md:gap-y-3">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Full Name</FieldLabel>
                    <Input
                      className="h-8 text-xs md:h-10 md:text-sm"
                      aria-invalid={fieldState.invalid}
                      placeholder="Zafry Imthisam"
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      className="h-8 text-xs md:h-10 md:text-sm"
                      aria-invalid={fieldState.invalid}
                      placeholder="example@gmail.com"
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Password</FieldLabel>
                    <Input
                      className="h-8 text-xs md:h-10 md:text-sm"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="************"
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input
                      className="h-8 text-xs md:h-10 md:text-sm"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="************"
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Button className="cursor-pointer flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Submitting
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
