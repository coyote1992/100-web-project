import { route } from "@/lib/api"
import { getWorld } from "@/lib/data"

export const GET = route(async () => {
  const world = await getWorld()
  return {
    verticals: world.verticals.map((v) => ({
      id: v.id,
      name: v.name,
      target: v.target,
      referenceSites: [v.reference1, v.reference2].filter(Boolean),
      sites: world.sites.filter((s) => s.verticalId === v.id).length,
    })),
  }
})
