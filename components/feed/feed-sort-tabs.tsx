import { FeedSort } from "@/lib/types";
import Link from "next/link";
import { Flame ,Sparkles, TrendingUp} from "lucide-react";
import { cn } from "@/lib/utils";

function hrefFor(sort: FeedSort, tag?: string) {
  const params = new URLSearchParams();
//   creates an empty URL params object. think of it like an empty bag you'll put query params into.
  if (sort !== "hot") params.set("sort", sort);
//   if sort is "new" or "top" → add it to the URL. if sort is "hot" → don't add anything because hot is the default, no need to put it in the URL.


  if (tag) params.set("tag", tag);
//   if a tag was selected → add it to the URL.
  
  const q = params.toString();
  return q ? `/?${q}` : "/";

  //params.toString() converts the params bag into a string like sort=new&tag=javascript. if there's something in it → return /?sort=new&tag=javascript. if empty → just return /.

}


export function FeedSortTabs({
  current,
  tag,
}: {
  current: FeedSort;
  tag?: string;
}) {
  const tabs: { id: FeedSort; label: string; icon: typeof Flame }[] = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "new", label: "New", icon: Sparkles },
    { id: "top", label: "Top", icon: TrendingUp },
  ];

  return <div className="mb-4 flex flex-wrap item-center justify-between gap-3 border-b border-border pb-3">
    <div className="flex-gap-1">
        {tabs.map(({id, label, icon: Icon})=>{
            const active = current === id;

            return <Link 
            key={id} 
            href={hrefFor(id,tag)}
                          className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}

            >
            <Icon/>
            {label}
            </Link>
        })}
    </div>
  </div>
}