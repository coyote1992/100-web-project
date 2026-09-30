import type { Metadata } from "next"
import { headers } from "next/headers"
import { getWorld } from "@/lib/data"
import { instructions } from "@/lib/chatgpt"
import { dbHost, dbKind } from "@/db/config"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/format"
import { Page, PageHeader } from "@/components/app/page"
import { CopyBlock } from "@/components/app/copy-block"
import { DataActions } from "./settings-client"

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
  const [world, h] = await Promise.all([getWorld(), headers()])
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`
  const token = !!process.env.API_TOKEN
  const pre = "overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-[12px] leading-relaxed"

  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Settings" />

      <Block
        id="chatgpt"
        title="Connect ChatGPT"
        description="ChatGPT is the hands of this app: it adds firms, syncs your Gmail, extracts what people say and moves sites along. It talks to a small token-protected API."
      >
        <div className="grid gap-6 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Status on={token} label={token ? "API_TOKEN is set" : "API_TOKEN is not set: the API is off"} />
            <Status on={!!world.lastSyncAt} label={world.lastSyncAt ? `Last mailbox sweep ${ago(world.lastSyncAt)}` : "No mailbox sweep yet"} />
          </div>
          <ol className="grid list-decimal gap-3 pl-5 text-muted-foreground marker:text-foreground/50">
            <li>
              Choose a long random string and set it as <code className="text-foreground">API_TOKEN</code> in the app&rsquo;s environment (Vercel → Settings → Environment Variables), then redeploy.
            </li>
            <li>
              In ChatGPT, create a custom GPT (or a project) and add an <span className="text-foreground">Action</span>. Import the schema from the URL below. For authentication choose{" "}
              <span className="text-foreground">API key → Bearer</span> and paste the token.
            </li>
            <li>Paste the instructions below into the GPT&rsquo;s instructions. They tell it the flow and the 30-minute mailbox sweep.</li>
            <li>Give it your Gmail (the connector for the outreach inbox) and schedule the sweep as a recurring task, every 30 minutes.</li>
          </ol>
          <div className="grid gap-1.5">
            <p className="font-medium">Schema URL</p>
            <pre className={pre}>{base}/api/v1/openapi.json</pre>
            <p className="text-xs text-muted-foreground">Public on purpose: it describes the API but grants nothing without the token.</p>
          </div>
          <div className="grid gap-1.5">
            <p className="font-medium">Instructions for ChatGPT</p>
            <CopyBlock text={instructions(base)} label="Instructions" maxHeight="20rem" />
          </div>
          <div className="grid gap-1.5">
            <p className="font-medium">Try it</p>
            <pre className={pre}>{`curl ${base}/api/v1/tasks \\
  -H "Authorization: Bearer $API_TOKEN"`}</pre>
          </div>
        </div>
      </Block>

      <Block title="Database" description="Everything lives in Postgres. Supabase is the intended home.">
        <div className="grid gap-4 text-sm">
          <Status
            on={dbKind === "postgres"}
            label={dbKind === "postgres" ? `Postgres: ${dbHost()}` : dbKind === "local" ? "Local development database (./data/pglite)" : "Temporary storage: connect Supabase to keep data"}
          />
          {dbKind !== "postgres" && (
            <p className="text-muted-foreground">
              Set <code className="text-foreground">DATABASE_URL</code> to your Supabase connection string (Project settings → Database → Connection string, the pooler one) and redeploy. Tables are created on first load.
            </p>
          )}
        </div>
      </Block>

      <Block title="Access" description="Protect the app with a password when it's deployed.">
        <div className="grid gap-2 text-sm">
          <Status on={!!process.env.APP_PASSWORD} label={process.env.APP_PASSWORD ? "Password protection is on" : "No password set: anyone with the URL can open it"} />
          <p className="text-muted-foreground">
            Set <code className="text-foreground">APP_PASSWORD</code> to turn on browser sign-in (any username). The ChatGPT API uses its own token, not this password.
          </p>
        </div>
      </Block>

      <Block title="Data" description="Export a backup, load fictional demo data to explore, or start clean.">
        <DataActions hasData={world.verticals.length > 0 || world.sites.length > 0} />
      </Block>
    </Page>
  )
}
