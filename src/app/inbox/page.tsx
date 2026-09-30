import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { dayTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Page, PageHeader } from "@/components/app/page"
import { MatchSelect, RateButtons } from "./inbox-client"

export const metadata: Metadata = { title: "Inbox" }

const VIEWS = [
  { key: "rate", label: "To rate" },
  { key: "unmatched", label: "Unmatched" },
  { key: "all", label: "All email" },
]

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const sp = await searchParams
  const view = typeof sp.view === "string" ? sp.view : "rate"
  const world = await getWorld()
  const pById = new Map(world.prospects.map((p) => [p.id, p]))
  const sites = [...world.prospects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ id: p.id, name: p.name }))
  const pick = {
    rate: world.messages.filter((m) => m.direction === "in" && m.rating === null),
    unmatched: world.messages.filter((m) => !m.prospectId),
    all: world.messages,
  } as Record<string, typeof world.messages>
  const list = pick[view] ?? pick.rate
  const connected = !!process.env.INBOUND_TOKEN

  return (
    <Page className="max-w-[920px]">
      <PageHeader
        title="Inbox"
        description="Every email you log or forward lands here. Rate replies so the numbers know how warm they were."
        actions={
          <Link href="/settings#email" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <span className={cn("size-2 rounded-full", connected ? "bg-positive" : "border border-foreground/40")} />
            {connected ? "Mailbox webhook on" : "Mailbox not connected"}
          </Link>
        }
      />
      <div className="mb-6 flex gap-1" role="tablist">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/inbox?view=${v.key}`}
            role="tab"
            aria-selected={view === v.key}
            className={cn(
              "pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm",
              view === v.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {v.label} <span className="num text-xs opacity-60">{pick[v.key].length}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {view === "rate" ? "Every reply is rated. Nice." : view === "unmatched" ? "Every email is matched to a site." : "No email yet."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {list.map((m) => {
            const p = m.prospectId ? pById.get(m.prospectId) : undefined
            const awaiting = p && (p.stage === "question_sent" || p.stage === "site_sent")
            return (
              <li key={m.id} className="rounded-xl border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className={cn("mr-2 inline-block rounded px-1.5 text-[11px] font-medium", m.direction === "in" ? "bg-move-soft" : "bg-muted text-muted-foreground")}>
                        {m.direction === "in" ? "In" : "Out"}
                      </span>
                      {p ? (
                        <Link href={`/sites/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{m.fromAddr || "Unknown sender"}</span>
                      )}
                    </p>
                    <p className="mt-1 truncate font-medium">{m.subject || "(no subject)"}</p>
                  </div>
                  <time className="num text-xs text-muted-foreground">{dayTime(m.at)}</time>
                </div>
                {m.body && <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">{m.body}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {m.direction === "in" && <RateButtons id={m.id} rating={m.rating} />}
                  {!p && <MatchSelect id={m.id} sites={sites} />}
                  {awaiting && (
                    <Link href={`/sites/${p.id}`} className="ml-auto inline-flex items-center gap-1 text-sm font-medium hover:underline">
                      Record it as a reply <ArrowRightIcon className="size-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
