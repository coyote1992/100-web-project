import { ChartLineIcon, CheckSquareIcon, FileTextIcon, LayersIcon, LayoutGridIcon, Settings2Icon, TableIcon } from "lucide-react"

export const NAV = [
  { href: "/", label: "Overview", icon: LayoutGridIcon },
  { href: "/tasks", label: "Tasks", icon: CheckSquareIcon },
  { href: "/sites", label: "Sites", icon: TableIcon },
  { href: "/verticals", label: "Verticals", icon: LayersIcon },
  { href: "/insights", label: "Insights", icon: ChartLineIcon },
  { href: "/templates", label: "Templates", icon: FileTextIcon },
  { href: "/settings", label: "Settings", icon: Settings2Icon },
] as const
