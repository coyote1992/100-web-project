import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { Providers } from "@/components/app/providers"
import { Sidebar } from "@/components/app/sidebar"
import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin", "latin-ext"], weight: "400" })

export const metadata: Metadata = {
  title: { default: "Hundred", template: "%s · Hundred" },
  description: "Track 100 speculative website builds from first scout to paid client.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const world = await getWorld()
  const rows = buildRows(world)
  const running = world.workLogs.find((w) => !w.endedAt)
  const runningSite = running?.prospectId ? world.prospects.find((p) => p.id === running.prospectId) : undefined
  const unrated = world.messages.filter((m) => m.direction === "in" && m.rating === null).length

  const lookup = {
    verticals: world.verticals.map((v) => ({ id: v.id, name: v.name, hue: v.hue })),
    batches: world.batches.map((b) => ({ id: b.id, name: b.name })),
    sites: rows.map((r) => ({ id: r.id, name: r.name, verticalId: r.verticalId, city: r.city, status: r.status, stage: r.stage })),
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers lookup={lookup}>
          <div className="flex min-h-dvh flex-col lg:flex-row">
            <Sidebar
              timer={
                running
                  ? {
                      id: running.id,
                      startedAt: running.startedAt.getTime(),
                      minutes: running.minutes,
                      kind: running.kind,
                      prospectId: running.prospectId,
                      prospectName: runningSite?.name ?? null,
                    }
                  : null
              }
              badges={{ "/inbox": unrated }}
              progress={world.verticals.map((v) => ({
                name: v.name,
                hue: v.hue,
                target: v.target,
                count: rows.filter((r) => r.verticalId === v.id).length,
              }))}
            />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
