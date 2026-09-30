"use client"

import * as React from "react"
import { toast } from "sonner"
import { createBatch, deleteBatch, updateBatch } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewBatch({ count }: { count: number }) {
  const [name, setName] = React.useState("")
  const [pending, start] = React.useTransition()
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const n = name.trim() || `Batch ${count + 1}`
        start(async () => {
          await createBatch({ name: n })
          setName("")
          toast.success(`${n} created`, { description: "Select sites on the Sites page and add them to it." })
        })
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Batch ${count + 1}`} aria-label="Batch name" className="w-52" />
      <Button type="submit" disabled={pending}>
        New batch
      </Button>
    </form>
  )
}

export function BatchFields({ id, name, notes }: { id: string; name: string; notes: string }) {
  const [pending, start] = React.useTransition()
  return (
    <div className="grid gap-3">
      <AutoField label="Name" value={name} onSave={(v) => updateBatch(id, { name: v || name })} />
      <AutoField label="What's different about this batch?" value={notes} onSave={(v) => updateBatch(id, { notes: v })} multiline rows={2} placeholder="e.g. Question first, lighter polish, sent Tuesday evening" />
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start text-muted-foreground hover:text-destructive"
        disabled={pending}
        onClick={() => start(() => deleteBatch(id))}
      >
        Delete batch (sites stay)
      </Button>
    </div>
  )
}
