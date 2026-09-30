"use client"

import * as React from "react"
import { toast } from "sonner"
import { clearAllData, loadDemoData } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
                ? "Your verticals, sites, emails, notes and templates are wiped and replaced with about 30 fictional firms."
                : "Every vertical, site, email, note, lesson and template is deleted. Export first if you might want it back."}
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
                  const res = confirm === "demo" ? await loadDemoData() : await clearAllData()
                  if (!res.ok) return void toast.error(res.error)
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
