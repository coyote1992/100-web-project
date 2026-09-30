import Link from "next/link"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/format"
import type { ActivityItem } from "@/lib/activity"
import { CircleIcon, LightbulbIcon, MailIcon, MessageSquareQuoteIcon } from "lucide-react"

function Glyph({ item }: { item: ActivityItem }) {
  if (item.kind === "stage") return <span className="mt-1.5 size-2 rounded-full bg-st-move ring-4 ring-background" />
  const Icon = item.kind === "email" ? MailIcon : item.kind === "lesson" ? LightbulbIcon : item.kind === "extract" ? MessageSquareQuoteIcon : CircleIcon
  return <Icon className={cn("mt-0.5 size-3.5 bg-background", item.kind === "lesson" ? "text-st-move" : "text-muted-foreground")} />
}

export function ActivityList({ items, names, empty = "Nothing yet." }: { items: ActivityItem[]; names?: Map<string, string>; empty?: string }) {
  if (!items.length) return <p className="py-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <ol className="relative grid">
      <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-px bg-border" />
      {items.map((it) => (
        <li key={it.kind + it.id} className="relative grid grid-cols-[16px_1fr_auto] gap-3 py-2">
          <span className="flex justify-center">
            <Glyph item={it} />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-snug">
              {names && (
                <>
                  <Link href={`/sites/${it.siteId}`} className="font-medium hover:underline">
                    {names.get(it.siteId)}
                  </Link>{" "}
                </>
              )}
              <span className={cn(names ? "text-muted-foreground" : it.kind === "stage" ? "font-medium" : "")}>{names ? it.title.charAt(0).toLowerCase() + it.title.slice(1) : it.title}</span>
            </p>
            {it.body && <p className="mt-0.5 line-clamp-3 text-sm text-pretty whitespace-pre-line text-muted-foreground">{it.body}</p>}
          </div>
          <time className="num pt-px text-xs whitespace-nowrap text-muted-foreground" dateTime={it.at.toISOString()} suppressHydrationWarning>
            {ago(it.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}
