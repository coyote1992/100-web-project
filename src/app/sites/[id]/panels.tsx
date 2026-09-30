"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CopyIcon, LightbulbIcon, MailPlusIcon, MoreHorizontalIcon, Trash2Icon, XIcon } from "lucide-react"
import { addNote, deleteNote, deleteProspect, deleteWorkLog, logMessage, updateProspect } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { BUILD_STEPS } from "@/lib/flow"
import { cn } from "@/lib/utils"

type Site = {
  id: string
  name: string
  city: string
  oldSiteUrl: string
  demoUrl: string
  references: string
  contactName: string
  email: string
  phone: string
  build: "scouted" | "building" | "ready"
  buildMethod: string
  verticalId: string
  batchId: string | null
}

export function BuildPanel({ site, methods }: { site: Site; methods: string[] }) {
  const [pending, start] = React.useTransition()
  const save = (k: keyof Site) => (v: string) => updateProspect(site.id, { [k]: v })
  return (
    <div className="grid gap-4">
      <div className="inline-grid grid-cols-3 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Build status">
        {BUILD_STEPS.map((b) => (
          <button
            key={b.key}
            role="radio"
            aria-checked={site.build === b.key}
            disabled={pending}
            onClick={() => start(() => updateProspect(site.id, { build: b.key }))}
            className={cn(
              "pressable h-8 rounded-md text-sm",
              site.build === b.key ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>
      <AutoField label="Demo URL" value={site.demoUrl} onSave={save("demoUrl")} placeholder="site-name.vercel.app" />
      <AutoField label="Build method" value={site.buildMethod} onSave={save("buildMethod")} placeholder="Opus full, Opus plan → Sonnet…" list="build-methods" />
      <datalist id="build-methods">
        {methods.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <AutoField label="Reference sites (one per line)" value={site.references} onSave={save("references")} multiline rows={2} placeholder="lagunabeachtennisacademy.com" />
    </div>
  )
}

export function ContactPanel({ site }: { site: Site }) {
  const save = (k: keyof Site) => (v: string) => updateProspect(site.id, { [k]: v })
  return (
    <div className="grid gap-4">
      <AutoField label="Current website" value={site.oldSiteUrl} onSave={save("oldSiteUrl")} placeholder="their-site.hu" />
      <div className="grid grid-cols-2 gap-3">
        <AutoField label="Contact" value={site.contactName} onSave={save("contactName")} placeholder="Owner's name" />
        <AutoField label="City" value={site.city} onSave={save("city")} />
      </div>
      <AutoField label="Email" type="email" value={site.email} onSave={save("email")} placeholder="Used to match incoming email" />
      <AutoField label="Phone" type="tel" value={site.phone} onSave={save("phone")} />
    </div>
  )
}

export function NoteComposer({ prospectId }: { prospectId: string }) {
  const [body, setBody] = React.useState("")
  const [lesson, setLesson] = React.useState(false)
  const [pending, start] = React.useTransition()
  function submit() {
    if (!body.trim()) return
    start(async () => {
      await addNote({ prospectId, body, isLesson: lesson })
      setBody("")
      toast.success(lesson ? "Lesson saved — it'll show up in Lessons too" : "Note saved")
      setLesson(false)
    })
  }
  return (
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
        aria-label="New note"
        placeholder="Anything interesting? A reaction, an objection, something you'd do differently…"
        className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
        <button
          type="button"
          aria-pressed={lesson}
          onClick={() => setLesson((l) => !l)}
          className={cn(
            "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs",
            lesson ? "bg-move-soft font-medium text-foreground ring-1 ring-move-line" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <LightbulbIcon className="size-3.5" />
          {lesson ? "Saving as a lesson" : "Mark as lesson"}
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-0.5 text-xs text-muted-foreground sm:inline-flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <Button size="sm" type="submit" disabled={pending || !body.trim()}>
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}

export function DeleteItem({ type, id }: { type: "work" | "note"; id: string }) {
  const [pending, start] = React.useTransition()
  return (
    <button
      aria-label={type === "work" ? "Delete time entry" : "Delete note"}
      disabled={pending}
      onClick={() => start(() => (type === "work" ? deleteWorkLog(id) : deleteNote(id)))}
      className="-mt-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
    >
      <XIcon className="size-3.5" />
    </button>
  )
}

export function SiteMenu({ site, prompt }: { site: Site; prompt: string }) {
  const router = useRouter()
  const [emailOpen, setEmailOpen] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [pending, start] = React.useTransition()

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    toast.success("Build prompt copied", { description: "Paste it into Claude Code to start the rebuild." })
  }

  return (
    <>
      <Button variant="outline" onClick={copy}>
        <CopyIcon />
        Copy build prompt
      </Button>
      <Button variant="outline" onClick={() => setEmailOpen(true)}>
        <MailPlusIcon />
        <span className="hidden sm:inline">Log email</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {site.demoUrl && (
            <DropdownMenuItem
              onClick={async () => {
                await navigator.clipboard.writeText(site.demoUrl)
                toast.success("Demo link copied")
              }}
            >
              Copy demo link
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirm(true)}>
            <Trash2Icon />
            Delete site
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogEmailDialog open={emailOpen} onOpenChange={setEmailOpen} prospectId={site.id} />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {site.name}?</DialogTitle>
            <DialogDescription>Its steps, time entries and notes go with it. Consider parking it instead: parked sites stay in your numbers.</DialogDescription>
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
                  await deleteProspect(site.id)
                  router.push("/sites")
                  toast.success(`${site.name} deleted`)
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

function LogEmailDialog({ open, onOpenChange, prospectId }: { open: boolean; onOpenChange: (o: boolean) => void; prospectId: string }) {
  const [direction, setDirection] = React.useState<"in" | "out">("in")
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              await logMessage({ prospectId, direction, subject, body })
              toast.success("Email logged")
              setSubject("")
              setBody("")
              onOpenChange(false)
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>Log an email</DialogTitle>
            <DialogDescription>Until the mailbox is connected, paste important emails here so they count.</DialogDescription>
          </DialogHeader>
          <div className="inline-grid grid-cols-2 rounded-lg bg-muted p-0.5">
            {(["in", "out"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={direction === d}
                onClick={() => setDirection(d)}
                className={cn("pressable h-8 rounded-md text-sm", direction === d ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground")}
              >
                {d === "in" ? "They wrote" : "I wrote"}
              </button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email-body">Body</Label>
            <Textarea id="email-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Log email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PlacementPanel({
  site,
  verticals,
  batches,
}: {
  site: Site
  verticals: { id: string; name: string }[]
  batches: { id: string; name: string }[]
}) {
  const [pending, start] = React.useTransition()
  const cls =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30"
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="site-vertical" className="text-xs text-muted-foreground">
          Vertical
        </label>
        <select
          id="site-vertical"
          className={cls}
          disabled={pending}
          value={site.verticalId}
          onChange={(e) => start(() => updateProspect(site.id, { verticalId: e.target.value }))}
        >
          {verticals.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="site-batch" className="text-xs text-muted-foreground">
          Batch
        </label>
        <select
          id="site-batch"
          className={cls}
          disabled={pending}
          value={site.batchId ?? ""}
          onChange={(e) => start(() => updateProspect(site.id, { batchId: e.target.value || null }))}
        >
          <option value="">None</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
