"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { commentType } from "../schemas/comments-schema";

export async function getComments() {
  return prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function createComment(value: commentType) {
  try {
    const comment = await prisma.comment.create({
      data: { name: value.name, comment: value.comment },
    });
    revalidatePath("/works");
    return comment;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("UniqueName");
    }
    throw error;
  }
}

export async function deleteComment(name: string) {
  try {
    await prisma.comment.delete({ where: { name } });
  } catch (error: any) {
    throw error;
  }
}
