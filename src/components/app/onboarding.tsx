"use client"

import Link from "next/link"
import { useTransition } from "react"
import { toast } from "sonner"
import { createVertical, loadDemoData } from "@/app/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Logo } from "./top-bar"

/** Shown while the database is empty. */
export function Onboarding({ hasVertical }: { hasVertical: boolean }) {
  const [pending, start] = useTransition()
  return (
    <div className="paper-grid grid min-h-[70dvh] place-items-center rounded-2xl border px-6 py-16">
      <div className="max-w-lg text-center">
        <Logo className="mx-auto size-10 text-foreground" />
        <h1 className="display mt-6 text-5xl leading-none">Twenty tennis clubs, one board.</h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-muted-foreground">
          Connect ChatGPT in Settings. It adds the clubs, syncs your mailbox and moves each club through the stages here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {!hasVertical && (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createVertical("Tennis clubs")
                  if (!res.ok) toast.error(res.error)
                })
              }
            >
              Start with tennis
            </Button>
          )}
          <Link href="/settings" className={buttonVariants({ size: "lg", variant: hasVertical ? "default" : "outline" })}>
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
