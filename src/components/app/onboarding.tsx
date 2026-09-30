"use client"

import Link from "next/link"
import { useTransition } from "react"
import { loadDemoData } from "@/app/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Logo } from "./sidebar"

export function Onboarding() {
  const [pending, start] = useTransition()
  return (
    <div className="paper-grid grid min-h-[70dvh] place-items-center rounded-2xl border px-6 py-16">
      <div className="max-w-lg text-center">
        <Logo className="mx-auto size-10 text-foreground" />
        <h1 className="display mt-6 text-5xl leading-none">A hundred sites, one ledger.</h1>
        <ol className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1. Create your verticals</span> and paste each one&rsquo;s two reference sites.
          </li>
          <li>
            <span className="font-medium text-foreground">2. Connect ChatGPT</span> in Settings. It adds the firms, syncs your mailbox and records what people reply.
          </li>
          <li>
            <span className="font-medium text-foreground">3. Follow the tasks.</span> Each site page has its build prompt ready to copy into Claude Code.
          </li>
        </ol>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/verticals" className={buttonVariants({ size: "lg" })}>
            Create verticals
          </Link>
          <Link href="/settings" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Connect ChatGPT
          </Link>
          <Button size="lg" variant="ghost" disabled={pending} onClick={() => start(() => void loadDemoData())}>
            {pending ? "Loading…" : "Explore with demo data"}
          </Button>
        </div>
      </div>
    </div>
  )
}
