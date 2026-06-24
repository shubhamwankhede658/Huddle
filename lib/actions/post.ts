"use server"

import { getCurrentUserId } from "../auth"
import { getUserVote } from "../db/queries";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Post } from "../types";
import { PostModel } from "../generated/prisma/models";



export async function votePostAction(postId: string, value: -1 | 1){
    const userId = await getCurrentUserId();
    if(!userId){
        return {error: "sign in to vote."};
    }
    await votePost(userId, postId, value)
    revalidatePath("/");
    revalidatePath(`/post/${postId}`);
    // revalidatePath() is a Next.js cache invalidation function. It's used when you've changed data on the server and want Next.js to fetch fresh data instead of showing cached content.
}


export async function votePost(userId:string, postId:string, value: -1 | 1): Promise<void>{
    const current = await getUserVote(userId, "post", postId)
    // this is check for if user has already voted for this post
    let next: -1 | 0 | 1 = value;
    if(current == value) next= 0;

    await prisma.vote.deleteMany({
        where:{
            userId,
            targetType: "post",
            targetId:postId
        }
    })
    //before adding next action we delte what ever is there before
    if(next!== 0){
        await prisma.vote.create({
            data:{
                userId,
                targetType:"post",
                targetId:postId,
                value:next,
            }
        })
    }
}

export type PostFormState = { error?: string } | null;
export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "You must be signed in to post." };
  }

  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");

  if (title.trim().length < 4) {
    return { error: "Title is too short." };
  }

  const tagSlugs = tagsRaw
    .split(/[,#\s]+/)
    .map((s) => s.trim().toLowerCase())
    .slice(0, 5);

  const post = await addPost({
    authorId: userId,
    title,
    body,
    tagSlugs,
  });

  revalidatePath("/");
//   "The data/page at / might be outdated. Refresh its cached version next time someone visits it."
  revalidatePath("/submit");
//   "The submit page may have old data, refresh it."
  redirect(`/post/${post.id}`);
//   This sends the user to the newly created post.
}

export async function addPost(input: {
  authorId: string;
  title: string;
  body: string;
  tagSlugs: string[];
}): Promise<Post> {
  const tagSlugs = input.tagSlugs.length ? input.tagSlugs : ["webdev"];
  await prisma.tag.createMany({
    // Create tags if they don't  
    
    /**suppose this is how tagslugs look
     * tagSlugs = ["react", "typescript"]

This creates:

[
  {
    slug: "react",
    label: "react",
    hashColor: "#ff00fb"
  },
  {
    slug: "typescript",
    label: "typescript",
    hashColor: "#ff00fb"
  }

] */
    data: tagSlugs.map((slug) => ({
      slug,
      label: slug,
      hashColor: "#ff00fb",
    })),
    skipDuplicates: true,
    // If this tag already exists, ignore it.
  });

  const row = await prisma.post.create({
    data: {
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
    },
  });

    await prisma.postTag.createMany({
        //thi s is realtion between tags and post
    data: tagSlugs.map((slug) => ({
      postId: row.id,
      tagSlug: slug,
    })),
  });

  return mapPostRow(row, tagSlugs, 0);
}

function mapPostRow(
  row: PostModel,
  tagSlugs: string[],
  commentCount: number,
): Post {
  return {
    id: row.id,
    authorId: row.authorId,
    title: row.title,
    body: row.body,
    tagSlugs,
    createdAt: row.createdAt.toISOString(),
    commentCount,
  };
}