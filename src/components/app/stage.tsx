"use client"

import * as React from "react"
import { ChevronDownIcon, MinusIcon, PhoneCallIcon, PhoneIncomingIcon, PhoneMissedIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BOARD, BOARD_EXTRA, BOARD_LABEL, CALL_LABEL, CALL_STATUSES, type BoardKey, type CallStatus } from "@/lib/flow"
import { cn } from "@/lib/utils"

export const STAGE_COLOR: Record<BoardKey, string> = {
  not_contacted: "var(--stage-idle)",
  question_sent: "var(--stage-1)",
  response: "var(--stage-2)",
  site_sent: "var(--stage-3)",
  site_reply: "var(--stage-4)",
  call: "var(--stage-5)",
  order: "var(--stage-6)",
  lost: "var(--stage-lost)",
}

export function StageSwatch({ stage, className }: { stage: BoardKey; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)} style={{ background: STAGE_COLOR[stage] }} />
}

/** The stage as a swatch and a word. Click to move the site to another stage. */
export function StageMenu({ stage, onChange, disabled, className }: { stage: BoardKey; onChange: (s: BoardKey) => void; disabled?: boolean; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Stage: ${BOARD_LABEL[stage]}. Change`}
        className={cn(
          "group/stage pressable inline-flex h-8 max-w-full items-center gap-2 rounded-lg px-2 text-sm whitespace-nowrap hover:bg-accent data-[popup-open]:bg-accent",
          stage === "lost" && "text-muted-foreground",
          className,
        )}
      >
        <StageSwatch stage={stage} />
        <span className="truncate">{BOARD_LABEL[stage]}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/stage:opacity-100 group-focus-visible/stage:opacity-100 group-data-[popup-open]/stage:opacity-100" />
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

const CALL_ICON: Record<CallStatus, React.ComponentType<{ className?: string }>> = {
  none: MinusIcon,
  reached: PhoneCallIcon,
  missed: PhoneMissedIcon,
  callback: PhoneIncomingIcon,
}

const CALL_ON: Record<CallStatus, string> = {
  none: "bg-muted text-foreground",
  reached: "bg-positive/15 text-positive",
  missed: "bg-negative/12 text-negative",
  callback: "bg-st-wait/18 text-foreground",
}

/**
 * Four-way switch for how the call went. Icons with tooltips on the dashboard; icons and words on a site page.
 * The selected option keeps its colour and its label in the accessible name, so colour never stands alone.
 */
export function CallToggle({ value, onChange, labels = false, disabled }: { value: CallStatus; onChange: (v: CallStatus) => void; labels?: boolean; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Call" className={cn("inline-flex items-center gap-0.5 rounded-lg border bg-background p-0.5", labels && "flex-wrap")}>
      {CALL_STATUSES.map((s) => {
        const Icon = CALL_ICON[s]
        const on = value === s
        const button = (
          <button
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={labels ? undefined : CALL_LABEL[s]}
            disabled={disabled}
            onClick={() => !on && onChange(s)}
            className={cn(
              "pressable inline-flex h-7 items-center justify-center gap-1.5 rounded-md text-xs disabled:opacity-60",
              labels ? "px-2.5" : "w-7",
              on ? cn(CALL_ON[s], "font-medium") : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {labels && CALL_LABEL[s]}
          </button>
        )
        if (labels) return <React.Fragment key={s}>{button}</React.Fragment>
        return (
          <Tooltip key={s}>
            <TooltipTrigger render={button} />
            <TooltipContent>{CALL_LABEL[s]}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
