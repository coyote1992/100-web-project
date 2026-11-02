import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { PLACEHOLDERS } from "@/lib/templates"
import { Page, PageHeader } from "@/components/app/page"
import { listPackages } from "@/lib/domain"
import { PackageUpload } from "@/components/app/package-upload"
import { ReferenceFields, TemplateEditor, TimingFields } from "./templates-client"

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
      <PageHeader title="Templates" description="The words, references and timing behind the flow. ChatGPT reads them when it drafts an email, and each club's page fills them in." />

      {focus && (
        <Block title="Reference sites" description="The two tennis sites Claude Code is pointed at in every build prompt. Zips here are extra material for the build, such as a style kit.">
          <div className="grid gap-6">
            <ReferenceFields id={focus.id} reference1={focus.reference1} reference2={focus.reference2} />
            <PackageUpload kind="vertical" id={focus.id} packages={pkgs} title="Reference packages (zip)" />
          </div>
        </Block>
      )}

      <Block title="Follow-up timing" description="How long silence lasts before ChatGPT takes the next step. It reads these from the app.">
        <TimingFields siteFollowUpDays={t.siteFollowUpDays} callAfterSiteDays={t.callAfterSiteDays} />
      </Block>

      <Block title="Website build prompt" description="Copied from each site page and handed to Claude Code as is. The club's old site and the two reference sites are filled in for you." placeholders={PLACEHOLDERS.buildPrompt}>
        <TemplateEditor field="buildPrompt" value={t.buildPrompt} customised={customised.buildPrompt} rows={18} />
      </Block>

      <Block title="Send-the-site email" description="Goes out with the demo link, after a reply or after the quiet days. ChatGPT personalises it. [SENDER_NAME] is left for ChatGPT to fill." placeholders={PLACEHOLDERS.sendSiteTemplate}>
        <TemplateEditor field="sendSiteTemplate" value={t.sendSiteTemplate} customised={customised.sendSiteTemplate} rows={14} />
      </Block>

      <Block title="Call-scheduling email" description="The reply to a positive answer, proposing times. ChatGPT fills the slots from your calendar or asks you." placeholders={PLACEHOLDERS.callSchedulingTemplate}>
        <TemplateEditor field="callSchedulingTemplate" value={t.callSchedulingTemplate} customised={customised.callSchedulingTemplate} rows={14} />
      </Block>
    </Page>
  )
}
