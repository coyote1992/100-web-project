"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createProspect } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { host } from "@/lib/format"
import { BUILD_STEPS } from "@/lib/flow"
import { VerticalMark } from "./status"
import type { Lookup } from "./providers"

function guessName(url: string) {
  const h = host(url)
  if (!h || !h.includes(".")) return ""
  return h
    .split(".")
    .slice(0, -1)
    .join(" ")
    .split(/[-_. ]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

/** Remembered across opens so a run of additions stays in one vertical. */
let lastVertical = ""

export function NewSiteDialog({
  open,
  onOpenChange,
  preset,
  lookup,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  preset?: { verticalId?: string; batchId?: string }
  lookup: Lookup
}) {
  const router = useRouter()
  const [url, setUrl] = React.useState("")
  const [name, setName] = React.useState("")
  const [city, setCity] = React.useState("")
  const [refs, setRefs] = React.useState("")
  const [verticalId, setVerticalId] = React.useState(() => preset?.verticalId || lastVertical || lookup.verticals[0]?.id || "")
  const [batchId, setBatchId] = React.useState(preset?.batchId ?? "")
  const [build, setBuild] = React.useState<"scouted" | "building" | "ready">("scouted")
  const [more, setMore] = React.useState(false)
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState("")

  const guessed = guessName(url)

  function submit(again: boolean) {
    setError("")
    if (!verticalId) return setError("Pick a vertical first — add one on the Verticals page.")
    start(async () => {
      const res = await createProspect({
        name: name.trim(),
        oldSiteUrl: url.trim(),
        city,
        references: refs,
        verticalId,
        batchId: batchId || null,
        build,
      })
      if ("error" in res) return setError(res.error ?? "Something went wrong.")
      lastVertical = verticalId
      const label = name.trim() || guessed
      if (again) {
        toast.success(`${label} added`)
        setUrl("")
        setName("")
        setCity("")
        setRefs("")
        document.getElementById("new-site-url")?.focus()
      } else {
        onOpenChange(false)
        toast.success(`${label} added`, {
          action: { label: "Open", onClick: () => router.push(`/sites/${res.id}`) },
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit(true)
            }
          }}
        >
          <DialogHeader className="px-5 pt-5 pb-4">
            <DialogTitle className="display text-2xl">Add a site</DialogTitle>
            <DialogDescription>Paste the firm&rsquo;s current website. Everything else is optional.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-5 pb-5">
            <div className="grid gap-1.5">
              <Label htmlFor="new-site-url">Current website</Label>
              <Input
                id="new-site-url"
                autoFocus
                placeholder="next-tenisz.hu"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="new-site-name">Firm name</Label>
                <Input
                  id="new-site-name"
                  placeholder={guessed || "Next Tenisz"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-site-city">City</Label>
                <Input id="new-site-city" placeholder="Budapest" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>

            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Vertical</legend>
              {lookup.verticals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verticals yet. Create them on the Verticals page first.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lookup.verticals.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setVerticalId(v.id)}
                      aria-pressed={verticalId === v.id}
                      className={cn(
                        "pressable inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm",
                        verticalId === v.id
                          ? "border-foreground/80 bg-foreground text-background"
                          : "border-border bg-background hover:bg-accent",
                      )}
                    >
                      <VerticalMark hue={v.hue} />
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Where is it at?</legend>
              <div className="inline-grid w-full grid-cols-3 rounded-lg bg-muted p-0.5">
                {BUILD_STEPS.map((b) => (
                  <button
                    type="button"
                    key={b.key}
                    onClick={() => setBuild(b.key)}
                    aria-pressed={build === b.key}
                    className={cn(
                      "pressable h-7 rounded-md text-sm",
                      build === b.key ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {more ? (
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-site-refs">Reference sites</Label>
                  <Textarea
                    id="new-site-refs"
                    rows={2}
                    placeholder={"One per line\nlagunabeachtennisacademy.com"}
                    value={refs}
                    onChange={(e) => setRefs(e.target.value)}
                  />
                </div>
                {lookup.batches.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="new-site-batch">Batch</Label>
                    <select
                      id="new-site-batch"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="">No batch yet</option>
                      {lookup.batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setMore(true)} className="justify-self-start text-sm text-muted-foreground underline hover:text-foreground">
                Add references or a batch
              </button>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="m-0 flex-row items-center justify-between rounded-b-xl border-t bg-muted/50 px-5 py-3 sm:justify-between">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd> save &amp; add another
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add site"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
