"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronRightIcon, MessageCircleIcon, PhoneIcon, XIcon } from "lucide-react"
import { moveToStage, setCallStatus } from "@/app/actions"
import { CallCycle, StageMenu, StageSwatch, STAGE_COLOR } from "@/components/app/stage"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BOARD, BOARD_EXTRA, BOARD_LABEL, type BoardKey, type CallStatus, type ContactRole, type PhoneOwner } from "@/lib/flow"
import { cn } from "@/lib/utils"
import { phoneWho, telHref } from "@/lib/phone"

export type DashRow = {
  id: string
  name: string
  city: string
  board: BoardKey
  callStatus: CallStatus
  unread: boolean
  phone: string
  phoneOwner: PhoneOwner
  contactName: string
  contactRole: ContactRole
}

/** Furthest along first; the two outside stages at the end. */
const ORDER: BoardKey[] = ["order", "call", "site_reply", "site_sent", "response", "question_sent", "not_contacted", "lost"]

type Patch = { id: string; board?: BoardKey; callStatus?: CallStatus }

export function DashboardView({ title, rows: initial }: { title: string; rows: DashRow[] }) {
  const [rows, apply] = React.useOptimistic(initial, (state: DashRow[], p: Patch) => state.map((r) => (r.id === p.id ? { ...r, ...p } : r)))
  const [, start] = React.useTransition()
  const [filter, setFilter] = React.useState<BoardKey | null>(null)
  const [closed, setClosed] = React.useState<Set<BoardKey>>(new Set())

  const counts = new Map<BoardKey, number>()
  for (const r of rows) counts.set(r.board, (counts.get(r.board) ?? 0) + 1)
  const n = (k: BoardKey) => counts.get(k) ?? 0

  const change = (p: Patch, run: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      apply(p)
      const res = await run()
      if (!res.ok) toast.error(res.error ?? "Couldn't save that.")
    })

  const toggle = (k: BoardKey) =>
    setClosed((c) => {
      const next = new Set(c)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const groups = ORDER.filter((k) => n(k) > 0 && (!filter || filter === k))

  return (
    <div className="grid gap-6">
      <StageRings title={title} total={rows.length} count={n} filter={filter} onFilter={(k) => setFilter((f) => (f === k ? null : k))} />

      <section aria-label="Clubs" className="overflow-hidden rounded-[14px] border bg-surface">
        {filter && (
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2 text-sm text-muted-foreground">
            <span>
              Only <span className="font-medium text-foreground">{BOARD_LABEL[filter]}</span>
            </span>
            <button onClick={() => setFilter(null)} className="pressable inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent hover:text-foreground">
              <XIcon className="size-3.5" />
              Show all stages
            </button>
          </div>
        )}
        {groups.map((k) => {
          const open = !closed.has(k)
          const list = rows.filter((r) => r.board === k).sort((a, b) => Number(b.unread) - Number(a.unread) || a.name.localeCompare(b.name, "hu"))
          const unread = list.filter((r) => r.unread).length
          return (
            <div key={k}>
              <button
                onClick={() => toggle(k)}
                aria-expanded={open}
                className="flex w-full items-center gap-2.5 border-b bg-soft px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-150 hover:bg-accent"
              >
                <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out", open && "rotate-90")} />
                <StageSwatch stage={k} />
                {BOARD_LABEL[k]}
                <span className="num font-normal text-muted-foreground">{list.length}</span>
                {!open && unread > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <MessageCircleIcon className="size-3.5 fill-ball text-court" />
                    {unread} new
                  </span>
                )}
              </button>
              {open &&
                list.map((r) => (
                  <ClubRow
                    key={r.id}
                    r={r}
                    onStage={(board) => change({ id: r.id, board }, () => moveToStage(r.id, board))}
                    onCall={(callStatus) => change({ id: r.id, callStatus }, () => setCallStatus(r.id, callStatus))}
                  />
                ))}
            </div>
          )
        })}
        {!groups.length && <p className="px-4 py-12 text-center text-sm text-muted-foreground">No clubs here.</p>}
      </section>
    </div>
  )
}

