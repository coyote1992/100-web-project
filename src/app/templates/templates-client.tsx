"use client"

import * as React from "react"
import { toast } from "sonner"
import { resetTemplate, saveTemplates } from "@/app/actions"
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

export function TimingFields({ siteFollowUpDays, callAfterSiteDays }: { siteFollowUpDays: number; callAfterSiteDays: number }) {
  const save = (key: "siteFollowUpDays" | "callAfterSiteDays") => async (v: string) => {
    const res = await saveTemplates({ [key]: Math.round(Number(v)) })
    if (!res.ok) toast.error(res.error)
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-1">
        <AutoField label="Send the site after this many quiet days" type="number" value={String(siteFollowUpDays)} onSave={save("siteFollowUpDays")} className="max-w-56" />
        <p className="text-sm text-muted-foreground">After the opening question. If they reply, the site goes out straight away.</p>
      </div>
      <div className="grid gap-1">
        <AutoField label="Call after this many quiet days" type="number" value={String(callAfterSiteDays)} onSave={save("callAfterSiteDays")} className="max-w-56" />
        <p className="text-sm text-muted-foreground">After the site went out with no answer, a call task appears.</p>
      </div>
    </div>
  )
}
