"use client";
import { User } from "@/lib/types";
import { UserAvatar } from "@neondatabase/auth/react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import React, { useRef, useState, useTransition } from "react";
import { createCommentAction } from "@/lib/actions/comments";
import { useRouter } from "next/navigation";

export function CommentComposer({
  postId,
  user,
  parentId = null,
  placeholder = "Add a comment…",
  compact = false,
}: {
  postId: string;
  user: User;
  parentId?: string | null;
  placeholder?: string;
  compact?: boolean;
}) {
      const formRef = useRef(null);
    //   Creates a reference to your form element.
      const [error, setError] = useState<string | null>(null);
      const [pending, startTransition] = useTransition();
    //   useTransition is a React feature for handling non-urgent updates
      const router = useRouter();

    

    async function onSubmit(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault();
        setError(null);
        const form = e.currentTarget;
        // currentTarget is the form that triggered the event.
        const fd = new FormData(form);
        // FormData reads all inputs with a name.

        startTransition(async()=>{
            // Runs your async work without blocking the UI.
            const res = await createCommentAction(null, fd);
            if(res?.error){
                setError(res.error);
                return;
            }
            form.reset();
            // Textarea becomes empty.
            router.refresh();
        })
    }
    return(
            <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex gap-3"
                >
                <input type="hidden" name="postId" value={postId} />
                <input type="hidden" name="parentId" value={parentId ?? ""} />

                <UserAvatar
                    user={user}
                    size={compact ? "sm" : "default"}
                    className="mt-1 shrink-0"
                />

                <div className="min-w-0 flex-1 space-y-2">
                    <Textarea
                    name="body"
                    required
                    placeholder={placeholder}
                    rows={compact ? 2 : 3}
                    className="min-h-0 resize-y border-border bg-card text-sm"
                    />

                    {error ? (
                    <p className="text-xs text-destructive" role="alert">
                        {error}
                    </p>
                    ) : null}

                    <Button type="submit" size="sm" disabled={pending}>
                    {pending ? "Posting…" : parentId ? "Reply" : "Comment"}
                    </Button>
                </div>
            </form>
    )
}