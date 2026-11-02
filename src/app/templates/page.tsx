import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { PLACEHOLDERS, fillReferences } from "@/lib/templates"
import { Page, PageHeader } from "@/components/app/page"
import { listPackages } from "@/lib/domain"
import { PackageUpload } from "@/components/app/package-upload"
import { CopyBlock } from "@/components/app/copy-block"
import { ReferenceFields, TemplateEditor } from "./templates-client"

export const metadata: Metadata = { title: "Templates" }

function Block({ title, description, placeholders, children }: { title: string; description: string; placeholders?: string[]; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t py-10 first:border-t-0 first:pt-0 md:grid-cols-[260px_minmax(0,1fr)]">
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>
        {placeholders && (
          <p className="mt-3 flex flex-wrap gap-1 text-xs">
            {placeholders.map((p) => (
              <code key={p} className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                [{p}]
              </code>
            ))}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export default async function TemplatesPage() {
  const { templates: t, customised, verticals } = await getWorld()
  const focus = verticals[0]
  const pkgs = focus ? await listPackages({ kind: "vertical", id: focus.id }).catch(() => []) : []
  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Templates" description="The build prompt, its references, and the emails ChatGPT drafts for each club." />

      <Block
        title="Build prompt"
        description="The one prompt for every club. Copy it into Claude Code and say which club: it looks the club up in 100web through the Hundred connector. The two reference sites below are filled in."
        placeholders={PLACEHOLDERS.buildPrompt}
      >
        <div className="grid gap-3">
          <CopyBlock text={fillReferences(t.buildPrompt, focus)} label="Build prompt" hint="Paste it into Claude Code and name the club." maxHeight="20rem" />
          <details className="group rounded-lg border px-3 py-2.5">
            <summary className="cursor-pointer text-sm text-muted-foreground group-open:text-foreground">Edit the prompt</summary>
            <div className="mt-3">
              <TemplateEditor field="buildPrompt" value={t.buildPrompt} customised={customised.buildPrompt} rows={18} />
            </div>
          </details>
        </div>
      </Block>

      {focus && (
        <Block title="References for the build" description="The two sites Claude Code takes its design cues from, and any zips it should use (a style kit, photos, fonts).">
          <div className="grid gap-6">
            <ReferenceFields id={focus.id} reference1={focus.reference1} reference2={focus.reference2} />
            <PackageUpload kind="vertical" id={focus.id} packages={pkgs} title="Reference packages (zip)" />
          </div>
        </Block>
      )}

      <Block title="Send-the-site email" description="Goes out with the demo link, after a reply or after the quiet days. ChatGPT personalises it. [SENDER_NAME] is left for ChatGPT to fill." placeholders={PLACEHOLDERS.sendSiteTemplate}>
        <TemplateEditor field="sendSiteTemplate" value={t.sendSiteTemplate} customised={customised.sendSiteTemplate} rows={14} />
      </Block>

      <Block title="Call-scheduling email" description="The reply to a positive answer, proposing times. ChatGPT fills the slots from your calendar or asks you." placeholders={PLACEHOLDERS.callSchedulingTemplate}>
        <TemplateEditor field="callSchedulingTemplate" value={t.callSchedulingTemplate} customised={customised.callSchedulingTemplate} rows={14} />
      </Block>
    </Page>
  )
}
