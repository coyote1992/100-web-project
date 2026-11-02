# Hundred

A project-management view of the speculative website experiment, now focused on **tennis clubs only**. **ChatGPT does the admin** (adds clubs, syncs the Gmail inbox, pulls out what people say, moves clubs along). **This app is where you see it all**: one dashboard, the club pages, templates and settings.

## How it fits together

```
You, in a ChatGPT chat or Work session
        │  pick the Hundred plugin, type what you want
        ▼
  Hundred plugin  ── MCP over HTTPS, OAuth sign-in ──►  /mcp  (this app)  ⇄  Supabase (Postgres)
        ▲
Gmail (outreach inbox), read by ChatGPT during the 30-minute sweep
```

- **Dashboard**: a ring chart on top (one ring per stage: Question sent, Response received, Site sent, Site reply, Call scheduled, Order received; tap a stage to filter), then every club grouped by stage. Stage headings open and close their group. Each row has the stage circle (tap to move the club), the club and its city, the phone number with whose it is (a person and their role, or reception), the call result (tap to step through not called, successfully called, unsuccessfully called, got callback) and a message icon while a reply is unopened.
- **Club pages** (the plugin adds clubs): one timeline of stage changes and emails (read-only), your lessons, and a side column with the stage, the call result with time and notes, and the details (contact, role, phone, whose number, email, website, city), all editable in place. The current and the new site are linked at the top. Opening the page clears its unread mark.
- **Templates**: the one **build prompt** for Claude Code (copy it and name the club; Claude Code looks the club up through the connector), the two tennis reference sites and reference zips it uses, the send-the-site email and the call-scheduling email. The plugin reads them when it drafts an email.
- Clubs from other verticals stay in the database but are hidden everywhere, the plugin included. Settings → Export still includes them.

## The plugin

Hundred exposes an **MCP server at `/mcp`** (Streamable HTTP) with tools to add clubs, list/get/update/delete them (stage, call outcome), log emails, record extracted notes, tasks, the reference sites, templates, zips, overview, mailbox-sync stamp, and `get_guide` (the operating manual). Anything you can do in the UI the plugin can do, plus the parts only ChatGPT can do (reading Gmail).

**Sign-in** is OAuth 2.1 (authorization code + PKCE, dynamic client registration, refresh tokens), built into the app: `/.well-known/oauth-*`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`. You approve ChatGPT once with `APP_PASSWORD`. Changing `API_TOKEN` signs everything out.

**Connect it** (also shown in Settings → Connect ChatGPT):
1. Set `APP_PASSWORD` and `API_TOKEN` on the server.
2. ChatGPT → Settings → Security and login → Developer mode on.
3. Plugins → + → paste `https://<your-app>/mcp`, choose OAuth, sign in.
4. Install it from your personal plugins, then pick it in any chat or Work session and ask.
5. Add a recurring ChatGPT task: "Using Hundred, run the mailbox sweep" every 30 minutes.

**Claude Code** uses the same address: `claude mcp add --transport http --scope user hundred https://<your-app>/mcp`, then `/mcp` → hundred → Authenticate (or add `--header "Authorization: Bearer <API_TOKEN>"` to skip the browser sign-in). Settings → Connect Claude Code has the command with your address filled in.

Settings also offers a **plugin package (.zip)**: `.codex-plugin/plugin.json`, `.mcp.json`, and two skills (`hundred`, `mailbox-sweep`) in OpenAI's plugin layout, with your `/mcp` address filled in. ChatGPT itself only needs the address; the package is for Codex and for publishing later. A REST API (`/api/v1`, bearer `API_TOKEN`, OpenAPI at `/api/v1/openapi.json`) exposes the same operations for scripts.

## The flow

`new → question sent → (replied) → site sent → (replied → positive) → scheduling a call → call scheduled → called → proposal → paid`, with *closed* possible anywhere. If the question stays quiet for `siteFollowUpDays` (4) the site goes out anyway. If the site stays quiet for `callAfterSiteDays` (3), it's time to call. The dashboard folds these into its six stages.

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
   - `APP_PASSWORD`: approves the ChatGPT / Claude sign-in. The app itself has no password: anyone with its address can open it.
   - `API_TOKEN`: any long random string; signs the plugin's access tokens.
3. Redeploy, open `/api/health` (it checks each step), then follow **Settings → Connect ChatGPT**.

`vercel.json` pins functions to Paris (`cdg1`), next to a Supabase project in eu-west-3. Change it if yours is elsewhere.

After changing `src/db/schema.ts` run `npm run db:generate`. New columns on an existing Supabase database are added by the app itself on the first request after a deploy (the `UPGRADES` list in `src/db/index.ts`); add them there too. Fresh databases get them from `supabase/setup.sql`.

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
