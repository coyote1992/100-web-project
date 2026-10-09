"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DownloadIcon, PackageIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react"
import { finishSiteUpload, prepareSiteUpload, removeSitePackage, addLesson, deleteLesson, deleteSite, undoStep, updateLesson, updateSite } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Textarea } from "@/components/ui/textarea"
import { BUILD_LABEL, BUILD_STATES, type BuildState } from "@/lib/flow"
import { cn } from "@/lib/utils"

const save = (id: string, key: string) => async (v: string) => {
  const res = await updateSite(id, { [key]: v })
  if (!res.ok) toast.error(res.error)
}

export function BuildControls({ id, build, demoUrl }: { id: string; build: BuildState; demoUrl: string }) {
  const [pending, start] = React.useTransition()
  return (
    <div className="grid gap-4">
      <div className="inline-grid grid-cols-3 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Build status">
        {BUILD_STATES.map((b) => (
          <button
            key={b}
            role="radio"
            aria-checked={build === b}
            disabled={pending}
            onClick={() => start(async () => void (await updateSite(id, { build: b })))}
            className={cn("pressable h-8 rounded-md text-sm", build === b ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground")}
          >
            {BUILD_LABEL[b]}
          </button>
        ))}
      </div>
      <AutoField label="Demo URL. Saving one marks the site ready" value={demoUrl} onSave={save(id, "demoUrl")} placeholder="their-club-demo.vercel.app" />
    </div>
  )
}

function localInput(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function CallControls({ id, callAt, callNotes }: { id: string; callAt: string | null; callNotes: string }) {
  const [v, setV] = React.useState(localInput(callAt))
  const [prop, setProp] = React.useState(callAt)
  if (prop !== callAt) {
    setProp(callAt)
    setV(localInput(callAt))
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="call-at" className="text-xs text-muted-foreground">
          Call date and time
        </label>
        <Input
          id="call-at"
          type="datetime-local"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={async () => {
            if (v === localInput(callAt)) return
            const res = await updateSite(id, { callAt: v ? new Date(v).toISOString() : null })
            if (!res.ok) toast.error(res.error)
          }}
        />
      </div>
      <AutoField label="Call notes" value={callNotes} onSave={save(id, "callNotes")} multiline rows={3} placeholder="What to cover, what was said" />
    </div>
  )
}

export function DetailsControls({ id, site }: { id: string; site: { oldSiteUrl: string; contactName: string; city: string; email: string; phone: string; questionVariant: string } }) {
  return (
    <div className="grid gap-4">
      <AutoField label="Current website" value={site.oldSiteUrl} onSave={save(id, "oldSiteUrl")} placeholder="their-site.hu" />
      <div className="grid grid-cols-2 gap-3">
        <AutoField label="Contact" value={site.contactName} onSave={save(id, "contactName")} placeholder="Owner's name" />
        <AutoField label="City" value={site.city} onSave={save(id, "city")} />
      </div>
      <AutoField label="Email. Matches incoming mail to this site" type="email" value={site.email} onSave={save(id, "email")} />
      <AutoField label="Phone" type="tel" value={site.phone} onSave={save(id, "phone")} />
      <AutoField label="Opening question used" value={site.questionVariant} onSave={save(id, "questionVariant")} placeholder="Lets Insights compare questions" />
    </div>
  )
}

export function LessonsPanel({ siteId, lessons }: { siteId: string; lessons: { id: string; body: string }[] }) {
  const [body, setBody] = React.useState("")
  const [editing, setEditing] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState("")
  const [pending, start] = React.useTransition()

  const submit = () => {
    if (!body.trim()) return
    start(async () => {
      const res = await addLesson(siteId, body)
      if (!res.ok) return void toast.error(res.error)
      setBody("")
      toast.success("Lesson saved")
    })
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="rounded-xl border bg-surface focus-within:ring-2 focus-within:ring-ring/40"
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          rows={2}
          aria-label="New lesson"
          placeholder="What did this one teach you? Anything you'd do differently next time."
          className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-end gap-2 border-t px-2 py-1.5">
          <span className="hidden items-center gap-0.5 text-xs text-muted-foreground sm:inline-flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <Button size="sm" type="submit" disabled={pending || !body.trim()}>
            Save lesson
          </Button>
        </div>
      </form>

      {lessons.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {lessons.map((l) => (
            <li key={l.id} className="group">
              {editing === l.id ? (
                <form
                  className="grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    start(async () => {
                      const res = await updateLesson(l.id, draft)
                      if (!res.ok) return void toast.error(res.error)
                      setEditing(null)
                    })
                  }}
                >
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label="Edit lesson" autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={pending || !draft.trim()}>
                      Save
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="display text-xl leading-snug text-pretty">{l.body}</p>
                  <span className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      aria-label="Edit lesson"
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditing(l.id)
                        setDraft(l.body)
                      }}
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button aria-label="Delete lesson" disabled={pending} className="rounded p-1 text-muted-foreground hover:text-destructive" onClick={() => start(async () => void (await deleteLesson(l.id)))}>
                      <XIcon className="size-3.5" />
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StageFooter({ id, name, canUndo }: { id: string; name: string; canUndo: boolean }) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {canUndo && (
          <button className="hover:text-foreground" disabled={pending} onClick={() => start(async () => void (await undoStep(id)))}>
            Undo last step
          </button>
        )}
        <button className="inline-flex items-center gap-1.5 hover:text-destructive" onClick={() => setConfirm(true)}>
          <Trash2Icon className="size-3.5" />
          Delete site
        </button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>Its emails, extracted notes and lessons go with it. ChatGPT can add the firm again, but the history is gone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteSite(id)
                  router.push("/sites")
                  toast.success(`${name} deleted`)
                })
              }
            >
              Delete site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

/** Drop or pick a zip of the finished site. It goes straight to storage, then gets attached to the site. */
export function PackageUpload({ id, pkg }: { id: string; pkg: { name: string; size: number; at: number } | null }) {
  const router = useRouter()
  const input = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [over, setOver] = React.useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!/\.zip$/i.test(file.name)) return void toast.error("Pick a .zip file.")
    if (file.size > 50 * 1024 * 1024) return void toast.error("That zip is over 50 MB.")
    setBusy(true)
    try {
      const prep = await prepareSiteUpload(id, file.name)
      if (!prep.ok) return void toast.error(prep.error)
      const put = await fetch(prep.value.uploadUrl, { method: "PUT", headers: { "content-type": "application/zip" }, body: file })
      if (!put.ok) return void toast.error(`Upload failed (${put.status}).`)
      const fin = await finishSiteUpload(id, prep.value.path, prep.value.name)
      if (!fin.ok) return void toast.error(fin.error)
      toast.success("Package attached.")
      router.refresh()
    } catch {
      toast.error("Upload failed. Check your connection and try again.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Package (zip)</p>
      {pkg && (
        <div className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2 text-sm">
          <PackageIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{pkg.name}</span>
          <span className="num text-xs text-muted-foreground">{mb(pkg.size)}</span>
          <a href={`/api/sites/${id}/package`} aria-label="Download package" className="text-muted-foreground hover:text-foreground">
            <DownloadIcon className="size-4" />
          </a>
          <button
            aria-label="Remove package"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const r = await removeSitePackage(id)
              if (!r.ok) toast.error(r.error)
              else router.refresh()
            }}
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void upload(e.dataTransfer.files[0])
        }}
        className={cn("rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground transition-colors", over && "border-foreground/60 bg-accent")}
      >
        {busy ? "Uploading…" : (
          <>
            Drop a zip here or{" "}
            <button className="underline hover:text-foreground" onClick={() => input.current?.click()}>
              choose a file
            </button>
            {pkg ? ". It replaces the current one." : "."}
          </>
        )}
        <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      </div>
    </div>
  )
}