function ClubRow({ r, onStage, onCall }: { r: DashRow; onStage: (b: BoardKey) => void; onCall: (c: CallStatus) => void }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b px-3 py-3 transition-colors duration-100 last:border-0 hover:bg-soft/60 sm:px-4 md:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1fr)_11.5rem] md:gap-x-4">
      <div className="row-span-2 self-start md:row-span-1 md:self-center">
        <StageMenu stage={r.board} variant="icon" onChange={onStage} />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/sites/${r.id}`} className={cn("truncate hover:underline", r.unread ? "font-semibold" : "font-medium")}>
            {r.name}
          </Link>
          {r.unread && <Unread />}
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{r.city || "City unknown"}</p>
      </div>

      <div className="col-span-2 col-start-2 row-start-2 min-w-0 md:col-span-1 md:col-start-auto md:row-start-auto">
        {r.phone ? (
          <>
            <a href={telHref(r.phone)} aria-label={`Call ${r.name}, ${r.phone}`} className="num inline-flex items-center gap-1.5 rounded-md py-0.5 text-[13.5px] font-medium whitespace-nowrap text-court hover:underline">
              <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" />
              {r.phone}
            </a>
            <p className="truncate text-[13px] text-muted-foreground">{phoneWho(r)}</p>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">No phone yet</p>
        )}
      </div>

      <div className="col-start-3 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start">
        <CallCycle value={r.callStatus} onChange={onCall} className="-ml-2" />
      </div>
    </div>
  )
}

function Unread() {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" aria-label="New reply, not opened yet" role="img" />}>
        <MessageCircleIcon className="size-4 fill-ball text-court" />
      </TooltipTrigger>
      <TooltipContent>New reply, not opened yet</TooltipContent>
    </Tooltip>
  )
}

/**
 * One ring per stage, outermost first, each arc the stage's share of all clubs on a 270° track.
 * The legend beside it names every ring and filters the list.
 */
function StageRings({ title, total, count, filter, onFilter }: { title: string; total: number; count: (k: BoardKey) => number; filter: BoardKey | null; onFilter: (k: BoardKey) => void }) {
  const size = 196
  const w = 10
  const gap = 4
  const cx = size / 2
  const legend: BoardKey[] = [...BOARD.map((b) => b.key), ...BOARD_EXTRA.map((b) => b.key).filter((k) => count(k) > 0)]

  return (
    <section aria-label="Clubs by stage" className="grid items-center gap-6 rounded-[18px] bg-soft p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 sm:p-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${total} clubs by stage`} className="mx-auto max-w-full">
        {BOARD.map((b, i) => {
          const r = cx - w / 2 - i * (w + gap)
          const C = 2 * Math.PI * r
          const span = C * 0.75
          const v = count(b.key)
          const len = total ? (v / total) * span : 0
          return (
            <g key={b.key} opacity={filter && filter !== b.key ? 0.25 : 1} className="transition-opacity duration-150">
              <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={w} strokeLinecap="round" strokeDasharray={`${span} ${C}`} transform={`rotate(-90 ${cx} ${cx})`} style={{ stroke: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
              {v > 0 && (
                <circle
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  strokeWidth={w}
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(len, 0.5)} ${C}`}
                  transform={`rotate(-90 ${cx} ${cx})`}
                  style={{ stroke: STAGE_COLOR[b.key], cursor: "pointer" }}
                  onClick={() => onFilter(b.key)}
                >
                  <title>{`${b.label}: ${v}`}</title>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      <div className="min-w-0">
        <h1 className="display text-[1.75rem] leading-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">One ring per stage, outermost first. Tap a stage to see only its clubs.</p>
        <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {legend.map((k) => {
            const v = count(k)
            const on = filter === k
            return (
              <li key={k}>
                <button
                  onClick={() => onFilter(k)}
                  disabled={!v}
                  aria-pressed={on}
                  className={cn(
                    "pressable flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm disabled:cursor-default",
                    on ? "bg-accent font-semibold" : "hover:bg-accent/70 disabled:hover:bg-transparent",
                    !v && "text-muted-foreground",
                  )}
                >
                  <StageSwatch stage={k} className={cn(!v && "opacity-40")} />
                  <span className="min-w-0 flex-1 truncate">{BOARD_LABEL[k]}</span>
                  <span className="num text-muted-foreground">{v}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
