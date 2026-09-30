import { cn } from "@/lib/utils"
import { BUILD_LABEL, STAGE_LABEL, STATUS_META, type BuildState, type Stage, type Status } from "@/lib/flow"

export const vColor = (hue: number, l = 0.66, c = 0.13) => `oklch(${l} ${c} ${hue})`

export function VerticalMark({ hue, className }: { hue: number; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rotate-45 rounded-[2px]", className)} style={{ background: vColor(hue) }} />
}

export function VerticalTag({ name, hue, className }: { name: string; hue: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}>
      <VerticalMark hue={hue} />
      <span className="truncate">{name}</span>
    </span>
  )
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const hollow = status === "not_started"
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", hollow && "border bg-transparent", className)}
      style={hollow ? { borderColor: STATUS_META[status].token } : { background: STATUS_META[status].token }}
    />
  )
}

/** Stage in words, whose move it is as a dot. */
export function StagePill({ stage, status, className }: { stage: Stage; status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <StatusDot status={status} />
      <span className={cn(status === "lost" ? "text-muted-foreground" : "text-foreground")}>{STAGE_LABEL[stage]}</span>
    </span>
  )
}

export function BuildMeter({ build }: { build: BuildState }) {
  const n = build === "todo" ? 1 : build === "building" ? 2 : 3
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-full", i <= n ? "bg-foreground/70" : "bg-foreground/12")} />
        ))}
      </span>
      <span className="text-muted-foreground">{BUILD_LABEL[build]}</span>
    </span>
  )
}
