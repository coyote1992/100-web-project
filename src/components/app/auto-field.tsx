"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** A field that saves itself on blur (or ⌘↵ for multiline) and says so quietly. */
export function AutoField({
  label,
  value,
  onSave,
  multiline,
  rows = 3,
  placeholder,
  type = "text",
  list,
  className,
  inputClassName,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<unknown>
  multiline?: boolean
  rows?: number
  placeholder?: string
  type?: string
  list?: string
  className?: string
  inputClassName?: string
}) {
  const id = React.useId()
  const [v, setV] = React.useState(value)
  const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle")
  const [saved, setSaved] = React.useState(value)
  // A new value from the server replaces the draft (adjusting state during render, not in an effect).
  const [prop, setProp] = React.useState(value)
  if (prop !== value) {
    setProp(value)
    setV(value)
    setSaved(value)
  }

  async function save() {
    if (v === saved) return
    setState("saving")
    await onSave(v)
    setSaved(v)
    setState("saved")
    setTimeout(() => setState("idle"), 1400)
  }

  const common = {
    id,
    value: v,
    placeholder,
    onBlur: save,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <span
          aria-live="polite"
          className={cn("inline-flex items-center gap-1 transition-opacity duration-200", state === "idle" ? "opacity-0" : "opacity-100")}
        >
          {state === "saving" ? "Saving…" : state === "saved" ? (
            <>
              <CheckIcon className="size-3" /> Saved
            </>
          ) : null}
        </span>
      </label>
      {multiline ? (
        <Textarea
          {...common}
          rows={rows}
          className={inputClassName}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              save()
            }
          }}
        />
      ) : (
        <Input
          {...common}
          type={type}
          list={list}
          className={inputClassName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
        />
      )}
    </div>
  )
}
