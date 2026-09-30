"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** A block of text with one obvious way to copy all of it. */
export function CopyBlock({ text, label, hint, maxHeight = "18rem", className }: { text: string; label: string; hint?: string; maxHeight?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      toast.error("Couldn't reach the clipboard. Select the text and copy it by hand.")
      return
    }
    setCopied(true)
    toast.success(`${label} copied`, hint ? { description: hint } : undefined)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-background", className)}>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
        <span className="text-xs text-muted-foreground">{text.length.toLocaleString()} characters</span>
        <Button size="sm" onClick={copy} aria-live="polite">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        </Button>
      </div>
      <pre tabIndex={0} className="overflow-auto p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-muted-foreground" style={{ maxHeight }}>
        {text}
      </pre>
    </div>
  )
}
