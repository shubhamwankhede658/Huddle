import { FeedSort , User, VoteTarget} from "../types";
import { Post } from "../types";
import {prisma} from '../../lib/prisma'
import { PostModel } from "../generated/prisma/models";
import { Tag } from "../types";


export async function batchAuhtorForIds(
  // we dont just want  author  id we want info about the author 
  authorIds: string[]
): Promise<Map<string,User>>{
  //id and user info about that author
  const unique = [...new Set(authorIds)];
  //removes duplicates. imagine 10 posts all written by the same person — you don't want to fetch that user 10 times. Set removes duplicates, spread ... converts it back to array.

  if(unique.length == 0) return new Map();
  //if no ids at all, just return empty map immediately. no point hitting the db.

  const rows = await prisma.userProfile.findMany({
    where :{ id : {in :unique}},
  });
  //fetch all users in one db call. in: unique means "give me all users whose id is in this array". so if unique is ["abc123", "def456"] it fetches both users at once.

  const result = new Map<string,User>();

  for (const row of rows){
    result.set(row.id, {id: row.id, username: row.username})
  }//it converts an array of user rows into a Map where the key is the user ID and the value is a simplified user object.
 //converts the array of db rows into a Map
 /*you get:
ts// map (easy to look up by id)
{
  "abc123" → { id: "abc123", username: "shubham" },
  "def456" → { id: "def456", username: "john" }
}*/
  for(const id of unique){
    if(!result.has(id)){
      result.set(id, {id, username: `user_${id.slice(0,6)}`})
    }
  }
  //if a user id exists in posts but their profile doesn't exist in db (deleted account etc), don't crash — just give them a fake username like "user_abc123".
  return result;
}


export type FeedPostRow= {
    post:Post;
    score:number;
    userVote: -1 | 0 | 1;
};

export async function listTags(): Promise<Tag[]> {
  const rows = await prisma.tag.findMany({ orderBy: { slug: "asc" } });
  return rows.map((t) => ({
    slug: t.slug,
    label: t.label,
    hashColor: t.hashColor,
  }));
}


export async function listPostsSorted(
  sort: FeedSort,
  tagFilter: string | undefined,
  userId: string | undefined,
) :Promise<FeedPostRow[]>{
  const  where =tagFilter
    ? { postTags: { some: { tagSlug: tagFilter.toLowerCase() } } }
    : undefined;
  const postRows = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const ids = postRows.map((p) => p.id);
  if (ids.length === 0) return [];

  const [tagMap, ccMap, vsMap, uvMap] = await Promise.all([
    tagsForPosts(ids),
    commentCountsForPosts(ids),
    voteSumsForPosts(ids),
    userVotesForPosts(userId, ids),
  ]);

  const mapped = postRows.map((row)=>{
    const slugs = tagMap.get(row.id) ?? [];
    /*so tagMap.get(row.id) is basically saying — "give me the tags for this specific post".
    the ?? [] part means — if this post has no tags in the map, just use empty array instead of undefined.
so slug ends up being just an array of tag names for that post.*/

   const cc = ccMap.get(row.id) ?? 0;
   const vs= vsMap.get(row.id) ?? 0;
    return {
      post:mapPostRow(row, slugs, cc),
      voteScore:vs,
      created:row.createdAt.getTime(),
      userVote:uvMap.get(row.id) ?? 0,
    }
  })

  if(sort ==="new"){
    mapped.sort((a,b)=>b.created - a.created)
    // new to old
  }else if(sort=="top"){
    // Sort by vote score descending. If tied, sort by comment count descending. If still tied, sort by creation date descending (newest first)
    mapped.sort(
      (a,b)=>
        b.voteScore - a.voteScore || 
      b.post.commentCount - a.post.commentCount ||
      b.created - a.created
    );
  }else{
    mapped.sort((a, b) => {
      const hotB = b.voteScore + 2 * b.post.commentCount;
      const hotA = a.voteScore + 2 * a.post.commentCount;
      return hotB - hotA || b.created - a.created;
    });
  }

    return mapped.map((x) => ({
      post: x.post,
      score: x.voteScore,
      userVote: x.userVote,
    }));

}


async function userVotesForPosts(
  // same concept as voteSums but this one is personal — it checks what THIS specific user voted on each post.
  userId: string | undefined,
  postIds: string[],
): Promise<Map<string, -1 | 0 | 1>> {
  const m = new Map<string, -1 | 0 | 1>();
  if (!userId || postIds.length === 0) return m;
  // if no userId (user not logged in) or no posts, return empty map immediately. no point hitting db if user isn't logged in
  const rows = await prisma.vote.findMany({
    where: {
      userId,
      targetType: "post",// wer are only looking for upvote for post
      targetId: { in: postIds },
    },
    // fetch all votes from this specific user on these specific posts. so if userId is "shubham123", it only gets shubham's votes, nobody else's.
  });
  for (const r of rows) {
    const v = r.value;
    m.set(r.targetId, v === -1 || v === 1 ? v : 0);
  }
  // loops through and builds the map. v === -1 || v === 1 ? v : 0 is just a safety check — if value is somehow not 1 or -1, use 0 instead of crashing.
  return m;
  /**ts{
  "abc123" → 1,    // shubham upvoted this
  "ghi789" → -1,   // shubham downvoted this
                   // "def456" not in map = didn't vote
} */
}


