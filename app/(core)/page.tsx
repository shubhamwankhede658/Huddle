import Image from "next/image";
import { FeedSortTabs } from "@/components/feed/feed-sort-tabs";
import { getSessionUser } from "@/lib/auth";
import { SortAsc } from "lucide-react";
import { FeedSort, Tag } from "@/lib/types";
import { listPostsSorted } from "@/lib/db/queries";
import { batchAuhtorForIds } from "@/lib/db/queries";
import { PostCard } from "@/components/feed/post-card";
import { listTags } from "@/lib/db/queries";
import { getTrendingToday } from "@/lib/trending";
import { RightTrending } from "@/components/layout/right-trending";
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}:{
  searchParams:Promise<{sort?:string; tag?:string}>;
}) {
  const sp = await searchParams;
  const sortRow= sp.sort;

  const sort: FeedSort = sortRow==="new" || sortRow=== "top" ? sortRow : "hot";

  const tagFilter = sp.tag?.toLowerCase();
  const sessionUser= await getSessionUser();

  
  const rows= await listPostsSorted(sort, tagFilter, sessionUser?.id);


  const tags=await listTags();
  const tagMap = new Map(tags.map((t)=> [t.slug, t]));


  const authorIds = [...new Set(rows.map((r)=> r.post.authorId))]
   //Get all unique author IDs from the rows array.
// Example:
// rows = [
//   { post: { authorId: "u1" } },
//   { post: { authorId: "u2" } },
//   { post: { authorId: "u1" } }
// ]
// Result: ["u1", "u2"]


const authorById = await batchAuhtorForIds(authorIds);
/* it takes an array of author IDs and returns a Map of userId → user info */
//so the final result authorById is a Map you can use anywhere to look up who wrote a post:
//authorById.get(post.authorId) // → { id: "abc123", username: "shubham" }
  if(sessionUser && authorById.has(sessionUser.id)){
    authorById.set(sessionUser.id, sessionUser);
  }

  const trending= getTrendingToday();
  const cards = rows.map((row)=>{
    //this is a function that creates a ui
    const author= authorById.get(row.post.authorId) // author by id is gonna be the actual author for each of the post 
    if(!author) return null;
    return (
      <PostCard
        key= {row.post.id} 
        post = {row.post} 
        author= {author}
        tagsBySlug= {tagMap}
        score= {row.score} 
        userVote= {row.userVote}
      />
    )
  })
  /*if the logged in user is also one of the authors in the feed, replace their db data with the fresh session data. why? because session has the most up to date info about the current user, more reliable than what's in db at that moment. */

  /*remember authorById is that Map you just built:
ts{
  "user1" → { id: "user1", username: "shubham" },
  "user2" → { id: "user2", username: "john" }
}
so row.post.authorId gives you "user1" and then .get("user1") goes into that map and pulls out:
ts{ id: "user1", username: "shubham" } */
  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <FeedSortTabs current={sort} tag={tagFilter}/>
        <div className="space-y-4">
          {cards}
          {rows.length==0 && <p className="rounded-xl border-border bg-card">  no post match this filter </p>}
          
        </div>
      </div>
      <aside className="hidden w-72 shrink-0 space-y-6 lg:block">
       <RightTrending items={trending} />
        {/* <RightTopTags  /> */}
      </aside>
    </div>
  );
}



