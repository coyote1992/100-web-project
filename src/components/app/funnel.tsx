import type { Funnel } from "@/lib/metrics"

/** How many sites ever reached each step. Skipped steps (no reply to the question) simply don't count. */
export function FunnelChart({ data }: { data: Funnel }) {
  const max = Math.max(1, data[0]?.count ?? 1)
  return (
    <ol className="grid gap-1.5" aria-label="Funnel: sites that reached each step">
      {data.map((row, i) => {
        const pct = Math.round((row.count / max) * 100)
        return (
          <li key={row.stage} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[11rem_1fr_4.5rem]">
            <span className="truncate text-sm text-muted-foreground">{row.label}</span>
            <span className="relative h-5 overflow-hidden rounded-[5px] bg-foreground/[0.06]">
              <span
                className="absolute inset-y-0 left-0 rounded-[5px]"
                style={{
                  width: `${Math.max(row.count ? 1.5 : 0, pct)}%`,
                  background: row.stage === "won" ? "var(--st-won)" : i === 0 ? "var(--foreground)" : "var(--st-move)",
                  opacity: i === 0 ? 0.75 : 1,
                }}
              />
            </span>
            <span className="num text-right text-sm">
              <span className="font-medium">{row.count}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{pct}%</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
