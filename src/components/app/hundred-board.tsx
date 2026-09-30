import Link from "next/link"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { STATUS_META, stageLabel } from "@/lib/flow"
import type { ProspectRow } from "@/lib/metrics"
import type { Vertical } from "@/db/schema"
import { VerticalMark } from "./status"

type Cell = Pick<ProspectRow, "id" | "name" | "status" | "build" | "stage" | "parked" | "city">

function CellMark({ cell }: { cell: Cell }) {
  const s = cell.status
  const base = "block size-full rounded-[5px] transition-transform duration-150 ease-(--ease-out-strong) group-hover:scale-110"
  if (s === "not_started") {
    // Not contacted yet: the outline thickens as the demo gets built.
    return (
      <span
        className={cn(
          base,
          cell.build === "scouted" && "border border-dashed border-foreground/35",
          cell.build === "building" && "border-[1.5px] border-foreground/45 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--foreground)_18%,transparent)_50%,transparent_50%)]",
          cell.build === "ready" && "border-2 border-foreground/70",
        )}
      />
    )
  }
  if (s === "parked") return <span className={cn(base, "border border-foreground/20 bg-foreground/5")} />
  if (s === "lost")
    return (
      <span
        className={cn(base, "border border-st-lost/50")}
        style={{ background: "repeating-linear-gradient(135deg, color-mix(in oklch, var(--st-lost) 35%, transparent) 0 2px, transparent 2px 5px)" }}
      />
    )
  return <span className={base} style={{ background: STATUS_META[s].token }} />
}

export function HundredBoard({ verticals, rows, hideLabels }: { verticals: Vertical[]; rows: ProspectRow[]; hideLabels?: boolean }) {
  if (!verticals.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Add your verticals to lay out the board.
      </div>
    )
  }
  return (
    <div className="grid gap-2.5">
      {verticals.map((v) => {
        const vr = rows
          .filter((r) => r.verticalId === v.id)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        const slots = Math.max(v.target, vr.length)
        return (
          <div key={v.id} className={cn("grid items-center gap-3", !hideLabels && "gap-1.5 sm:grid-cols-[9.5rem_1fr] sm:gap-3")}>
            {!hideLabels && <Link href={`/verticals/${v.id}`} className="flex min-w-0 items-center gap-2 text-sm hover:underline">
              <VerticalMark hue={v.hue} />
              <span className="truncate">{v.name}</span>
              <span className="num ml-auto text-xs text-muted-foreground">
                {vr.length}/{v.target}
              </span>
            </Link>}
            <div className="grid gap-[3px] sm:gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(slots, 20)}, minmax(0, 1fr))` }}>
              {Array.from({ length: slots }, (_, i) => {
                const cell = vr[i]
                if (!cell)
                  return (
                    <span key={i} aria-hidden className="grid aspect-square place-items-center">
                      <span className="size-1 rounded-full bg-foreground/15" />
                    </span>
                  )
                return (
                  <Tooltip key={cell.id}>
                    <TooltipTrigger
                      render={
                        <Link
                          href={`/sites/${cell.id}`}
                          aria-label={`${cell.name}: ${cell.parked ? "Parked" : stageLabel(cell.stage)}`}
                          className="group block aspect-square rounded-[5px] p-px focus-visible:outline-2"
                        />
                      }
                    >
                      <CellMark cell={cell} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium">{cell.name}</span>
                      <span className="opacity-70">
                        {" · "}
                        {cell.parked
                          ? "Parked"
                          : cell.stage
                            ? stageLabel(cell.stage)
                            : cell.build === "ready"
                              ? "Demo ready"
                              : cell.build === "building"
                                ? "Building"
                                : "Scouted"}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BoardLegend() {
  const item = (label: string, node: React.ReactNode) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3">{node}</span>
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {item("Scouted", <span className="block size-full rounded-[3px] border border-dashed border-foreground/35" />)}
      {item("Building", <span className="block size-full rounded-[3px] border-[1.5px] border-foreground/45 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--foreground)_18%,transparent)_50%,transparent_50%)]" />)}
      {item("Demo ready", <span className="block size-full rounded-[3px] border-2 border-foreground/70" />)}
      {item("Waiting on them", <span className="block size-full rounded-[3px] bg-st-wait" />)}
      {item("Your move", <span className="block size-full rounded-[3px] bg-st-move" />)}
      {item("Paid", <span className="block size-full rounded-[3px] bg-st-won" />)}
      {item(
        "Closed",
        <span
          className="block size-full rounded-[3px] border border-st-lost/50"
          style={{ background: "repeating-linear-gradient(135deg, color-mix(in oklch, var(--st-lost) 35%, transparent) 0 2px, transparent 2px 5px)" }}
        />,
      )}
    </div>
  )
}
