import { ChartLineIcon, InboxIcon, LayersIcon, LayoutGridIcon, LightbulbIcon, PackageIcon, Settings2Icon, TableIcon } from "lucide-react"

export const NAV = [
  { href: "/", label: "Overview", icon: LayoutGridIcon },
  { href: "/sites", label: "Sites", icon: TableIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/insights", label: "Insights", icon: ChartLineIcon },
  { href: "/lessons", label: "Lessons", icon: LightbulbIcon },
  { href: "/verticals", label: "Verticals", icon: LayersIcon },
  { href: "/batches", label: "Batches", icon: PackageIcon },
  { href: "/settings", label: "Settings", icon: Settings2Icon },
] as const
