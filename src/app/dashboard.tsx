"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { MessageCircleIcon, XIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import { moveToStage, setCallStatus } from "@/app/actions"
import { CallToggle, StageMenu, StageSwatch, STAGE_COLOR } from "@/components/app/stage"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BOARD, BOARD_EXTRA, BOARD_LABEL, type BoardKey, type CallStatus } from "@/lib/flow"
import { cn } from "@/lib/utils"

export type DashRow = { id: string; name: string; city: string; board: BoardKey; callStatus: CallStatus; unread: boolean }

/** Furthest along first; the two outside stages at the ends. */
const ORDER: BoardKey[] = ["order", "call", "site_reply", "site_sent", "response", "question_sent", "not_contacted", "lost"]
/** Clockwise from twelve o'clock, in pipeline order. */
const RING: BoardKey[] = ["not_contacted", ...BOARD.map((b) => b.key), "lost"]

const config = Object.fromEntries([...BOARD, ...BOARD_EXTRA].map((b) => [b.key, { label: b.label, color: STAGE_COLOR[b.key] }])) satisfies ChartConfig

type Patch = { id: string; board?: BoardKey; callStatus?: CallStatus }

export function DashboardView({ rows: initial }: { rows: DashRow[] }) {
  const [rows, apply] = React.useOptimistic(initial, (state: DashRow[], p: Patch) => state.map((r) => (r.id === p.id ? { ...r, ...p } : r)))
  const [, start] = React.useTransition()
  const [filter, setFilter] = React.useState<BoardKey | null>(null)

  const counts = new Map<BoardKey, number>()
  for (const r of rows) counts.set(r.board, (counts.get(r.board) ?? 0) + 1)
  const n = (k: BoardKey) => counts.get(k) ?? 0

  const change = (p: Patch, run: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      apply(p)
      const res = await run()
      if (!res.ok) toast.error(res.error ?? "Couldn't save that.")
    })

  const shown = rows
    .filter((r) => !filter || r.board === filter)
    .sort((a, b) => ORDER.indexOf(a.board) - ORDER.indexOf(b.board) || Number(b.unread) - Number(a.unread) || a.name.localeCompare(b.name))

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <StageChart total={rows.length} count={n} filter={filter} onFilter={setFilter} />

      <section aria-label="Clubs" className="min-w-0 rounded-xl border bg-surface">
        <div className="flex h-12 items-center justify-between gap-3 border-b px-4">
          <h2 className="text-sm font-medium">
            {filter ? BOARD_LABEL[filter] : "All clubs"} <span className="num ml-1 font-normal text-muted-foreground">{shown.length}</span>
          </h2>
          {filter && (
            <button onClick={() => setFilter(null)} className="pressable inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <XIcon className="size-3.5" />
              Show all
            </button>
          )}
        </div>

        <div role="table" aria-label="Clubs by stage">
          <div role="row" className="hidden grid-cols-[minmax(0,1fr)_12rem_8.5rem] gap-4 border-b px-4 py-2 text-xs text-muted-foreground md:grid">
            <span role="columnheader">Club</span>
            <span role="columnheader" className="pl-2">
              Stage
            </span>
            <span role="columnheader">Call</span>
          </div>
          {shown.map((r) => (
            <div
              key={r.id}
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5 transition-colors duration-100 last:border-0 hover:bg-accent/40 md:grid-cols-[minmax(0,1fr)_12rem_8.5rem] md:gap-4"
            >
              <div role="cell" className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
                <Link href={`/sites/${r.id}`} className={cn("min-w-0 truncate hover:underline", r.unread ? "font-semibold" : "font-medium")}>
                  {r.name}
                </Link>
                {r.unread && <Unread />}
                {r.city && <span className="hidden shrink truncate text-xs text-muted-foreground sm:inline">{r.city}</span>}
              </div>
              <div role="cell" className="-ml-2 min-w-0">
                <StageMenu stage={r.board} onChange={(board) => change({ id: r.id, board }, () => moveToStage(r.id, board))} />
              </div>
              <div role="cell" className="justify-self-end md:justify-self-start">
                <CallToggle value={r.callStatus} onChange={(callStatus) => change({ id: r.id, callStatus }, () => setCallStatus(r.id, callStatus))} />
              </div>
            </div>
          ))}
          {!shown.length && <p className="px-4 py-12 text-center text-sm text-muted-foreground">No clubs in this stage.</p>}
        </div>
      </section>
    </div>
  )
}

function Unread() {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="relative inline-flex shrink-0 text-foreground/80" aria-label="New reply, not opened yet" role="img" />}>
        <MessageCircleIcon className="size-4" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-st-move ring-2 ring-surface" />
      </TooltipTrigger>
      <TooltipContent>New reply, not opened yet</TooltipContent>
    </Tooltip>
  )
}

/** The donut, and its legend doubling as the stage filter and the table of figures. */
function StageChart({ total, count, filter, onFilter }: { total: number; count: (k: BoardKey) => number; filter: BoardKey | null; onFilter: (k: BoardKey | null) => void }) {
  const data = RING.filter((k) => count(k) > 0).map((k) => ({ key: k, label: BOARD_LABEL[k], count: count(k), fill: STAGE_COLOR[k] }))
  const legend: BoardKey[] = [...BOARD.map((b) => b.key), ...BOARD_EXTRA.map((b) => b.key).filter((k) => count(k) > 0)]
  const pick = (k: BoardKey) => onFilter(filter === k ? null : k)

  return (
    <section aria-label="Clubs by stage" className="rounded-xl border bg-surface p-5 lg:sticky lg:top-20">
      <div className="relative mx-auto size-[200px]">
        <ChartContainer config={config} className="aspect-square size-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={data.length ? data : [{ key: "none", label: "", count: 1, fill: "var(--muted)" }]}
              dataKey="count"
              nameKey="key"
              innerRadius={70}
              outerRadius={98}
              startAngle={90}
              endAngle={-270}
              cornerRadius={4}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(_, i) => data[i] && pick(data[i].key)}
              className="cursor-pointer outline-none"
            >
              {(data.length ? data : [{ key: "none", fill: "var(--muted)" }]).map((d) => (
                <Cell key={d.key} fill={d.fill} fillOpacity={!filter || filter === d.key ? 1 : 0.22} className="transition-[fill-opacity] duration-150 outline-none" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-3xl font-medium tracking-tight">{filter ? count(filter) : total}</p>
            <p className="mt-0.5 max-w-[7.5rem] text-xs leading-tight text-muted-foreground">{filter ? BOARD_LABEL[filter] : total === 1 ? "club" : "clubs"}</p>
          </div>
        </div>
      </div>

      <ul className="mt-5 grid gap-0.5">
        {legend.map((k) => {
          const v = count(k)
          const on = filter === k
          return (
            <li key={k}>
              <button
                onClick={() => pick(k)}
                disabled={!v}
                aria-pressed={on}
                className={cn(
                  "pressable flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm disabled:cursor-default",
                  on ? "bg-accent font-medium" : "hover:bg-accent/60 disabled:hover:bg-transparent",
                  !v && "text-muted-foreground",
                )}
              >
                <StageSwatch stage={k} className={cn(!v && "opacity-40")} />
                <span className="min-w-0 flex-1 truncate">{BOARD_LABEL[k]}</span>
                <span className="num w-6 text-right">{v}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
