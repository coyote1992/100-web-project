import { EDGES, NODES, NODE_KEYS, type NodeKey } from "@/lib/flow"
import { cn } from "@/lib/utils"

const COL_W = 164
const NODE_W = 132
const NODE_H = 32
const ROW_H = 44
const PAD_X = 28
const PAD_Y = 14

const pos = (k: NodeKey) => {
  const n = NODES[k]
  return { x: PAD_X + n.col * COL_W, y: PAD_Y + n.row * ROW_H }
}

type Props =
  | { mode: "totals"; nodes: Record<NodeKey, number>; edges: Map<string, number>; className?: string }
  | { mode: "path"; path: NodeKey[]; className?: string }

/**
 * The outreach flow drawn the way it lives on the whiteboard:
 * amber boxes are things you do, violet is the paid client.
 */
export function FlowBoard(props: Props) {
  const width = PAD_X * 2 + 6 * COL_W + NODE_W
  const height = PAD_Y * 2 + 4 * ROW_H + NODE_H + 8

  const reached = props.mode === "path" ? new Set(props.path) : null
  const walked =
    props.mode === "path" ? new Set(props.path.slice(1).map((n, i) => `${props.path[i]}>${n}`)) : null
  const current = props.mode === "path" ? props.path.at(-1) : undefined
  const maxEdge = props.mode === "totals" ? Math.max(1, ...props.edges.values()) : 1

  return (
    <div className={cn("overflow-x-auto", props.className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[860px] text-foreground"
        role="img"
        aria-label="Outreach flow: send question, send site, call, proposal, paid client"
      >
        <defs>
          <marker id="flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor" className="text-foreground/35" />
          </marker>
        </defs>

        {/* entry arrow */}
        <path
          d={`M4 ${pos("question_sent").y + NODE_H / 2} H ${PAD_X - 4}`}
          stroke="currentColor"
          className="text-foreground/35"
          strokeWidth={1.25}
          markerEnd="url(#flow-arrow)"
        />

        {EDGES.map(([a, b]) => {
          const pa = pos(a)
          const pb = pos(b)
          const x1 = pa.x + NODE_W
          const y1 = pa.y + NODE_H / 2
          const x2 = pb.x - 3
          const y2 = pb.y + NODE_H / 2
          const mx = (x1 + x2) / 2
          const key = `${a}>${b}`
          let w = 1.25
          let tone = "text-foreground/30"
          if (props.mode === "totals") {
            const c = props.edges.get(key) ?? 0
            w = c ? 1.25 + (c / maxEdge) * 7 : 1
            tone = c ? "text-foreground/22" : "text-foreground/12"
          } else if (walked?.has(key)) {
            w = 2.25
            tone = "text-foreground/70"
          } else {
            tone = "text-foreground/14"
          }
          return (
            <g key={key}>
              <path
                d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={w}
                strokeLinecap="round"
                className={tone}
                markerEnd="url(#flow-arrow)"
              />
            </g>
          )
        })}

        {NODE_KEYS.map((k) => {
          const n = NODES[k]
          const { x, y } = pos(k)
          const count = props.mode === "totals" ? props.nodes[k] : null
          const on = props.mode === "totals" ? (count ?? 0) > 0 : reached!.has(k)
          const isCurrent = k === current
          const fill =
            n.kind === "action" ? "var(--move-soft)" : n.kind === "won" ? "var(--won-soft)" : "var(--surface)"
          const stroke =
            n.kind === "action" ? "var(--move-line)" : n.kind === "won" ? "var(--won-line)" : "var(--border)"
          return (
            <g key={k} opacity={on ? 1 : props.mode === "path" ? 0.4 : 0.55}>
              {isCurrent && (
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx={9}
                  fill="none"
                  stroke="var(--st-move)"
                  strokeWidth={2}
                />
              )}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={n.kind === "won" ? 1.5 : 1}
                style={{ filter: "drop-shadow(0 1px 1px oklch(0 0 0 / 0.05))" }}
              />
              <text x={x + 10} y={y + NODE_H / 2 + 4} fontSize={12} fill="currentColor" className="font-sans">
                {n.label}
              </text>
              {count !== null && (
                <text
                  x={x + NODE_W - 10}
                  y={y + NODE_H / 2 + 4}
                  fontSize={12.5}
                  textAnchor="end"
                  fill="currentColor"
                  className="num font-sans font-semibold"
                >
                  {count}
                </text>
              )}
              {props.mode === "path" && on && !isCurrent && n.kind !== "won" && (
                <circle cx={x + NODE_W - 12} cy={y + NODE_H / 2} r={3} fill="currentColor" className="text-foreground/50" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
