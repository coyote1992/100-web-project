"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createVertical, deleteVertical, updateVertical } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { vColor } from "@/components/app/status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const HUES = [75, 150, 330, 25, 260, 195, 110, 290]

export function AddVertical({ count }: { count: number }) {
  const [name, setName] = React.useState("")
  const [pending, start] = React.useTransition()
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        start(async () => {
          const res = await createVertical(name)
          if (!res.ok) return void toast.error(res.error)
          setName("")
          toast.success(`${name} added. Now paste its two reference sites.`)
        })
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={count >= 5 ? "Another vertical" : `Vertical ${count + 1} of 5, e.g. Padel clubs`} aria-label="New vertical name" className="w-64" />
      <Button type="submit" disabled={pending || !name.trim()}>
        Add vertical
      </Button>
    </form>
  )
}

export function VerticalEditor({ v }: { v: { id: string; name: string; hue: number; target: number; reference1: string; reference2: string } }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const save = (key: "name" | "reference1" | "reference2") => async (value: string) => {
    const res = await updateVertical(v.id, { [key]: value })
    if (!res.ok) toast.error(res.error)
  }
  return (
    <div className="grid gap-5">
      <div className="grid gap-4">
        <AutoField label="Reference site 1" value={v.reference1} onSave={save("reference1")} placeholder="https://www.lagunabeachtennisacademy.com" />
        <AutoField label="Reference site 2" value={v.reference2} onSave={save("reference2")} placeholder="https://…" />
      </div>
      <div className="grid gap-4 border-t pt-5 sm:grid-cols-[1fr_7rem]">
        <AutoField label="Name" value={v.name} onSave={save("name")} />
        <AutoField label="Target sites" type="number" value={String(v.target)} onSave={async (t) => void (await updateVertical(v.id, { target: Math.max(1, Number(t) || 20) }))} />
      </div>
      <fieldset>
        <legend className="mb-2 text-xs text-muted-foreground">Colour</legend>
        <div className="flex gap-1.5">
          {HUES.map((h) => (
            <button
              key={h}
              aria-label={`Hue ${h}`}
              aria-pressed={v.hue === h}
              disabled={pending}
              onClick={() => start(async () => void (await updateVertical(v.id, { hue: h })))}
              className={cn("pressable size-7 rounded-md ring-offset-2 ring-offset-background", v.hue === h && "ring-2 ring-foreground/70")}
              style={{ background: vColor(h) }}
            />
          ))}
        </div>
      </fieldset>
      <div>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteVertical(v.id)
              if (!res.ok) return void toast.error(res.error)
              toast.success(`${v.name} deleted`)
              router.push("/verticals")
            })
          }
        >
          Delete vertical
        </Button>
      </div>
    </div>
  )
}
