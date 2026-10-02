import type { Metadata } from "next"
import { headers } from "next/headers"
import { getWorld } from "@/lib/data"
import { guide } from "@/lib/guide"
import { dbHost, dbKind } from "@/db/config"
import { SETUP_SQL } from "@/db/setup-sql"
import { cn } from "@/lib/utils"
import { ago } from "@/lib/format"
import { Page, PageHeader } from "@/components/app/page"
import { CopyBlock } from "@/components/app/copy-block"
import { Button } from "@/components/ui/button"
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
  const signIn = !!process.env.API_TOKEN && !!process.env.APP_PASSWORD
  const pre = "overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-[12px] leading-relaxed"

  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Settings" />

      <Block
        id="chatgpt"
        title="Connect ChatGPT"
        description="Hundred is a ChatGPT plugin. Pick it in a chat or Work session, say what you want in plain language, and it happens in the app."
      >
        <div className="grid gap-6 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Status on={signIn} label={signIn ? "Sign-in is set up" : "Set APP_PASSWORD and API_TOKEN to turn sign-in on"} />
            <Status on={!!world.lastSyncAt} label={world.lastSyncAt ? `Last mailbox sweep ${ago(world.lastSyncAt)}` : "No mailbox sweep yet"} />
          </div>

          <div className="grid gap-1.5">
            <p className="font-medium">Your plugin address</p>
            <pre className={pre}>{base}/mcp</pre>
          </div>

          <ol className="grid list-decimal gap-3 pl-5 text-muted-foreground marker:text-foreground/50">
            <li>
              On the server set <code className="text-foreground">APP_PASSWORD</code> (the password you&rsquo;ll type to approve ChatGPT) and <code className="text-foreground">API_TOKEN</code> (any long random string; it signs the access tokens). Redeploy.
            </li>
            <li>
              In ChatGPT: <span className="text-foreground">Settings → Security and login → Developer mode</span> on.
            </li>
            <li>
              Go to <span className="text-foreground">Plugins → +</span>, name it Hundred, paste the address above, choose <span className="text-foreground">OAuth</span>, and create it. A sign-in page opens: enter your password.
            </li>
            <li>
              Open your personal plugins and install Hundred. In any chat or Work session, pick it from the tools menu (or <span className="text-foreground">@</span> it) and just ask.
            </li>
            <li>
              For the mailbox sweep, create a recurring task in ChatGPT: <span className="text-foreground">&ldquo;Using Hundred, run the mailbox sweep&rdquo;</span> every 30 minutes, with your Gmail connected.
            </li>
          </ol>

          <div className="grid gap-1.5">
            <p className="font-medium">Things to try</p>
            <ul className="grid gap-1 text-muted-foreground">
              {["What needs me today?", "Add these 20 firms to Padel clubs: …", "Run the mailbox sweep.", "How is Core & Calm doing?", "Draft the site email for the firm that just replied.", "Change the quiet wait before sending the site to 5 days."].map((x) => (
                <li key={x} className="before:mr-2 before:text-foreground/40 before:content-['›']">
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<a href="/api/plugin.zip" />}>
              Download the plugin package (.zip)
            </Button>
            <span className="text-muted-foreground">Skills and connection, for Codex and for publishing later. ChatGPT itself only needs the address above.</span>
          </div>

          <details className="group rounded-lg border bg-muted/30 px-3 py-2.5">
            <summary className="cursor-pointer text-muted-foreground group-open:text-foreground">What the assistant is told (the operating guide)</summary>
            <div className="mt-3">
              <CopyBlock text={guide()} label="Guide" maxHeight="18rem" />
            </div>
          </details>

          <details className="group rounded-lg border bg-muted/30 px-3 py-2.5">
            <summary className="cursor-pointer text-muted-foreground group-open:text-foreground">Other ways in: REST API and Custom GPT action</summary>
            <div className="mt-3 grid gap-3 text-muted-foreground">
              <p>
                The same operations are available as a REST API at <code className="text-foreground">{base}/api/v1</code> using <code className="text-foreground">API_TOKEN</code> as a bearer token. The OpenAPI schema is at:
              </p>
              <pre className={pre}>{base}/api/v1/openapi.json</pre>
              <pre className={pre}>{`curl ${base}/api/v1/tasks \\\n  -H "Authorization: Bearer $API_TOKEN"`}</pre>
            </div>
          </details>
        </div>
      </Block>

      <Block
        id="claude-code"
        title="Connect Claude Code"
        description="The same plugin address works in Claude Code, so a coding session can read your sites, build prompts and tasks, and record things back."
      >
        <div className="grid gap-5 text-sm">
          <div className="grid gap-1.5">
            <p className="font-medium">1. Add it (run once in a terminal)</p>
            <CopyBlock text={`claude mcp add --transport http --scope user hundred ${base}/mcp`} label="Command" maxHeight="6rem" />
          </div>
          <div className="grid gap-1.5">
            <p className="font-medium">2. Sign in</p>
            <p className="text-muted-foreground">
              Start <code className="text-foreground">claude</code>, type <code className="text-foreground">/mcp</code>, choose <span className="text-foreground">hundred</span> and <span className="text-foreground">Authenticate</span>. Your browser opens the &ldquo;Connect to Hundred&rdquo; page: enter your <code className="text-foreground">APP_PASSWORD</code>. Or run <code className="text-foreground">claude mcp login hundred</code> in the terminal.
            </p>
          </div>
          <div className="grid gap-1.5">
            <p className="font-medium">3. Try it</p>
            <p className="text-muted-foreground">
              Ask Claude Code: <span className="text-foreground">&ldquo;Use Hundred to get the build prompt for Core &amp; Calm and build the site.&rdquo;</span>
            </p>
          </div>
          <details className="group rounded-lg border bg-muted/30 px-3 py-2.5">
            <summary className="cursor-pointer text-muted-foreground group-open:text-foreground">Without a browser sign-in (uses API_TOKEN instead)</summary>
            <div className="mt-3 grid gap-2 text-muted-foreground">
              <p>For servers or scripts: send your token in a header instead. Keep it out of shared files.</p>
              <CopyBlock text={`claude mcp add --transport http --scope user hundred ${base}/mcp --header "Authorization: Bearer YOUR_API_TOKEN"`} label="Command" maxHeight="6rem" />
            </div>
          </details>
        </div>
      </Block>

      <Block title="Database" description="Everything lives in Supabase (Postgres), reached over HTTPS.">
        <div className="grid gap-4 text-sm">
          <Status
            on={dbKind === "supabase"}
            label={dbKind === "supabase" ? `Supabase: ${dbHost()}` : dbKind === "local" ? "Local development database (./data/pglite)" : "Temporary storage: connect Supabase to keep data"}
          />
          {dbKind !== "supabase" && (
            <p className="text-muted-foreground">
              Set <code className="text-foreground">SUPABASE_URL</code> and <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code>, run the setup SQL once, and redeploy.
            </p>
          )}
          <details className="group rounded-lg border bg-muted/30 px-3 py-2.5">
            <summary className="cursor-pointer text-muted-foreground group-open:text-foreground">Setup SQL (paste into Supabase → SQL Editor, once)</summary>
            <div className="mt-3">
              <CopyBlock text={SETUP_SQL} label="Setup SQL" maxHeight="16rem" />
            </div>
          </details>
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
