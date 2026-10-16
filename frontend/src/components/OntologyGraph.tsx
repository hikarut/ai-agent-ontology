// Neo4j から取得したグラフを、顧客を中心にした同心円状に描画する（ライブラリ不使用の SVG）
import type { Graph } from '../api'

// ノードの種類ごとの色
const COLORS: Record<string, string> = {
  Customer: '#2563eb',
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
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-2 text-sm font-semibold text-gray-600">オントロジー（Neo4j）上の関係</h3>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full">
        {graph.edges.map((e, i) => (
          <line key={i} x1={pos[e.source].x} y1={pos[e.source].y} x2={pos[e.target].x} y2={pos[e.target].y} stroke="#d1d5db">
            <title>{e.type}</title>
          </line>
        ))}
        {graph.nodes.map((n) => (
          <g key={n.id}>
            <circle cx={pos[n.id].x} cy={pos[n.id].y} r={n.label === 'Customer' ? 14 : 8} fill={COLORS[n.label] ?? '#9ca3af'}>
              <title>{n.label}</title>
            </circle>
            <text x={pos[n.id].x} y={pos[n.id].y - 12} textAnchor="middle" fontSize="12" fill="#374151">
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
        {Object.entries(COLORS).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
