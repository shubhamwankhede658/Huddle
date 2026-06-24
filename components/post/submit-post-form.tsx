"use client"
import { createPostAction } from "@/lib/actions/post";
import { useActionState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
/**Form submit
     |
     ↓
action
     |
     ↓
createPostAction()
     |
     ↓
returns new state
     |
     ↓
state updates */

export function SubmitPostForm(){
    const [state, action, pending] = useActionState(createPostAction, null);
                                                   //action is connected to create postaction bcz i passed it here

        return (
            <form action={action} className="mx-auto max-w-xl space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                id="title"
                name="title"
                required
                minLength={4}
                placeholder="What’s on your mind?"
                className="h-10"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                id="body"
                name="body"
                rows={8}
                placeholder="Optional details, links, or context…"
                className="border-border bg-card"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                id="tags"
                name="tags"
                placeholder="webdev, react, nextjs"
                className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                Comma-separated. Defaults to #webdev if empty.
                </p>
            </div>

            {state?.error ? (
                <p className="text-sm text-destructive" role="alert">
                {state.error}
                </p>
            ) : null}

            <Button type="submit" disabled={pending}>
                {/* pending tells you whether createPostAction is currently running. 
                Before clicking:
                pending = false

                So React renders:

                <Button disabled={false}>User clicks button

                Now:

                Button clicked
                    ↓
                createPostAction starts
                    ↓
                pending becomes true

                React re-renders:

                <Button disabled={true}>

                Now the button becomes:

                [disabled]*/}
                {pending ? "Publishing..." : "Publish Post"}
            </Button>
            </form>
  );
}

/**User fills the form

Example:

Title:

My React Post

Body:

Learning Next.js

Tags:

react,nextjs

User clicks Publish

Button:

<Button type="submit"> The form:

<form action={action}>

runs.So React internally does:

action()
   |
   |
   ↓
createPostAction()Your server function starts:

export async function createPostAction(
  _prev,
  formData
)

It receives:

_prev = previous state

formData =
{
 title:"My React Post",
 body:"Learning Next.js",
 tags:"react,nextjs"
}
 Now create post

This line:

const post = await addPost({
 authorId:userId,
 title,
 body,
 tagSlugs
});

moves into:

addPost()

USER
 |
 | fills form
 |
 ↓

<form action={action}>

 |
 ↓

useActionState

 |
 ↓

createPostAction(formData)

 |
 ↓

check login

 |
 ↓

validate title

 |
 ↓

addPost()

 |
 ↓

create tags

 |
 ↓

create post

 |
 ↓

connect tags

 |
 ↓

revalidate pages

 |
 ↓

redirect(/post/id)

 |
 ↓

USER SEES NEW POST*/