async function voteSumsForPosts(
  postIds: string[],
): Promise<Map<string, number>> {
  // this function calculates the total vote score for each post.
  if (postIds.length === 0) return new Map();
    // no ids passed in, return empty map immediately.

  const rows = await prisma.vote.groupBy({
    /*groupBy here is telling db — "group all votes by targetId and sum up their values".
your votes table looks like:if votes table look like this
{ userId: "u1", targetType: "post", targetId: "abc123", value: 1  }  // upvote
{ userId: "u2", targetType: "post", targetId: "abc123", value: 1  }  // upvote
{ userId: "u3", targetType: "post", targetId: "abc123", value: -1 }  // downvote
{ userId: "u4", targetType: "post", targetId: "def456", value: 1  }  // upvote
// [targetType: "post" filters out comment votes so you only get post votes.
after groupBy, rows looks like:
  { targetId: "abc123", _sum: { value: 1 } },  // 1 + 1 + (-1) = 1
  { targetId: "def456", _sum: { value: 1 } },
]*/
    by: ["targetId"],
    where: {
      targetType: "post",
      targetId: { in: postIds },
    },
    _sum: { value: true },
  });
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.targetId, Number(r._sum.value ?? 0));
  }
  return m;
  /**{
  "abc123" → 1,
  "def456" → 1,
}
so later vsMap.get("abc123") gives you the total score for that post instantly. */
}


async function commentCountsForPosts(
  postIds: string[],
): Promise<Map<string, number>> {
  // this function counts how many comments each post has and returns it as a Map.
  if (postIds.length === 0) return new Map();
  const rows = await prisma.comment.groupBy({
    // is like telling the db — "group all comments by their postId and count them".
    /*so if you have comments like:
ts{ id: "c1", postId: "abc123" }
{ id: "c2", postId: "abc123" }
{ id: "c3", postId: "abc123" }
{ id: "c4", postId: "def456" }
after groupBy, rows looks like:
ts[
  { postId: "abc123", _count: { _all: 3 } },
  { postId: "def456", _count: { _all: 1 } },
] */
    by: ["postId"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.postId, r._count._all);
  }
  /*converts that array into a Map:
ts{
  "abc123" → 3,
  "def456" → 1,
  "ghi789" → 0   // not in map means 0 comments
}
so later when you do ccMap.get("abc123") you instantly get 3 */
  return m;
}



async function tagsForPosts(postIds: string[]): Promise<Map<string, string[]>> {
    // we provide post id to this function , then post tas table has postid and tagslug function returns map{key, value}
  const m = new Map<string, string[]>();

  if (postIds.length === 0) return m;
  const rows = await prisma.postTag.findMany({
    where: { postId: { in: postIds } },
  });
  for (const pid of postIds) m.set(pid, []);
  for (const r of rows) {
    const list = m.get(r.postId) ?? [];
    list.push(r.tagSlug);
    m.set(r.postId, list);
  }
  return m;
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

export async function getUserVote(
  userId: string | undefined,
  type: VoteTarget,
  targetId: string,
) :Promise< -1 | 0 | 1>{
  if(!userId) return 0;

  const row = await prisma.vote.findUnique({
    where:{
      //combination all of these has a unique id
      userId_targetType_targetId:{
        userId,
        targetType: type,
        targetId
      }
    }
  });

  const v = row?.value;

  return v == -1 || v==1?v:0;
}


export async function getPostById(id:string):Promise<Post | undefined>{
  const row = await prisma.post.findUnique({where : {id}})
  if(!row) return undefined;

  const [tagMap, ccMap] = await Promise.all([
    tagsForPosts([id]),
    commentCountsForPosts([id])
  ])

  return mapPostRow(row, tagMap.get(id)?? [] , ccMap.get(id) ?? 0)
}

export async function getAuthorById(authorId: string):Promise<User>{
  const row = await prisma.userProfile.findUnique({where : {id: authorId}})
  return row? {id : row.id, username: row.username} : {id: authorId,username: `user_${authorId.slice(0,6)}`}
}

export async function getPostScore(postId: string) : Promise<number>{
  // same concept as voteSumsForPosts but simpler — this one gets the score for just ONE specific post instead of many.
  const agg = await prisma.vote.aggregate({
    where :{ targetType: "post", targetId: postId},
    _sum : {value: true},
  });
  return Number(agg._sum.value ?? 0);
}


export async function tagPostCounts(): Promise<{ tag: Tag; count: number }[]> {
  // This function returns all tags along with the number of posts that use each tag.
  const allTags = await listTags();
  const rows = await prisma.postTag.groupBy({
    by: ["tagSlug"],
    _count: { _all: true },
  });
  const countMap = new Map(rows.map((r) => [r.tagSlug, r._count._all]));
  return allTags.map((tag) => ({
    tag,
    count: countMap.get(tag.slug) ?? 0,
  }));
}






