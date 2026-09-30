import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { PLACEHOLDERS } from "@/lib/templates"
import { Page, PageHeader } from "@/components/app/page"
import { TemplateEditor, TimingFields } from "./templates-client"

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
  const { templates: t, customised } = await getWorld()
  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Templates" description="The words and the timing behind the flow. ChatGPT reads these from the API when it drafts an email, and each site page fills them in for that firm." />

      <Block title="Follow-up timing" description="How long silence lasts before the next step turns up in Tasks. ChatGPT reads these too.">
        <TimingFields siteFollowUpDays={t.siteFollowUpDays} callAfterSiteDays={t.callAfterSiteDays} />
      </Block>

      <Block title="Website build prompt" description="Copied from each site page and handed to Claude Code as is. The old site and the vertical's two reference sites are filled in for you." placeholders={PLACEHOLDERS.buildPrompt}>
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
