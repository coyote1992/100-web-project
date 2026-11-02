import { NextResponse } from "next/server"
import { getEverything } from "@/lib/data"

/** Full JSON dump of everything, all verticals included, for backups or analysis elsewhere. */
export async function GET() {
  const world = await getEverything()
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...world }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="hundred-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
