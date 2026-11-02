"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react"
import { addLesson, deleteLesson, deleteSite, markSeen, moveToStage, setCallStatus, updateLesson, updateSite } from "@/app/actions"
import { CallToggle, StageMenu, STAGE_COLOR } from "@/components/app/stage"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Textarea } from "@/components/ui/textarea"
import { BOARD, type BoardKey, type CallStatus } from "@/lib/flow"
import { cn } from "@/lib/utils"

const save = (id: string, key: string) => async (v: string) => {
  const res = await updateSite(id, { [key]: v })
  if (!res.ok) toast.error(res.error)
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

export function DetailsControls({ id, site }: { id: string; site: { oldSiteUrl: string; contactName: string; city: string; email: string; phone: string } }) {
  return (
    <div className="grid gap-4">
      <AutoField label="Current website" value={site.oldSiteUrl} onSave={save(id, "oldSiteUrl")} placeholder="their-site.hu" />
      <div className="grid grid-cols-2 gap-3">
        <AutoField label="Contact" value={site.contactName} onSave={save(id, "contactName")} placeholder="Owner's name" />
        <AutoField label="City" value={site.city} onSave={save(id, "city")} />
      </div>
      <AutoField label="Email. Matches incoming mail to this site" type="email" value={site.email} onSave={save(id, "email")} />
      <AutoField label="Phone" type="tel" value={site.phone} onSave={save(id, "phone")} />
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

export function DeleteSite({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <>
      <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive" onClick={() => setConfirm(true)}>
        <Trash2Icon className="size-3.5" />
        Delete club
      </button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>Its emails, extracted notes and lessons go with it. ChatGPT can add the club again, but the history is gone.</DialogDescription>
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
                  router.push("/")
                  toast.success(`${name} deleted`)
                })
              }
            >
              Delete club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Stage and call outcome, the two things changed by hand. */
export function StageStrip({ id, board, callStatus }: { id: string; board: BoardKey; callStatus: CallStatus }) {
  const [state, apply] = React.useOptimistic({ board, callStatus }, (s, p: Partial<{ board: BoardKey; callStatus: CallStatus }>) => ({ ...s, ...p }))
  const [, start] = React.useTransition()
  const reached = BOARD.findIndex((b) => b.key === state.board)
  return (
    <div className="grid gap-4">
      <ol className="grid grid-cols-6 gap-1" aria-label="Progress">
        {BOARD.map((b, i) => (
          <li key={b.key} className="min-w-0">
            <span className="block h-1.5 rounded-full" style={{ background: i <= reached ? STAGE_COLOR[b.key] : "color-mix(in oklch, var(--foreground) 10%, transparent)" }} />
            <span className={cn("mt-1.5 hidden truncate text-xs sm:block", i <= reached ? "text-foreground" : "text-muted-foreground")}>{b.label}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-ml-2">
          <StageMenu
            stage={state.board}
            onChange={(next) =>
              start(async () => {
                apply({ board: next })
                const res = await moveToStage(id, next)
                if (!res.ok) toast.error(res.error)
              })
            }
          />
        </div>
        <CallToggle
          labels
          value={state.callStatus}
          onChange={(next) =>
            start(async () => {
              apply({ callStatus: next })
              const res = await setCallStatus(id, next)
              if (!res.ok) toast.error(res.error)
            })
          }
        />
      </div>
    </div>
  )
}

/** Opening the page counts as reading the reply. */
export function MarkSeen({ id }: { id: string }) {
  React.useEffect(() => {
    void markSeen(id)
  }, [id])
  return null
}
