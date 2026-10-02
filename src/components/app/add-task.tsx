"use client"

import * as React from "react"
import { toast } from "sonner"
import { addTask } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AddTask({ sites }: { sites: { id: string; name: string }[] }) {
  const [title, setTitle] = React.useState("")
  const [siteId, setSiteId] = React.useState("")
  const [pending, start] = React.useTransition()
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        start(async () => {
          const res = await addTask({ title, siteId: siteId || null })
          if (!res.ok) return void toast.error(res.error)
          setTitle("")
          toast.success("Task added")
        })
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task of your own" aria-label="New task" className="min-w-56 flex-1" />
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-label="Site (optional)" className="h-8 max-w-56 rounded-lg border border-input bg-transparent px-2 text-sm">
        <option value="">No site</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending || !title.trim()}>
        Add task
      </Button>
    </form>
  )
}
