"use client"

import * as React from "react"
import { toast } from "sonner"
import { addNote, deleteNote, toggleLesson, updateVertical } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function LessonComposer({ verticals }: { verticals: { id: string; name: string }[] }) {
  const [body, setBody] = React.useState("")
  const [verticalId, setVerticalId] = React.useState("")
  const [pending, start] = React.useTransition()
  const submit = () =>
    body.trim() &&
    start(async () => {
      await addNote({ body, isLesson: true, verticalId: verticalId || null })
      setBody("")
      toast.success("Lesson saved")
    })
  return (
    <form
      className="rounded-xl border bg-surface focus-within:ring-2 focus-within:ring-ring/40"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
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
        placeholder="What did you learn? e.g. Wedding venues reply slower — don't chase before day 6."
        className="min-h-16 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
        <select
          value={verticalId}
          onChange={(e) => setVerticalId(e.target.value)}
          aria-label="Vertical"
          className="h-7 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground outline-none hover:text-foreground"
        >
          <option value="">Applies to all verticals</option>
          {verticals.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <Button size="sm" type="submit" disabled={pending || !body.trim()}>
          Save lesson
        </Button>
      </div>
    </form>
  )
}

export function LessonActions({
  id,
  body,
  verticalId,
  playbook,
  promoteOnly,
}: {
  id: string
  body: string
  verticalId: string | null
  playbook: string | null
  promoteOnly?: boolean
}) {
  const [pending, start] = React.useTransition()
  const inPlaybook = playbook?.includes(body.trim())
  const btn = "rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground disabled:opacity-50"
  if (promoteOnly)
    return (
      <button className={`${btn} shrink-0 text-xs text-muted-foreground`} disabled={pending} onClick={() => start(() => toggleLesson(id, true))}>
        Make it a lesson
      </button>
    )
  return (
    <span className="ml-auto flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
      {verticalId && playbook !== null && !inPlaybook && (
        <button
          className={btn}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateVertical(verticalId, { playbook: `${playbook.trim()}\n- ${body.trim()}`.trim() })
              toast.success("Added to the playbook — future build prompts include it")
            })
          }
        >
          Add to playbook
        </button>
      )}
      {inPlaybook && <span className="px-1.5 py-0.5">In playbook</span>}
      <button className={btn} disabled={pending} onClick={() => start(() => toggleLesson(id, false))}>
        Unmark
      </button>
      <button className={`${btn} hover:text-destructive`} disabled={pending} onClick={() => start(() => deleteNote(id))}>
        Delete
      </button>
    </span>
  )
}
