"use client"

import * as React from "react"
import { toast } from "sonner"
import { clearAllData, loadDemoData, saveSetting } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DEFAULT_PROMPT } from "@/lib/prompt"

export function PromptEditor({ prompt, customised }: { prompt: string; customised: boolean }) {
  const [pending, start] = React.useTransition()
  return (
    <div className="grid gap-3">
      <AutoField
        label="Master prompt · placeholders: [OLD_SITE_URL] [REFERENCE_SITE_1] [REFERENCE_SITE_2]"
        value={prompt}
        onSave={(v) => saveSetting("prompt", v)}
        multiline
        rows={16}
        inputClassName="h-[28rem] font-mono text-[12.5px] leading-relaxed [field-sizing:fixed]"
      />
      {customised && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start text-muted-foreground"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveSetting("prompt", DEFAULT_PROMPT)
              toast.success("Prompt reset to the default")
            })
          }
        >
          Reset to default
        </Button>
      )}
    </div>
  )
}

export function ChaseDays({ value }: { value: number }) {
  return (
    <AutoField
      label="Flag a quiet site after (days)"
      type="number"
      value={String(value)}
      onSave={(v) => saveSetting("chaseDays", String(Math.max(1, Math.round(Number(v) || 4))))}
      className="max-w-56"
    />
  )
}

export function DataActions({ hasData }: { hasData: boolean }) {
  const [confirm, setConfirm] = React.useState<null | "demo" | "clear">(null)
  const [pending, start] = React.useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" nativeButton={false} render={<a href="/api/export" />}>
        Export everything (JSON)
      </Button>
      <Button variant="outline" onClick={() => setConfirm("demo")}>
        Load demo data
      </Button>
      <Button variant="destructive" onClick={() => setConfirm("clear")} disabled={!hasData}>
        Start fresh
      </Button>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "demo" ? "Replace everything with demo data?" : "Delete all data?"}</DialogTitle>
            <DialogDescription>
              {confirm === "demo"
                ? "Your current sites, steps, hours and notes will be wiped and replaced with ~30 fictional firms."
                : "Every vertical, site, step, time entry, note and email is deleted. Export first if you might want it back."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (confirm === "demo") await loadDemoData()
                  else await clearAllData()
                  toast.success(confirm === "demo" ? "Demo data loaded" : "All clear. Time to add your verticals.")
                  setConfirm(null)
                })
              }
            >
              {confirm === "demo" ? "Replace with demo" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
