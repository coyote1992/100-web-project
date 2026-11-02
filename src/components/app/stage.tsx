"use client"

import * as React from "react"
import { ChevronDownIcon, MinusIcon, PhoneCallIcon, PhoneIncomingIcon, PhoneMissedIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BOARD, BOARD_EXTRA, BOARD_LABEL, CALL_LABEL, CALL_STATUSES, type BoardKey, type CallStatus } from "@/lib/flow"
import { cn } from "@/lib/utils"
import { STAGE_COLOR } from "@/lib/stage-colors"

export { STAGE_COLOR }

const SIX = BOARD.map((b) => b.key)
const TRACK = "color-mix(in oklch, var(--foreground) 9%, transparent)"

export function StageSwatch({ stage, className }: { stage: BoardKey; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: STAGE_COLOR[stage] }} />
}

/** Linear-style status mark: a ring in the stage colour that fills like a pie as the club moves along. */
export function StagePie({ stage, size = 18 }: { stage: BoardKey; size?: number }) {
  const c = STAGE_COLOR[stage]
  const cx = size / 2
  const r = cx - 1.5
  if (stage === "not_contacted")
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={1.5} strokeDasharray="2.2 2.2" style={{ stroke: "var(--muted-foreground)" }} />
      </svg>
    )
  if (stage === "lost")
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cx} r={r} style={{ fill: c }} />
        <path d={`M${cx - 2.6} ${cx - 2.6}l5.2 5.2M${cx + 2.6} ${cx - 2.6}l-5.2 5.2`} strokeWidth={1.5} strokeLinecap="round" style={{ stroke: "var(--background)" }} />
      </svg>
    )
  const inner = (r - 2.5) / 2
  const C = 2 * Math.PI * inner
  const frac = (SIX.indexOf(stage as (typeof SIX)[number]) + 1) / SIX.length
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" strokeWidth={1.5} style={{ stroke: c }} />
      <circle cx={cx} cy={cx} r={inner} fill="none" strokeWidth={inner * 2} strokeDasharray={`${C * frac} ${C}`} transform={`rotate(-90 ${cx} ${cx})`} style={{ stroke: c }} />
    </svg>
  )
}

/** One club's progress: six arcs around a ring, coloured up to its stage. */
export function StageRing({ stage, size = 56 }: { stage: BoardKey; size?: number }) {
  const idx = SIX.indexOf(stage as (typeof SIX)[number])
  const r = size / 2 - 4
  const C = 2 * Math.PI * r
  const part = C / 6
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={BOARD_LABEL[stage]}>
      {SIX.map((k, i) => (
        <circle
          key={k}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={size > 40 ? 6 : 4}
          strokeDasharray={`${part - 3} ${C}`}
          strokeDashoffset={-i * part}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ stroke: stage === "lost" ? STAGE_COLOR.lost : i <= idx ? STAGE_COLOR[k] : TRACK }}
        />
      ))}
    </svg>
  )
}

/**
 * Move a club to another stage. The trigger is the club's stage circle (in lists), its name with a chevron,
 * or the word "Change" (on the club page).
 */
export function StageMenu({
  stage,
  onChange,
  variant = "pill",
  disabled,
  className,
}: {
  stage: BoardKey
  onChange: (s: BoardKey) => void
  variant?: "pill" | "icon" | "link"
  disabled?: boolean
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Stage: ${BOARD_LABEL[stage]}. Change`}
        className={cn(
          "group/stage pressable inline-flex items-center whitespace-nowrap data-[popup-open]:bg-accent",
          variant === "icon" && "size-8 justify-center rounded-lg hover:bg-accent",
          variant === "pill" && "h-8 max-w-full gap-2 rounded-lg px-2 text-sm hover:bg-accent",
          variant === "link" && "h-7 gap-1 rounded-md px-1.5 -ml-1.5 text-sm font-medium text-court hover:bg-accent",
          className,
        )}
      >
        {variant === "icon" && <StagePie stage={stage} />}
        {variant === "pill" && (
          <>
            <StageSwatch stage={stage} />
            <span className="truncate">{BOARD_LABEL[stage]}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
        {variant === "link" && (
          <>
            Change
            <ChevronDownIcon className="size-3.5" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup value={stage} onValueChange={(v) => v !== stage && onChange(v as BoardKey)}>
          {BOARD.map((b) => (
            <DropdownMenuRadioItem key={b.key} value={b.key}>
              <StageSwatch stage={b.key} />
              {b.label}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          {BOARD_EXTRA.map((b) => (
            <DropdownMenuRadioItem key={b.key} value={b.key} className="text-muted-foreground">
              <StageSwatch stage={b.key} />
              {b.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const CALL_ICON: Record<CallStatus, React.ComponentType<{ className?: string }>> = {
  none: MinusIcon,
  reached: PhoneCallIcon,
  missed: PhoneMissedIcon,
  callback: PhoneIncomingIcon,
}

/** Text colour per call result. Each always comes with its icon and words, never colour alone. */
export const CALL_TONE: Record<CallStatus, string> = {
  none: "text-muted-foreground",
  reached: "text-positive",
  missed: "text-negative",
  callback: "text-court",
}

const nextCall = (v: CallStatus) => CALL_STATUSES[(CALL_STATUSES.indexOf(v) + 1) % CALL_STATUSES.length]

/** Tap to step through the four call results. */
export function CallCycle({ value, onChange, className }: { value: CallStatus; onChange: (v: CallStatus) => void; className?: string }) {
  const Icon = CALL_ICON[value]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onChange(nextCall(value))}
            aria-label={`Call: ${CALL_LABEL[value]}. Tap for ${CALL_LABEL[nextCall(value)].toLowerCase()}`}
            className={cn("pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] whitespace-nowrap hover:bg-accent", value !== "none" && "font-medium", CALL_TONE[value], className)}
          />
        }
      >
        <Icon className="size-4 shrink-0" />
        {CALL_LABEL[value]}
      </TooltipTrigger>
      <TooltipContent>Tap to change</TooltipContent>
    </Tooltip>
  )
}

/** The four call results as a list to pick from, as on the club page. */
export function CallOptions({ value, onChange }: { value: CallStatus; onChange: (v: CallStatus) => void }) {
  return (
    <div role="radiogroup" aria-label="Call" className="grid gap-1">
      {CALL_STATUSES.map((s) => {
        const Icon = CALL_ICON[s]
        const on = value === s
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(s)}
            className={cn(
              "pressable flex h-9 items-center gap-2 rounded-[10px] border px-2.5 text-left text-[13px]",
              on ? "border-court font-semibold text-foreground shadow-[inset_3px_0_0_var(--court)]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", on && CALL_TONE[s])} />
            {CALL_LABEL[s]}
          </button>
        )
      })}
    </div>
  )
}
