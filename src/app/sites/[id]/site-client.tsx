"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PencilIcon, PhoneIcon, Trash2Icon, XIcon } from "lucide-react"
import { addLesson, deleteLesson, deleteSite, markSeen, moveToStage, setCallStatus, updateLesson, updateSite } from "@/app/actions"
import { CallOptions, StageMenu, StageRing } from "@/components/app/stage"
import { AutoField } from "@/components/app/auto-field"
import { telHref } from "@/lib/phone"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Textarea } from "@/components/ui/textarea"
import { BOARD_LABEL, CONTACT_ROLES, PHONE_OWNERS, type BoardKey, type CallStatus, type ContactRole, type PhoneOwner } from "@/lib/flow"

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

function KVText({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  action,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<unknown>
  type?: string
  placeholder?: string
  action?: React.ReactNode
}) {
  const id = React.useId()
  const [v, setV] = React.useState(value)
  const [prop, setProp] = React.useState(value)
  if (prop !== value) {
    setProp(value)
    setV(value)
  }
  return (
    <div className={cn("grid items-center gap-2", action ? "grid-cols-[92px_minmax(0,1fr)_auto]" : "grid-cols-[92px_minmax(0,1fr)]")}>
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && void onSave(v.trim())}
        className="h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-[13.5px] transition-colors placeholder:text-muted-foreground/70 hover:bg-accent focus:border-input focus:bg-background focus:outline-none"
      />
      {action}
    </div>
  )
}

function KVSelect<T extends string>({ label, value, options, labels, onSave }: { label: string; value: T; options: readonly T[]; labels: Record<T, string>; onSave: (v: T) => Promise<unknown> }) {
  const id = React.useId()
  const [v, setV] = React.useState(value)
  const [prop, setProp] = React.useState(value)
  if (prop !== value) {
    setProp(value)
    setV(value)
  }
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={v}
        onChange={(e) => {
          const next = e.target.value as T
          setV(next)
          void onSave(next)
        }}
        className="h-8 w-full min-w-0 cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 text-[13.5px] transition-colors hover:bg-accent focus:border-input focus:bg-background focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Who to call and how to reach them. Every row edits in place and saves when you leave it. */
export function DetailsList({
  id,
  site,
}: {
  id: string
  site: { contactName: string; contactRole: ContactRole; phone: string; phoneOwner: PhoneOwner; email: string; oldSiteUrl: string; city: string }
}) {
  return (
    <div className="grid gap-0.5">
      <KVText label="Contact" value={site.contactName} onSave={save(id, "contactName")} placeholder="Name" />
      <KVSelect label="Role" value={site.contactRole} options={CONTACT_ROLES} labels={{ unknown: "Unknown", owner: "Owner", trainer: "Trainer" }} onSave={save(id, "contactRole")} />
      <KVText
        label="Phone"
        type="tel"
        value={site.phone}
        onSave={save(id, "phone")}
        placeholder="+36 …"
        action={
          site.phone ? (
            <a href={telHref(site.phone)} aria-label={`Call ${site.phone}`} className="pressable grid size-8 place-items-center rounded-full bg-court text-background hover:opacity-90">
              <PhoneIcon className="size-3.5" />
            </a>
          ) : null
        }
      />
      <KVSelect label="Whose number" value={site.phoneOwner} options={PHONE_OWNERS} labels={{ unknown: "Not sure", person: "The contact", reception: "Reception" }} onSave={save(id, "phoneOwner")} />
      <KVText label="Email" type="email" value={site.email} onSave={save(id, "email")} />
      <KVText label="Website" value={site.oldSiteUrl} onSave={save(id, "oldSiteUrl")} placeholder="their-club.hu" />
      <KVText label="City" value={site.city} onSave={save(id, "city")} />
    </div>
  )
}

/** The club's stage: its ring, the name, and a menu to move it. */
export function StageBox({ id, board }: { id: string; board: BoardKey }) {
  const [stage, apply] = React.useOptimistic(board, (_: BoardKey, next: BoardKey) => next)
  const [, start] = React.useTransition()
  return (
    <div className="flex items-center gap-3.5">
      <StageRing stage={stage} size={56} />
      <div className="min-w-0">
        <p className="display text-lg leading-tight">{BOARD_LABEL[stage]}</p>
        <StageMenu
          variant="link"
          stage={stage}
          onChange={(next) =>
            start(async () => {
              apply(next)
              const res = await moveToStage(id, next)
              if (!res.ok) toast.error(res.error)
            })
          }
        />
      </div>
    </div>
  )
}

export function CallBox({ id, callStatus }: { id: string; callStatus: CallStatus }) {
  const [value, apply] = React.useOptimistic(callStatus, (_: CallStatus, next: CallStatus) => next)
  const [, start] = React.useTransition()
  return (
    <CallOptions
      value={value}
      onChange={(next) =>
        start(async () => {
          apply(next)
          const res = await setCallStatus(id, next)
          if (!res.ok) toast.error(res.error)
        })
      }
    />
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
                  <p className="border-l-2 border-court/40 pl-3 text-[15px] leading-relaxed text-pretty">{l.body}</p>
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

/** Opening the page counts as reading the reply. */
export function MarkSeen({ id }: { id: string }) {
  React.useEffect(() => {
    void markSeen(id)
  }, [id])
  return null
}
