"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { BuildMeter, StagePill, VerticalMark } from "@/components/app/status"
import { ago, host, href } from "@/lib/format"
import { STAGES, type BuildState, type Stage, type Status } from "@/lib/flow"
import { cn } from "@/lib/utils"

export type SiteListRow = {
  id: string
  name: string
  city: string
  verticalId: string
  verticalName: string
  hue: number
  build: BuildState
  stage: Stage
  status: Status
  oldSiteUrl: string
  demoUrl: string
  next: { title: string; due: boolean; at?: number } | null
  lastMessage: { direction: "in" | "out"; at: number } | null
  lastActivityAt: number
  positive: boolean
}

const VIEWS = [
  { key: "all", label: "All" },
  { key: "move", label: "Your move" },
  { key: "waiting", label: "Waiting" },
  { key: "fresh", label: "Not contacted" },
  { key: "positive", label: "Positive" },
  { key: "closed", label: "Closed" },
] as const

function inView(r: SiteListRow, view: string) {
  switch (view) {
    case "move":
      return r.status === "your_move" || r.next?.due === true
    case "waiting":
      return r.status === "waiting"
    case "fresh":
      return r.status === "not_started"
    case "positive":
      return r.positive
    case "closed":
      return r.status === "lost" || r.status === "won"
    default:
      return true
  }
}

type SortKey = "name" | "activity" | "stage"

export function SitesTable({ rows, verticals, initialView, initialVertical }: { rows: SiteListRow[]; verticals: { id: string; name: string; hue: number }[]; initialView: string; initialVertical: string }) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [view, setView] = React.useState(initialView)
  const [vertical, setVertical] = React.useState(initialVertical)
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: "activity", dir: -1 })

  const counts = Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter((r) => (!vertical || r.verticalId === vertical) && inView(r, v.key)).length]))
  const shown = rows
    .filter((r) => inView(r, view) && (!vertical || r.verticalId === vertical))
    .filter((r) => !q.trim() || q.toLowerCase().split(/\s+/).every((t) => `${r.name} ${r.city} ${r.oldSiteUrl} ${r.verticalName}`.toLowerCase().includes(t)))
    .sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * sort.dir
      if (sort.key === "stage") return (STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)) * sort.dir
      return (a.lastActivityAt - b.lastActivityAt) * sort.dir
    })

  const head = (k: SortKey, label: string, className?: string) => (
    <th key={k} className={cn("px-3 py-2.5 text-left font-normal", className)}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : k === "name" ? 1 : -1 }))}>
        {label}
        {sort.key === k && (sort.dir === 1 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
      </button>
    </th>
  )

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Filter by status">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={cn("pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm", view === v.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
            >
              {v.label}
              <span className="num text-xs opacity-60">{counts[v.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city, URL" className="pl-8" aria-label="Search sites" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => setVertical("")} className={cn("pressable h-7 rounded-md border px-2.5 text-xs", !vertical ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent")}>
          All verticals
        </button>
        {verticals.map((v) => (
          <button
            key={v.id}
            onClick={() => setVertical(vertical === v.id ? "" : v.id)}
            className={cn("pressable inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs", vertical === v.id ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent")}
          >
            <VerticalMark hue={v.hue} className="size-1.5" />
            {v.name}
          </button>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {head("name", "Firm", "w-[30%]")}
              <th className="px-3 py-2.5 text-left font-normal">Build</th>
              {head("stage", "Stage")}
              <th className="px-3 py-2.5 text-left font-normal">Next</th>
              {head("activity", "Last touch")}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("a,button")) router.push(`/sites/${r.id}`)
                }}
                className="group cursor-pointer border-b transition-colors duration-100 last:border-0 hover:bg-accent/50"
              >
                <td className="max-w-0 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/sites/${r.id}`} className="truncate font-medium hover:underline">
                      {r.name}
                    </Link>
                    {r.demoUrl && (
                      <a href={href(r.demoUrl)} target="_blank" rel="noreferrer" aria-label="Open demo" className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground">
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <VerticalMark hue={r.hue} className="size-1.5" />
                    <span className="truncate">{[r.verticalName, r.city, r.oldSiteUrl && host(r.oldSiteUrl)].filter(Boolean).join(" · ")}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <BuildMeter build={r.build} />
                </td>
                <td className="px-3 py-2.5">
                  <StagePill stage={r.stage} status={r.status} />
                </td>
                <td className="max-w-[16rem] px-3 py-2.5">
                  {r.next ? <span className={cn("block truncate", r.next.due ? "font-medium" : "text-muted-foreground")}>{r.next.title}</span> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="num px-3 py-2.5 whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
                  {ago(r.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty hasRows={rows.length > 0} />}
      </div>

      <ul className="grid gap-2 md:hidden">
        {shown.map((r) => (
          <li key={r.id}>
            <Link href={`/sites/${r.id}`} className="pressable block rounded-xl border bg-surface p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <VerticalMark hue={r.hue} className="size-1.5" />
                    {[r.verticalName, r.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="num text-xs text-muted-foreground" suppressHydrationWarning>
                  {ago(r.lastActivityAt)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <StagePill stage={r.stage} status={r.status} />
              </div>
              {r.next?.due && <p className="mt-1.5 text-sm font-medium">{r.next.title}</p>}
            </Link>
          </li>
        ))}
        {!shown.length && <Empty hasRows={rows.length > 0} />}
      </ul>
    </div>
  )
}

function Empty({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="px-6 py-14 text-center text-sm text-muted-foreground">
      {hasRows ? "No sites match these filters." : "No sites yet. Ask ChatGPT to add the first twenty for a vertical."}
    </div>
  )
}
