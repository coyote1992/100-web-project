"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, PackageIcon, SearchIcon, XIcon } from "lucide-react"
import { assignBatch, createBatch } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BuildMeter, StagePill, VerticalMark } from "@/components/app/status"
import { ago, host, href, minutes } from "@/lib/format"
import { cn } from "@/lib/utils"

export type SiteListRow = {
  id: string
  name: string
  city: string
  verticalId: string
  verticalName: string
  hue: number
  batchId: string | null
  batchName: string
  build: "scouted" | "building" | "ready"
  stage: string | null
  parked: boolean
  status: string
  specMinutes: number
  lastActivityAt: number
  oldSiteUrl: string
  demoUrl: string
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
      return r.status === "your_move" || (r.status === "not_started" && r.build === "ready")
    case "waiting":
      return r.status === "waiting"
    case "fresh":
      return r.status === "not_started"
    case "positive":
      return r.positive
    case "closed":
      return r.status === "lost" || r.status === "won" || r.status === "parked"
    default:
      return true
  }
}

type SortKey = "name" | "activity" | "hours" | "stage"
const STAGE_ORDER = ["question_sent", "question_no_reply", "question_replied", "site_sent", "site_no_reply", "site_replied", "call", "site_negative", "site_positive", "call_negative", "call_proposal", "proposal_negative", "paid"]

