import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { Providers } from "@/components/app/providers"
import { Sidebar } from "@/components/app/sidebar"
import { getWorld } from "@/lib/data"
import { buildRows, taskItems } from "@/lib/metrics"
import { dbKind } from "@/db/config"
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
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("The database accepted the connection but its answers never arrived (30 s).")), 30_000)),
    ])
  } catch (e) {
    // Show the real reason instead of a blank "application error" or an endless spinner.
    const raw = e instanceof Error ? `${e.message}${e.cause instanceof Error ? ` (${e.cause.message})` : ""}` : String(e)
    const reason = raw.replace(/:\/\/[^@\s]*@/g, "://***@")
    return (
      <html lang="en">
        <body style={{ font: "15px/1.6 system-ui, sans-serif", maxWidth: 560, margin: "12vh auto", padding: 20 }}>
          <h1 style={{ fontWeight: 500 }}>Hundred can&apos;t reach its database</h1>
          <p>Check that <code>DATABASE_URL</code> is the Supabase <b>Transaction pooler</b> string (host ends in <code>pooler.supabase.com</code>, port <code>6543</code>), that the password is filled in without square brackets, and that the project isn&apos;t paused. Then redeploy.</p>
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
                    No database is connected, so everything disappears when Vercel restarts the app. Set <code>DATABASE_URL</code> to your Supabase connection string and redeploy.
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
