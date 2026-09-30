import { cn } from "@/lib/utils"

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-8 sm:pt-10", className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="display text-4xl leading-[1.05] text-balance sm:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: React.ReactNode
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.95rem] font-semibold tracking-tight">{title}</h2>
        {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-surface shadow-[0_1px_2px_oklch(0.3_0.02_60/0.04),0_4px_16px_-8px_oklch(0.3_0.02_60/0.08)]", className)}>
      {children}
    </div>
  )
}

/** A horizontal ledger of figures, separated by hairlines rather than boxed into cards. */
export function Ledger({ items, className }: { items: { label: string; value: React.ReactNode; hint?: string }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:flex lg:divide-x", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0 lg:flex-1 lg:px-5 lg:first:pl-0 lg:last:pr-0" title={it.hint}>
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className="num mt-1 text-xl font-medium tracking-tight">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
