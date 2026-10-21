// Neo4j から取得したグラフを、顧客を中心にした同心円状に描画する（ライブラリ不使用の SVG）
import { Graph as GraphIcon } from '@phosphor-icons/react'
import type { Graph } from '../api'

// ノードの種類ごとの色
const COLORS: Record<string, string> = {
  Customer: '#6366f1',
  Hobby: '#16a34a',
  HobbyCategory: '#86efac',
  Brand: '#ea580c',
  ProductCategory: '#fdba74',
  Value: '#9333ea',
  City: '#0891b2',
  Prefecture: '#67e8f9',
  Region: '#a5f3fc',
  AreaType: '#a5f3fc',
}
const SIZE = 440
const CENTER = SIZE / 2

export default function OntologyGraph({ graph }: { graph: Graph }) {
  // 顧客ノードから何ホップ目か（depth）を幅優先探索で求める
  const depth: Record<string, number> = {}
  const start = graph.nodes.find((n) => n.label === 'Customer')!
  depth[start.id] = 0
  const queue = [start.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const e of graph.edges) {
      if (e.source === current && depth[e.target] === undefined) {
        depth[e.target] = depth[current] + 1
        queue.push(e.target)
      }
    }
  }

  // depth ごとに円周上へ等間隔に配置する
  const pos: Record<string, { x: number; y: number }> = {}
  for (const d of [0, 1, 2, 3]) {
    const ring = graph.nodes.filter((n) => depth[n.id] === d)
    ring.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ring.length + d * 0.4
      const radius = d * 65
      pos[n.id] = { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) }
    })
  }

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <GraphIcon size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">オントロジー</h3>
          <p className="text-xs text-slate-500">Neo4j 上の関係（顧客から3ホップ）</p>
        </div>
        <span className="font-mono text-xs text-slate-400">{graph.nodes.length} nodes</span>
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full p-2">
        {/* 円の補助線 */}
        {[1, 2, 3].map((d) => (
          <circle key={d} cx={CENTER} cy={CENTER} r={d * 65} fill="none" stroke="#f1f5f9" />
        ))}
        {graph.edges.map((e, i) => (
          <line key={i} x1={pos[e.source].x} y1={pos[e.source].y} x2={pos[e.target].x} y2={pos[e.target].y} stroke="#e2e8f0">
            <title>{e.type}</title>
          </line>
        ))}
        {graph.nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={pos[n.id].x}
              cy={pos[n.id].y}
              r={n.label === 'Customer' ? 14 : 7}
              fill={COLORS[n.label] ?? '#94a3b8'}
              stroke="#fff"
              strokeWidth="2"
            >
              <title>{n.label}</title>
            </circle>
            <text x={pos[n.id].x} y={pos[n.id].y - 12} textAnchor="middle" fontSize="12" fill="#334155">
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
        {Object.entries(COLORS).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
