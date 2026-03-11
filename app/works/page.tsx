"use client";
import SignUpComponent from "@/components/web/SignUpComponent";
import StackIcon from "tech-stack-icons";
import { BetterAuth } from "@boxicons/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { commentsSchema, commentType } from "@/lib/schemas/comments-schema";
import { Textarea } from "@/components/ui/textarea";
import { IconSend, IconTrash, IconTrashFilled } from "@tabler/icons-react";
import {
  createComment,
  deleteComment,
  getComments,
} from "@/lib/actions/comment-actions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

gsap.registerPlugin(SplitText, ScrollTrigger);
export default function WorksPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
    control,
  } = useForm<commentType>({
    resolver: zodResolver(commentsSchema),
    defaultValues: {
      name: "",
      comment: "",
    },
  });

  const onSubmit = async (data: commentType) => {
    try {
      await createComment(data);
      toast.success("Comment posted successfully");
      reset();
      const updated = await getComments();
      setComments(updated);
    } catch (error: any) {
      if (error.message === "UniqueName") {
        toast.error("A comment with this name already exists.");
      } else {
        toast.error("Something went wrong. Please try again.");
        console.error(error);
      }
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteComment(name);
      const updated = await getComments();
      setComments(updated);
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
      console.error(error);
    }
  };

  const [comments, setComments] = useState<commentType[]>([]);

  useEffect(() => {
    async function loadComments() {
      const data = await getComments();
      setComments(data);
    }
    loadComments();
  }, []);
  useGSAP(() => {
    gsap.to("#animate-text", {
      ease: "power1.inOut",
      opacity: 1,
      y: 0,
    });

    gsap.from(["#signup-box", "#gsap-box", "#prisma-box"], {
      y: 200,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: "power3.out",
      force3D: true,
    });
  }, []);
  return (
    <div className="p-3 bg-neutral-950 flex items-center flex-col flex-1 text-white">
      <div className="text-center mt-4">
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
          From .Idea to .Code
        </h1>
      </div>

      <div
        id="signup-box"
        className="bg-black border border-neutral-700 py-4 px-6 w-fit md:w-[50%] mt-4"
      >
        <div className="flex flex-col md:flex-row gap-1">
          <div>
            <h2 className=" md:text-2xl font-bold text-center">
              Create secure authentication with
            </h2>
          </div>
          <div className="flex justify-center items-center gap-1">
            <BetterAuth />
            <span className=" md:text-2xl font-bold">
              Better-Auth framework
            </span>
          </div>
        </div>

        <p className="text-sm md:text-base text-zinc-400 text-center mt-2">
          Try creating an Account. Your information is secured with us
        </p>
        <div className="w-full max-w-md mx-auto mt-3">
          <SignUpComponent />
        </div>
      </div>

      <div
        id="prisma-box"
        className=" bg-black border border-neutral-700 py-4 px-6 w-fit md:w-[50%] mt-4"
      >
        <h2 className=" md:text-2xl font-bold text-center">
          Building Scalable Databases with Prisma ORM & PostgreSQL
        </h2>
        <p className="text-zinc-200 text-sm md:text-base text-center mt-2">
          I have experience designing schemas, managing relational data, and
          querying databases using Prisma ORM and PostgreSQL.
        </p>
        <p className="text-xs md:text-base text-center mt-2 text-zinc-400">
          Try posting a comment below !
        </p>
        <div className="bg-neutral-800 py-2 px-4 rounded-sm mt-4">
          <p className="text-sm md:text-base mb-3">Write your comment here</p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup className="flex gap-y-2 md:gap-y-3">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Name</FieldLabel>
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
                name="comment"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Comment</FieldLabel>
                    <Textarea
                      className="text-xs md:text-sm min-h-24 resize-none"
                      aria-invalid={fieldState.invalid}
                      placeholder="Write your comment..."
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Button className="hover:scale-125 self-end w-fit cursor-pointer flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Submitting
                  </>
                ) : (
                  <IconSend />
                )}
              </Button>
            </FieldGroup>
          </form>
          <p className="text-sm md:text-base mt-2 md:mt-4">Comments</p>
          <div>
            {comments.length === 0 ? (
              <p className="text-zinc-400">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment: commentType) => (
                <div
                  className="bg-black p-2 my-1.5 rounded-sm"
                  key={comment.name}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="w-6 h-6 md:w-8 md:h-8">
                      <AvatarFallback>
                        {comment.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm md:text-base">{comment.name}</p>

                    <div className="flex-1"></div>
                    {comment.name !== "Zafry Imthisam" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="cursor-pointer text-red-400 hover:text-red-500">
                            <IconTrash className="w-5 h-5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The comment will be
                              permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(comment.name)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <p className="text-sm md:text-base">{comment.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        id="gsap-box"
        className=" bg-black border border-neutral-700 py-4 px-6 w-fit md:w-[50%] mt-4"
      >
        <div className="flex flex-col md:flex-row items-center md:justify-center gap-2">
          <h2 className=" md:text-2xl font-bold text-center">
            Create Awesome <span className="italic">Looking</span> Animations
            using{" "}
            <span className="inline-flex items-center align-middle translate-y-[-2px]">
              <StackIcon name="gsap" className="w-10 md:w-14" variant="dark" />
            </span>
          </h2>
        </div>
        <h2
          id="animate-text"
          className="text-xl my-3 md:text-4xl font-bold text-center opacity-0 translate-y-10 bg-gradient-to-r from-teal-200 to-teal-500 bg-clip-text text-transparent"
        >
          ANIMATE ANYTTHING WITH EASE
        </h2>
        <p className="text-sm md:text-base text-center text-zinc-400">
          GSAP is a JavaScript animation library.
        </p>
      </div>
    </div>
  );
}
