import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { Providers } from "@/components/app/providers"
import { Sidebar } from "@/components/app/sidebar"
import { getWorld } from "@/lib/data"
import { buildRows, taskItems } from "@/lib/metrics"
import { dbKind } from "@/db/config"
import { SETUP_SQL } from "@/db/setup-sql"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin", "latin-ext"], weight: "400" })

export const metadata: Metadata = {
  title: { default: "Hundred", template: "%s · Hundred" },
  description: "Track 100 speculative website builds from first email to paid client.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let world: Awaited<ReturnType<typeof getWorld>>
  try {
    world = await Promise.race([
      getWorld(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("The database didn't answer in 30 s.")), 30_000)),
    ])
  } catch (e) {
    // Show the real reason instead of a blank "application error" or an endless spinner.
    // The drivers wrap the useful message ("Invalid API key", "function not found") as the cause of a long SQL error.
    const root = (x: unknown): string => (x instanceof Error && x.cause ? root(x.cause) : x instanceof Error ? x.message : String(x))
    const reason = root(e).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_secret_\w+/g, "***")
    const needsSetup = /hundred_exec|does not exist|PGRST20\d|schema cache/i.test(reason)
    return (
      <html lang="en">
        <body style={{ font: "15px/1.6 system-ui, sans-serif", maxWidth: 640, margin: "8vh auto", padding: 20 }}>
          <h1 style={{ fontWeight: 500 }}>{needsSetup ? "Hundred needs its database set up" : "Hundred can\u2019t reach its database"}</h1>
          {needsSetup ? (
            <>
              <p>
                Open Supabase → <b>SQL Editor</b> → <b>New query</b>, paste everything below, and click <b>Run</b>. Then reload this page.
              </p>
              <textarea readOnly rows={10} defaultValue={SETUP_SQL} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
            </>
          ) : (
            <p>
              Check that <code>SUPABASE_URL</code> is your project URL (<code>https://….supabase.co</code>) and <code>SUPABASE_SERVICE_ROLE_KEY</code> is the <b>service_role</b> (or secret) key, not the anon key, then redeploy.
            </p>
          )}
          <pre style={{ whiteSpace: "pre-wrap", background: "#f3f0ea", padding: 12, borderRadius: 8, fontSize: 13 }}>{reason}</pre>
        </body>
      </html>
    )
  }
  const rows = buildRows(world)
  const due = taskItems(rows, world.tasks).filter((i) => i.state === "due").length

  const lookup = {
    verticals: world.verticals.map((v) => ({ id: v.id, name: v.name, hue: v.hue })),
    sites: rows.map((r) => ({ id: r.id, name: r.name, verticalId: r.verticalId, city: r.city, status: r.status })),
  }

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers lookup={lookup}>
          <div className="flex min-h-dvh flex-col lg:flex-row">
            <Sidebar
              badges={{ "/tasks": due }}
              sync={{ at: world.lastSyncAt?.getTime() ?? null, note: world.lastSyncNote }}
              progress={world.verticals.map((v) => ({ name: v.name, hue: v.hue, target: v.target, count: rows.filter((r) => r.verticalId === v.id).length }))}
            />
            <main className="min-w-0 flex-1">
              {dbKind === "temporary" && (
                <div role="status" className="border-b border-move-line bg-move-soft px-4 py-2.5 text-sm sm:px-8">
                  <strong className="font-medium">Temporary storage.</strong>{" "}
                  <span className="text-muted-foreground">
                    No database is connected, so everything disappears when Vercel restarts the app. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> and redeploy.
                  </span>
                </div>
              )}
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
