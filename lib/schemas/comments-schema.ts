import { z } from "zod";

export const commentsSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(30, "Name cannot exceed 30 characters"),

  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(300, "Comment cannot exceed 300 characters"),
});

export type commentType = z.infer<typeof commentsSchema>;
