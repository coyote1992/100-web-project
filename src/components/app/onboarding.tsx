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
      <div className="max-w-md text-center">
        <Logo className="mx-auto size-10 text-foreground" />
        <h1 className="display mt-6 text-5xl leading-none">A hundred sites, one ledger.</h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          Pick five verticals, add firms as you start on them, and record each step of the outreach flow in a click.
          Hours, replies and lessons roll up into the numbers that tell you what works.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/verticals" className={buttonVariants({ size: "lg" })}>
            Set up my verticals
          </Link>
          <Button size="lg" variant="outline" disabled={pending} onClick={() => start(() => loadDemoData())}>
            {pending ? "Loading…" : "Explore with demo data"}
          </Button>
        </div>
      </div>
    </div>
  )
}
