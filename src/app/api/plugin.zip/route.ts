import { origin } from "@/lib/oauth"
import { pluginFiles, zip } from "@/lib/plugin"

/** The plugin package with this app's /mcp address filled in. Behind the app password like the rest of the UI. */
export function GET(req: Request) {
  const body = zip(pluginFiles(origin(req)))
  return new Response(new Uint8Array(body), {
    headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="hundred-plugin.zip"', "cache-control": "no-store" },
  })
}
