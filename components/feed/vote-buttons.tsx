"use client"
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTransition } from "react";
import { votePostAction } from "@/lib/actions/post";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type VoteTarget = "post" | "comments";

export function VoteButtons({
    target,
    targetId,
    score,
    userVote,
}:{
    target:VoteTarget;
    targetId:string;
    score:number
    userVote: -1 | 0 | 1;
}){
    const [pending, startTransition] = useTransition()
    const router = useRouter();
    const isPost= target=="post";
    function vote(value :-1 | 1){
        startTransition(async ()=>{
            if(isPost){
                await votePostAction(targetId, value);
            }
            router.refresh() ;
        })
        
    }

     const iconClass = isPost ? "size-6" : "size-4";
     const stackClass = isPost
        ? "flex flex-col items-center gap-0.5 py-1 text-sm"
        : "flex flex-col items-center gap-0 text-xs";
    const scoreClass = isPost
        ? "min-w-[2ch] text-center text-xs font-semibold tabular-nums"
        : "min-w-[1.5ch] text-center font-medium tabular-nums";

    return <div className={stackClass}>
            
      <button
        onClick={() => vote(1)}
        disabled={pending}
        className={cn(
          "rounded p-0.5 transition-colors hover:bg-muted disabled:opacity-50",
          userVote === 1
            ? "text-upvote"
            : "text-muted-foreground hover:text-upvote",
        )}
        aria-label={isPost ? "Upvote" : "Upvote comment"}
      >
        <ChevronUp  className={iconClass}/>
      </button>
        <span
        className={cn(
          scoreClass,
          userVote === 1 && "text-upvote",
          userVote === -1 && "text-downvote",
        )}
      >
        {score}
      </span>
    <button
        onClick={() => vote(-1)}
        disabled={pending}
        className={cn(
          "rounded p-0.5 transition-colors hover:bg-muted disabled:opacity-50",
          userVote === -1
            ? "text-downvote"
            : "text-muted-foreground hover:text-downvote",
        )}
        aria-label={isPost ? "Downvote" : "Downvote comment"}
      >
        <ChevronDown className={iconClass}/>
      </button>
    </div>
}