export function SitesTable({
  rows,
  verticals,
  batches,
  initialView,
  initialVertical,
}: {
  rows: SiteListRow[]
  verticals: { id: string; name: string; hue: number }[]
  batches: { id: string; name: string }[]
  initialView: string
  initialVertical: string
}) {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [view, setView] = React.useState(initialView)
  const [vertical, setVertical] = React.useState(initialVertical)
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: "activity", dir: -1 })
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [pending, start] = React.useTransition()

  const counts = Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter((r) => (!vertical || r.verticalId === vertical) && inView(r, v.key)).length]))

  const shown = rows
    .filter((r) => inView(r, view))
    .filter((r) => !vertical || r.verticalId === vertical)
    .filter((r) => {
      if (!q.trim()) return true
      const hay = `${r.name} ${r.city} ${r.oldSiteUrl} ${r.verticalName} ${r.batchName}`.toLowerCase()
      return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))
    })
    .sort((a, b) => {
      const d = sort.dir
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * d
        case "hours":
          return (a.specMinutes - b.specMinutes) * d
        case "stage":
          return (STAGE_ORDER.indexOf(a.stage ?? "") - STAGE_ORDER.indexOf(b.stage ?? "")) * d
        default:
          return (a.lastActivityAt - b.lastActivityAt) * d
      }
    })

  const allChecked = shown.length > 0 && shown.every((r) => selected.has(r.id))

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const sortHead = (k: SortKey, children: React.ReactNode, className?: string) => (
    <th key={k} className={cn("px-3 py-2.5 text-left font-normal", className)}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : k === "name" ? 1 : -1 }))}
      >
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
      </button>
    </th>
  )

  function toBatch(batchId: string | null) {
    const ids = [...selected]
    start(async () => {
      await assignBatch(ids, batchId)
      toast.success(batchId ? `Moved ${ids.length} to ${batches.find((b) => b.id === batchId)?.name}` : `Removed ${ids.length} from their batch`)
      setSelected(new Set())
    })
  }

  function newBatch() {
    const ids = [...selected]
    const name = `Batch ${batches.length + 1}`
    start(async () => {
      await createBatch({ name, prospectIds: ids })
      toast.success(`${name} created with ${ids.length} site${ids.length > 1 ? "s" : ""}`, {
        action: { label: "Open batches", onClick: () => router.push("/batches") },
      })
      setSelected(new Set())
    })
  }

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
              className={cn(
                "pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm",
                view === v.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {v.label}
              <span className={cn("num text-xs", view === v.key ? "opacity-70" : "opacity-60")}>{counts[v.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, city, URL" className="pl-8" aria-label="Search sites" />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setVertical("")}
          className={cn("pressable h-7 rounded-md border px-2.5 text-xs", !vertical ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent")}
        >
          All verticals
        </button>
        {verticals.map((v) => (
          <button
            key={v.id}
            onClick={() => setVertical(vertical === v.id ? "" : v.id)}
            className={cn(
              "pressable inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs",
              vertical === v.id ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <VerticalMark hue={v.hue} className="size-1.5" />
            {v.name}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 py-2.5 pl-4">
                <Checkbox
                  aria-label="Select all"
                  checked={allChecked}
                  onCheckedChange={(c) => setSelected(c ? new Set(shown.map((r) => r.id)) : new Set())}
                />
              </th>
              {sortHead("name", "Firm", "w-[34%]")}
              <th className="px-3 py-2.5 text-left font-normal">Build</th>
              {sortHead("stage", "Outreach")}
              {sortHead("hours", "Spec time", "text-right")}
              <th className="hidden px-3 py-2.5 text-left font-normal xl:table-cell">Batch</th>
              {sortHead("activity", "Last touch")}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button,[role=checkbox]")) return
                  router.push(`/sites/${r.id}`)
                }}
                className={cn("group cursor-pointer border-b transition-colors duration-100 last:border-0 hover:bg-accent/50", selected.has(r.id) && "bg-move-soft/60")}
              >
                <td className="py-2.5 pl-4">
                  <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                </td>
                <td className="max-w-0 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/sites/${r.id}`} className="truncate font-medium hover:underline">
                      {r.name}
                    </Link>
                    {r.demoUrl && (
                      <a href={href(r.demoUrl)} target="_blank" rel="noreferrer" className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground" aria-label="Open demo">
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
                  <StagePill stage={r.stage} parked={r.parked} />
                </td>
                <td className="num px-3 py-2.5 text-right">{r.specMinutes ? minutes(r.specMinutes) : <span className="text-muted-foreground">—</span>}</td>
                <td className="hidden max-w-[12rem] truncate px-3 py-2.5 text-muted-foreground xl:table-cell">{r.batchName || "—"}</td>
                <td className="num px-3 py-2.5 whitespace-nowrap text-muted-foreground" suppressHydrationWarning>{ago(r.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty hasRows={rows.length > 0} />}
      </div>

      {/* Mobile list */}
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
                <span className="num text-xs text-muted-foreground" suppressHydrationWarning>{ago(r.lastActivityAt)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <StagePill stage={r.stage} parked={r.parked} />
                <span className="num text-muted-foreground">{r.specMinutes ? minutes(r.specMinutes) : ""}</span>
              </div>
            </Link>
          </li>
        ))}
        {!shown.length && <Empty hasRows={rows.length > 0} />}
      </ul>

      {/* Bulk bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-[transform,opacity] duration-200 ease-(--ease-out-strong)",
          selected.size ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <div className="flex items-center gap-2 rounded-xl border bg-popover p-1.5 pl-3.5 text-sm shadow-[0_8px_30px_-6px_oklch(0.2_0.02_60/0.25)]">
          <span className="num font-medium">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" variant="outline" disabled={pending} />}>
              <PackageIcon />
              Batch
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="min-w-52">
              <DropdownMenuItem onClick={newBatch}>New batch from selection</DropdownMenuItem>
              {batches.length > 0 && <DropdownMenuSeparator />}
              {batches.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => toBatch(b.id)}>
                  {b.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toBatch(null)}>Remove from batch</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon-sm" variant="ghost" aria-label="Clear selection" onClick={() => setSelected(new Set())}>
            <XIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function Empty({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="px-6 py-14 text-center text-sm text-muted-foreground">
      {hasRows ? "No sites match these filters." : "No sites yet. Press N to add the first one."}
    </div>
  )
}
