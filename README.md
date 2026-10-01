# Hundred

A project-management view of the speculative website experiment: 5 verticals, 20 firms each. **ChatGPT does the admin** (adds firms, syncs the Gmail inbox, pulls out what people say, moves sites along). **This app is where you see it all**, and where you tick, copy and write lessons.

## How it fits together

```
You, in a ChatGPT chat or Work session
        │  pick the Hundred plugin, type what you want
        ▼
  Hundred plugin  ── MCP over HTTPS, OAuth sign-in ──►  /mcp  (this app)  ⇄  Supabase (Postgres)
        ▲
Gmail (outreach inbox), read by ChatGPT during the 30-minute sweep
```

- **Verticals** (you): name, plus the two reference sites, pasted by hand.
- **Sites** (the plugin adds them): one page per firm. Each page has the email conversation (read-only), what ChatGPT extracted from it (call time, objections, questions, interest), the next step, a **copy-ready build prompt** for Claude Code, and a place for your lessons.
- **Tasks**: next steps appear on their own from each site's stage and the clock. Tick one and the site moves on. You can add your own tasks too.
- **Templates**: the build prompt, the send-the-site email, the call-scheduling email, and the two timing values. The plugin reads them when it drafts an email.
- **Insights**: funnel, reply and positive rates with the sample size next to them, does asking first help, reply timing, pace, by vertical, by opening question, where sites are lost, and what people objected to.

## The plugin

Hundred exposes an **MCP server at `/mcp`** (Streamable HTTP) with 20 tools: add firms, list/get/update/delete sites, log emails, record extracted notes, tasks, verticals, templates, overview, mailbox-sync stamp, and `get_guide` (the operating manual). Anything you can do in the UI the plugin can do, plus the parts only ChatGPT can do (reading Gmail).

**Sign-in** is OAuth 2.1 (authorization code + PKCE, dynamic client registration, refresh tokens), built into the app: `/.well-known/oauth-*`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`. You approve ChatGPT once with `APP_PASSWORD`. Changing `API_TOKEN` signs everything out.

**Connect it** (also shown in Settings → Connect ChatGPT):
1. Set `APP_PASSWORD` and `API_TOKEN` on the server.
2. ChatGPT → Settings → Security and login → Developer mode on.
3. Plugins → + → paste `https://<your-app>/mcp`, choose OAuth, sign in.
4. Install it from your personal plugins, then pick it in any chat or Work session and ask.
5. Add a recurring ChatGPT task: "Using Hundred, run the mailbox sweep" every 30 minutes.

Settings also offers a **plugin package (.zip)**: `.codex-plugin/plugin.json`, `.mcp.json`, and two skills (`hundred`, `mailbox-sweep`) in OpenAI's plugin layout, with your `/mcp` address filled in. ChatGPT itself only needs the address; the package is for Codex and for publishing later. A REST API (`/api/v1`, bearer `API_TOKEN`, OpenAPI at `/api/v1/openapi.json`) exposes the same operations for scripts.

## The flow

`new → question sent → (replied) → site sent → (replied → positive) → scheduling a call → call scheduled → called → proposal → paid`, with *closed* possible anywhere. If the question stays quiet for `siteFollowUpDays` (4) the site goes out anyway. If the site stays quiet for `callAfterSiteDays` (3), a call task appears.

## Run it

```bash
npm install
npm run db:seed     # optional: fictional demo data (or "Load demo data" in Settings)
npm run dev
```

Without Supabase keys it runs on a local Postgres in `./data/pglite`, with the same SQL.

## Deploy (Vercel + Supabase)

The app talks to Supabase over HTTPS (its REST API), not a direct database connection, so there is no connection pool to run out of or freeze.

1. **Supabase → SQL Editor → New query:** paste the contents of `supabase/setup.sql` (also in Settings → Database, and shown by the app if it's missing) and run it once. It creates the tables, locks them with row-level security, and adds the `hundred_exec` function that only the service key can call.
2. **Vercel → Settings → Environment Variables** (Production, Secret):
   - `SUPABASE_URL`: your project URL, `https://xxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role (or secret) key. It bypasses all security, so it must never reach the browser.
   - `APP_PASSWORD`: protects the app and approves the plugin sign-in.
   - `API_TOKEN`: any long random string; signs the plugin's access tokens.
3. Redeploy, open `/api/health` (it checks each step), then follow **Settings → Connect ChatGPT**.

`vercel.json` pins functions to Paris (`cdg1`), next to a Supabase project in eu-west-3. Change it if yours is elsewhere.

After changing `src/db/schema.ts` run `npm run db:generate`, then run the new `supabase/setup.sql` again in Supabase.

## Where things live

| | |
|---|---|
| `src/lib/flow.ts` | Stages, the actions from each stage, and the next-step rules |
| `src/lib/metrics.ts` | Every number on the dashboards |
| `src/lib/domain.ts` | All writes, shared by the UI and the API |
| `src/lib/tools.ts` | The plugin's MCP tools |
| `src/app/mcp/route.ts` | The MCP endpoint (JSON-RPC over HTTP) |
| `src/lib/oauth.ts`, `src/app/oauth/*` | OAuth sign-in for the plugin |
| `src/lib/guide.ts` | The operating guide the assistant reads |
| `src/lib/plugin.ts` | The plugin package generator |
| `src/lib/chatgpt.ts` | OpenAPI schema for the REST API |
| `src/db/schema.ts` | Tables. After changing them run `npm run db:generate` |
| `supabase/setup.sql` | One-time database setup (generated) |
