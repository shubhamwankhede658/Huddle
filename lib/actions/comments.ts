"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "../auth";
import { prisma } from "../prisma";
import { Comment } from "../types";
import { getUserVote } from "../db/queries";

export type CommentFormState = { error?: string; ok?: boolean } | null;

export async function createCommentAction(
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "You must be signed in to comment." };
  }

  const postId = String(formData.get("postId") ?? "");
  const parentIdRaw = String(formData.get("parentId") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!postId || body.trim().length < 1) {
    return { error: "Comment cannot be empty." };
  }

  const parentId = parentIdRaw && parentIdRaw !== "null" ? parentIdRaw : null;

  await addComment({ postId, authorId: userId, parentId, body });

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
}): Promise<Comment> {
    const row = await prisma.comment.create({
        data:{
            postId: input.postId,
            authorId: input.authorId,
            parentId: input.parentId,
            body: input.body.trim(),
        }
    });

    return{
        id: row.id,
        postId: row.postId,
        authorId: row.authorId,
        parentId: row.parentId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
    };
}