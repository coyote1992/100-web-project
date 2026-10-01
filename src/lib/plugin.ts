import { GUIDE_FLOW, GUIDE_INTRO, GUIDE_RULES, GUIDE_SWEEP } from "./guide"

/**
 * The Hundred plugin package, generated for a given app URL so the MCP address is already filled in.
 * Layout follows OpenAI's plugin format: .codex-plugin/plugin.json, skills/, .mcp.json, assets/.
 * (A portable plugin.json + mcp.json are included for clients that read the Agent Plugins format.)
 */

export const PLUGIN_NAME = "hundred"
export const PLUGIN_VERSION = "1.0.0"

const json = (x: unknown) => JSON.stringify(x, null, 2) + "\n"

const interfaceBlock = {
  displayName: "Hundred",
  shortDescription: "Run your outreach tracker from a chat",
  longDescription:
    "Hundred tracks a cold-outreach experiment: firms, their email conversations, stages, tasks and templates. With this plugin you can add firms, sync your outreach mailbox, record what people reply, move sites along the flow and ask what needs you, all in plain language.",
  developerName: "You",
  category: "Productivity",
  capabilities: ["Read", "Write"],
  defaultPrompt: ["What needs me today?", "Run the mailbox sweep.", "Add these firms to Padel clubs: …", "Send the site to the firm that just replied."],
  brandColor: "#C97F14",
  composerIcon: "./assets/composer-icon.svg",
  screenshots: [] as string[],
}

const manifestCommon = (base: string) => ({
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  description: "Operate the Hundred outreach tracker: add firms, log emails, record replies, move sites along the flow, and see what needs you.",
  author: { name: "You", url: base },
  homepage: base,
  license: "UNLICENSED",
  keywords: ["outreach", "crm", "email", "websites"],
})

const skill = (name: string, description: string, title: string, body: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${title}\n\n${body}\n`

const agentYaml = (display: string, short: string, prompt: string) =>
  `interface:\n  display_name: "${display}"\n  short_description: "${short}"\n  icon_small: "./assets/composer-icon.svg"\n  default_prompt: "${prompt}"\n`

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 18" width="48" height="48">${Array.from({ length: 20 }, (_, i) => `<circle cx="${(i % 5) * 4.5 + 2}" cy="${Math.floor(i / 5) * 4.5 + 2}" r="1.55" fill="#C97F14" opacity="${i < 7 ? 1 : 0.35}"/>`).join("")}</svg>\n`

export function pluginFiles(base: string): { path: string; content: string }[] {
  const mcp = `${base}/mcp`
  const root = PLUGIN_NAME
  return [
    {
      path: `${root}/.codex-plugin/plugin.json`,
      content: json({ ...manifestCommon(base), skills: "./skills/", mcpServers: "./.mcp.json", interface: interfaceBlock }),
    },
    {
      path: `${root}/plugin.json`,
      content: json({
        $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        ...manifestCommon(base),
        extensions: { "com.openai": { interface: { ...interfaceBlock, websiteURL: base } } },
      }),
    },
    { path: `${root}/.mcp.json`, content: json({ mcpServers: { hundred: { type: "http", url: mcp } } }) },
    {
      path: `${root}/mcp.json`,
      content: json({ $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", mcpServers: { hundred: { type: "streamable-http", url: mcp } } }),
    },
    {
      path: `${root}/skills/hundred/SKILL.md`,
      content: skill(
        "hundred",
        "Operate the Hundred outreach tracker: add firms, log and send emails, move sites along the flow, answer what needs doing, edit templates and timing. Use whenever the user mentions their sites, outreach, replies, tasks or Hundred.",
        "Hundred",
        [GUIDE_INTRO, GUIDE_FLOW, GUIDE_RULES, "Call the `get_guide` tool at any time for the same guide, kept current by the server."].join("\n\n"),
      ),
    },
    {
      path: `${root}/skills/hundred/agents/openai.yaml`,
      content: agentYaml("Hundred", "Run the outreach tracker", "What needs me today in Hundred?"),
    },
    {
      path: `${root}/skills/mailbox-sweep/SKILL.md`,
      content: skill(
        "mailbox-sweep",
        "Sync the outreach Gmail inbox into Hundred: log new emails on the right sites, extract objections, questions and call times, move stages, and record the sweep. Use for the recurring 30-minute sweep or when asked to check the mailbox.",
        "Mailbox sweep",
        `${GUIDE_SWEEP}\n\nWhen the flow or stage rules are needed, read the \`hundred\` skill or call \`get_guide\`.`,
      ),
    },
    {
      path: `${root}/skills/mailbox-sweep/agents/openai.yaml`,
      content: agentYaml("Mailbox sweep", "Sync the outreach inbox into Hundred", "Run the Hundred mailbox sweep."),
    },
    { path: `${root}/assets/composer-icon.svg`, content: icon },
    {
      path: `${root}/README.md`,
      content: `# Hundred plugin

Skills and MCP connection for the Hundred outreach tracker at ${base}.

- \`.mcp.json\` points at \`${mcp}\` (OAuth: you sign in with your Hundred password).
- \`skills/hundred\` is the operating guide; \`skills/mailbox-sweep\` is the 30-minute inbox sweep.

In ChatGPT the quickest way to use Hundred is Developer mode: Settings → Security and login → Developer mode, then Plugins → + and paste \`${mcp}\`.
The server also serves the same guide through its \`get_guide\` tool, so nothing is lost without the skills.
`,
    },
  ]
}

/* ---------------------------------------------------------------- minimal ZIP (stored, no compression) */

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(files: { path: string; content: string }[]): Buffer {
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  const stamp = new Date()
  const time = (stamp.getHours() << 11) | (stamp.getMinutes() << 5) | (stamp.getSeconds() >> 1)
  const date = ((stamp.getFullYear() - 1980) << 9) | ((stamp.getMonth() + 1) << 5) | stamp.getDate()
  for (const f of files) {
    const name = Buffer.from(f.path)
    const data = Buffer.from(f.content)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    parts.push(local, name, data)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0)
    c.writeUInt16LE(20, 4)
    c.writeUInt16LE(20, 6)
    c.writeUInt16LE(0x0800, 8)
    c.writeUInt16LE(0, 10)
    c.writeUInt16LE(time, 12)
    c.writeUInt16LE(date, 14)
    c.writeUInt32LE(crc, 16)
    c.writeUInt32LE(data.length, 20)
    c.writeUInt32LE(data.length, 24)
    c.writeUInt16LE(name.length, 28)
    c.writeUInt32LE(offset, 42)
    central.push(c, name)
    offset += local.length + name.length + data.length
  }
  const dir = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(dir.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, dir, end])
}
