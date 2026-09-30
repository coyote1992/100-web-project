import type { Metadata } from "next"
import { headers } from "next/headers"
import { getSettings, getWorld } from "@/lib/data"
import { cn } from "@/lib/utils"
import { dbIsEphemeral, dbUrl } from "@/db/config"
import { Page, PageHeader } from "@/components/app/page"
import { ChaseDays, DataActions, PromptEditor } from "./settings-client"

export const metadata: Metadata = { title: "Settings" }

function Block({ id, title, description, children }: { id?: string; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-6 border-t py-10 first:border-t-0 first:pt-0 md:grid-cols-[260px_minmax(0,1fr)]">
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {description && <div className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-2 rounded-full", on ? "bg-positive" : "border border-foreground/40")} />
      {label}
    </span>
  )
}

export default async function SettingsPage() {
  const [settings, world, h] = await Promise.all([getSettings(), getWorld(), headers()])
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`
  const token = !!process.env.INBOUND_TOKEN
  const pre = "overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-[12px] leading-relaxed"

  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Settings" />

      <Block title="Build prompt" description="Copied from each site with its URLs filled in, plus that vertical's playbook appended.">
        <PromptEditor prompt={settings.prompt} customised={settings.promptCustomised} />
      </Block>

      <Block title="Follow-ups" description="Sites waiting on a reply show up under “Needs you” once they've been quiet this long.">
        <ChaseDays value={settings.chaseDays} />
      </Block>

      <Block
        id="email"
        title="Email"
        description={
          <>
            Use a dedicated outreach mailbox and forward its mail here. Incoming mail is matched to a site by address or domain,
            then waits in the Inbox to be rated.
          </>
        }
      >
        <div className="grid gap-5 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Status on={token} label={token ? "INBOUND_TOKEN is set" : "INBOUND_TOKEN not set"} />
            <Status on={!!process.env.OUTREACH_ADDRESS} label={process.env.OUTREACH_ADDRESS ? `Outreach address: ${process.env.OUTREACH_ADDRESS}` : "OUTREACH_ADDRESS not set"} />
          </div>
          <div>
            <p className="mb-2 font-medium">Webhook</p>
            <pre className={pre}>{`curl -X POST ${origin}/api/inbound \\
  -H "Authorization: Bearer $INBOUND_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"from":"owner@their-club.hu","to":"you@outreach.hu",
       "subject":"Re: your new site","text":"Looks great!",
       "date":"2026-09-30T18:04:00Z","messageId":"<abc@mail>"}'`}</pre>
          </div>
          <ol className="grid list-decimal gap-2 pl-5 text-muted-foreground marker:text-foreground/50">
            <li>
              Set <code className="text-foreground">INBOUND_TOKEN</code> (any long random string) and{" "}
              <code className="text-foreground">OUTREACH_ADDRESS</code> (your outreach mailbox) in the environment.
            </li>
            <li>
              Forward mail with whatever fits your provider: a <span className="text-foreground">Cloudflare Email Worker</span>, a{" "}
              <span className="text-foreground">Postmark inbound</span> webhook, or a small{" "}
              <span className="text-foreground">Gmail Apps Script</span> on a 5-minute trigger that posts new threads.
            </li>
            <li>BCC the outreach mailbox on what you send. Mail from your own address is logged as outgoing.</li>
            <li>Duplicates are ignored by <code className="text-foreground">messageId</code>, so re-sending is safe.</li>
          </ol>
        </div>
      </Block>

      <Block title="Access" description="Protect the app with a password when it's deployed.">
        <div className="grid gap-2 text-sm">
          <Status on={!!process.env.APP_PASSWORD} label={process.env.APP_PASSWORD ? "Password protection is on" : "No password set: anyone with the URL can open it"} />
          <p className="text-muted-foreground">
            Set <code className="text-foreground">APP_PASSWORD</code> to turn on browser sign-in (any username). The email webhook uses its own token.
          </p>
        </div>
      </Block>

      <Block title="Data" description="Everything lives in one SQLite database: a local file, or Turso when deployed.">
        <div className="grid gap-4">
          <Status
            on={!dbIsEphemeral}
            label={
              dbUrl.startsWith("file:")
                ? dbIsEphemeral
                  ? "Temporary file on Vercel: connect Turso to keep data"
                  : "Local SQLite file"
                : `Hosted database: ${dbUrl.replace(/^\w+:\/\//, "").split("/")[0]}`
            }
          />
          <DataActions hasData={world.verticals.length > 0 || world.prospects.length > 0} />
        </div>
      </Block>
    </Page>
  )
}
