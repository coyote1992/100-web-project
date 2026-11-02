"use client"

import * as React from "react"
import { toast } from "sonner"
import { resetTemplate, saveTemplates, updateVertical } from "@/app/actions"
import { AutoField } from "@/components/app/auto-field"
import { Button } from "@/components/ui/button"

export function TemplateEditor({ field, value, customised, rows }: { field: "buildPrompt" | "sendSiteTemplate" | "callSchedulingTemplate"; value: string; customised: boolean; rows: number }) {
  const [pending, start] = React.useTransition()
  return (
    <div className="grid gap-2">
      <AutoField
        label="Template. Saves when you click away"
        value={value}
        onSave={async (v) => {
          const res = await saveTemplates({ [field]: v })
          if (!res.ok) toast.error(res.error)
        }}
        multiline
        rows={rows}
        inputClassName="max-h-[28rem] font-mono text-[12.5px] leading-relaxed"
      />
      {customised && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start text-muted-foreground"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await resetTemplate(field)
              if (res.ok) toast.success("Back to the default")
            })
          }
        >
          Reset to default
        </Button>
      )}
    </div>
  )
}

/** The two sites Claude Code is pointed at when it builds a club's new site. */
export function ReferenceFields({ id, reference1, reference2 }: { id: string; reference1: string; reference2: string }) {
  const save = (key: "reference1" | "reference2") => async (value: string) => {
    const res = await updateVertical(id, { [key]: value })
    if (!res.ok) toast.error(res.error)
  }
  return (
    <div className="grid gap-4">
      <AutoField label="Reference site 1" value={reference1} onSave={save("reference1")} placeholder="https://www.lagunabeachtennisacademy.com" />
      <AutoField label="Reference site 2" value={reference2} onSave={save("reference2")} placeholder="https://…" />
    </div>
  )
}
