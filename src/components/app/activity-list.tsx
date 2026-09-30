import Link from "next/link"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/format"
import { NODES } from "@/lib/flow"
import type { ActivityItem } from "@/lib/activity"
import { ClockIcon, LightbulbIcon, MailIcon, StickyNoteIcon } from "lucide-react"

function Glyph({ item }: { item: ActivityItem }) {
  if (item.kind === "step" && item.node) {
    const n = NODES[item.node]
    const color =
      n.kind === "won"
        ? "var(--st-won)"
        : n.kind === "lost"
          ? "var(--st-lost)"
          : n.kind === "action"
            ? "var(--st-move)"
            : item.node === "site_positive"
              ? "var(--positive)"
              : "var(--st-wait)"
    return <span className="mt-1.5 size-2 rounded-full ring-4 ring-background" style={{ background: color }} />
  }
  const Icon = item.kind === "work" ? ClockIcon : item.kind === "lesson" ? LightbulbIcon : item.kind === "email" ? MailIcon : StickyNoteIcon
  return <Icon className={cn("mt-0.5 size-3.5 bg-background", item.kind === "lesson" ? "text-st-move" : "text-muted-foreground")} />
}

export function ActivityList({
  items,
  names,
  empty = "Nothing yet.",
  action,
}: {
  items: ActivityItem[]
  names?: Map<string, string>
  empty?: string
  action?: (item: ActivityItem) => React.ReactNode
}) {
  if (!items.length) return <p className="py-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <ol className="relative grid">
      <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-px bg-border" />
      {items.map((it) => (
        <li key={it.kind + it.id} className="group relative grid grid-cols-[16px_1fr_auto] gap-3 py-2">
          <span className="flex justify-center">
            <Glyph item={it} />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-snug">
              {names && it.prospectId ? (
                <>
                  <Link href={`/sites/${it.prospectId}`} className="font-medium hover:underline">
                    {names.get(it.prospectId)}
                  </Link>{" "}
                  <span className="text-muted-foreground">{it.title.charAt(0).toLowerCase() + it.title.slice(1)}</span>
                </>
              ) : (
                <span className={cn(it.kind === "step" && "font-medium")}>{it.title}</span>
              )}
              {it.sentiment != null && (
                <span
                  className="ml-2 inline-block rounded px-1 text-[11px] font-medium"
                  style={{
                    color: it.sentiment > 0 ? "var(--positive)" : it.sentiment < 0 ? "var(--negative)" : "var(--muted-foreground)",
                    background: `color-mix(in oklch, ${it.sentiment > 0 ? "var(--positive)" : it.sentiment < 0 ? "var(--negative)" : "var(--muted-foreground)"} 12%, transparent)`,
                  }}
                >
                  {it.sentiment > 0 ? "positive" : it.sentiment < 0 ? "negative" : "neutral"}
                </span>
              )}
            </p>
            {it.body && <p className="mt-0.5 text-sm text-pretty whitespace-pre-line text-muted-foreground">{it.body}</p>}
          </div>
          <div className="flex items-start gap-1">
            <time className="num pt-px text-xs whitespace-nowrap text-muted-foreground" dateTime={it.at.toISOString()} title={it.at.toLocaleString()}>
              {ago(it.at)}
            </time>
            {action?.(it)}
          </div>
        </li>
      ))}
    </ol>
  )
}
