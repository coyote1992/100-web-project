"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { CommandMenu } from "./command-menu"

export type Lookup = {
  verticals: { id: string; name: string; hue: number }[]
  sites: { id: string; name: string; verticalId: string; city: string; status: string }[]
}

type UI = { openCommand: () => void }
const UIContext = React.createContext<UI | null>(null)

export function useUI() {
  const ctx = React.useContext(UIContext)
  if (!ctx) throw new Error("useUI outside provider")
  return ctx
}

export function Providers({ children, lookup }: { children: React.ReactNode; lookup: Lookup }) {
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const ui = React.useMemo<UI>(() => ({ openCommand: () => setCmdOpen(true) }), [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delay={250}>
        <UIContext.Provider value={ui}>
          {children}
          <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} lookup={lookup} />
          <Toaster position="bottom-right" />
        </UIContext.Provider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
