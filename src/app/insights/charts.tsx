"use client"

import { Bar, BarChart, CartesianGrid, LabelList, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

type Week = { label: string; hours: number; positives: number; sent: number }

const weekConfig = {
  hours: { label: "Spec hours", color: "var(--viz-hours)" },
  positives: { label: "Positive responses", color: "var(--viz-pos)" },
  sent: { label: "Sites sent", color: "var(--viz-hours)" },
} satisfies ChartConfig

function WeekBars({ data, dataKey, title, total }: { data: Week[]; dataKey: "hours" | "positives" | "sent"; title: string; total: string }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="num text-sm text-muted-foreground">{total}</span>
      </figcaption>
      <ChartContainer config={weekConfig} className="aspect-auto h-44 w-full">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={4}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={28} />
          <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent />} />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

export function WeeklyCharts({ data }: { data: Week[] }) {
  const sum = (k: keyof Week) => data.reduce((a, d) => a + (d[k] as number), 0)
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <WeekBars data={data} dataKey="hours" title="Speculative hours" total={`${Math.round(sum("hours"))}h`} />
      <WeekBars data={data} dataKey="sent" title="Sites sent" total={String(sum("sent"))} />
      <WeekBars data={data} dataKey="positives" title="Positive responses" total={String(sum("positives"))} />
    </div>
  )
}

const batchConfig = { rate: { label: "Positive rate", color: "var(--viz-pos)" } } satisfies ChartConfig

/** Does sending more at once change the hit rate? One dot per batch. */
export function BatchScatter({ data }: { data: { name: string; size: number; rate: number; pph: number }[] }) {
  return (
    <ChartContainer config={batchConfig} className="aspect-auto h-64 w-full">
      <ScatterChart margin={{ top: 16, right: 24, left: -8, bottom: 8 }}>
        <CartesianGrid stroke="var(--border)" />
        <XAxis
          type="number"
          dataKey="size"
          name="Batch size"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          allowDecimals={false}
          domain={[0, "dataMax + 2"]}
          label={{ value: "Batch size (sites)", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="number"
          dataKey="rate"
          name="Positive rate"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          width={48}
        />
        <ZAxis range={[150, 150]} />
        <ChartTooltip
          cursor={false}
          content={({ payload }) => {
            const p = payload?.[0]?.payload as { name: string; size: number; rate: number; pph: number } | undefined
            if (!p) return null
            return (
              <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <p className="font-medium">{p.name}</p>
                <p className="num text-muted-foreground">
                  {p.size} sites · {Math.round(p.rate * 100)}% positive · {p.pph.toFixed(2)}/h
                </p>
              </div>
            )
          }}
        />
        <Scatter data={data} fill="var(--color-rate)" stroke="var(--surface)" strokeWidth={2}>
          <LabelList dataKey="name" position="top" offset={10} fontSize={11} fill="var(--muted-foreground)" />
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  )
}

const pphConfig = { pph: { label: "Positive / hour", color: "var(--viz-pos)" } } satisfies ChartConfig

export function PphBars({ data }: { data: { name: string; pph: number }[] }) {
  return (
    <ChartContainer config={pphConfig} className="aspect-auto w-full" style={{ height: 40 + data.length * 36 }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={8}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} fontSize={12} />
        <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideLabel={false} />} />
        <Bar dataKey="pph" fill="var(--color-pph)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="pph" position="right" fontSize={12} formatter={(v: unknown) => Number(v).toFixed(2)} className="fill-foreground" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
