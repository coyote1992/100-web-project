"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const config = {
  count: { label: "Replies", color: "var(--viz-hours)" },
  sent: { label: "Sent", color: "var(--viz-hours)" },
  replied: { label: "Answered", color: "var(--viz-pos)" },
  questions: { label: "Questions sent", color: "var(--viz-hours)" },
  sites: { label: "Sites sent", color: "var(--viz-hours)" },
  positives: { label: "Positive", color: "var(--viz-pos)" },
} satisfies ChartConfig

function Bars({ data, dataKey, title, total, note }: { data: Record<string, string | number>[]; dataKey: keyof typeof config; title: string; total?: string; note?: string }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          {total && <span className="num text-sm text-muted-foreground">{total}</span>}
        </span>
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </figcaption>
      <ChartContainer config={config} className="aspect-auto h-44 w-full">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={28} />
          <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent />} />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

export function WeeklyCharts({ data }: { data: { label: string; questions: number; sites: number; positives: number }[] }) {
  const sum = (k: "questions" | "sites" | "positives") => String(data.reduce((a, d) => a + d[k], 0))
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <Bars data={data} dataKey="questions" title="Questions sent" total={sum("questions")} />
      <Bars data={data} dataKey="sites" title="Sites sent" total={sum("sites")} />
      <Bars data={data} dataKey="positives" title="Positive replies" total={sum("positives")} />
    </div>
  )
}

export function DelayChart({ data }: { data: { label: string; count: number }[] }) {
  return <Bars data={data} dataKey="count" title="How long replies take" note="From the email going out to the answer arriving" />
}

export function WeekdayChart({ data }: { data: { label: string; sent: number; replied: number }[] }) {
  return <Bars data={data.map((d) => ({ label: d.label, replied: d.replied }))} dataKey="replied" title="Answered questions by weekday sent" note={`Out of ${data.reduce((a, d) => a + d.sent, 0)} sent`} />
}
