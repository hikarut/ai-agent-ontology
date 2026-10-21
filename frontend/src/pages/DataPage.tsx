// 実データ確認ページ：RDB・オントロジーの実データと、ツインの回答を見比べる
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ClipboardText, Database, FileText, Play, ShareNetwork, TreeStructure } from '@phosphor-icons/react'
import { fetchSurvey, fetchTwinProfiles, runTwinSurvey } from '../api'
import type { Graph, Profile, SurveyRow, TwinType } from '../api'
import OntologyGraph from '../components/OntologyGraph'

// customers テーブルのカラムと、その意味
const COLUMNS: [keyof Profile, string][] = [
  ['customer_id', '顧客ID'],
  ['name', '氏名'],
  ['name_kana', '氏名のフリガナ'],
  ['gender', '性別'],
  ['age', '年齢'],
  ['prefecture', '都道府県'],
  ['city', '市区町村'],
  ['occupation', '職業'],
  ['annual_income', '年収'],
  ['household', '家族構成'],
  ['has_children', '子どもの有無（1=あり）'],
  ['hobbies', '趣味'],
  ['personal_values', '価値観'],
  ['favorite_brands', '好きなブランド'],
  ['shopping_channel', 'よく使う買い物チャネル'],
  ['monthly_spending', '世帯の月の消費額'],
]

// ツインのアンケート回答（どの顧客の回答かも一緒に持つ）
type TwinAnswers = { customerId: number } & Record<TwinType, Record<number, number>>

// 見出し付きのカード
function Card({ icon, title, description, right, children }: {
  icon: ReactNode
  title: string
  description: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

// 1〜5の回答を、5つのメモリで表示する
function Score({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-3 w-1.5 rounded-sm ${i <= value ? 'bg-slate-700' : 'bg-slate-200'}`} />
        ))}
      </span>
      <span className="font-mono text-xs text-slate-700">{value}</span>
    </span>
  )
}

// ツインの回答と、実際の回答とのズレ
function TwinScore({ value, actual }: { value: number | undefined; actual: number }) {
  if (value === undefined) return <span className="text-xs text-slate-300">—</span>
  const diff = value - actual
  const color = diff === 0 ? 'text-emerald-600' : Math.abs(diff) === 1 ? 'text-slate-400' : 'text-rose-600'
  return (
    <span className="inline-flex items-center gap-2">
      <Score value={value} />
      <span className={`font-mono text-[11px] ${color}`}>{diff === 0 ? '一致' : diff > 0 ? `+${diff}` : diff}</span>
    </span>
  )
}

export default function DataPage({ customerId, profile, graph }: { customerId: number; profile: Profile; graph: Graph }) {
  const [survey, setSurvey] = useState<SurveyRow[]>([])
  const [twinProfiles, setTwinProfiles] = useState<Record<TwinType, string> | null>(null)
  const [twinAnswers, setTwinAnswers] = useState<TwinAnswers | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  // 顧客を切り替えたら、アンケート結果とツインのプロフィールを取得し直す
  useEffect(() => {
    fetchSurvey(customerId).then(setSurvey)
    fetchTwinProfiles(customerId).then(setTwinProfiles)
    setError('')
  }, [customerId])

  // 2つのツインに同じアンケートを回答させる（Claude API を呼ぶ）
  async function handleRun() {
    setRunning(true)
    setError('')
    const [rdb, ontology] = await Promise.all([runTwinSurvey(customerId, 'rdb'), runTwinSurvey(customerId, 'ontology')])
    if (rdb && ontology) setTwinAnswers({ customerId, rdb, ontology })
    else setError('ツインの回答に失敗しました。API キーとバックエンドのログを確認してください。')
    setRunning(false)
  }

  // 表示中の顧客の回答だけを使う（別の顧客の結果が残っていたら無視する）
  const answers = twinAnswers?.customerId === customerId ? twinAnswers : null

  // ツインごとの一致数と平均のズレ（MAE）
  function summary(twinType: TwinType) {
    if (!answers) return null
    const errors = survey.map((q) => Math.abs((answers[twinType][q.question_id] ?? 3) - q.answer))
    const exact = errors.filter((e) => e === 0).length
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length
    return `一致 ${exact}/${errors.length}・MAE ${mae.toFixed(2)}`
  }

  // オントロジーのノードID → ノード
  const nodes = Object.fromEntries(graph.nodes.map((n) => [n.id, n]))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        {/* 属性（RDB の customers テーブル） */}
        <Card icon={<Database size={18} />} title="属性" description="SQLite・customers テーブルの1行">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {COLUMNS.map(([column, label]) => (
                <tr key={column}>
                  <td className="w-40 px-4 py-2 align-top">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="font-mono text-[11px] text-slate-400">{column}</p>
                  </td>
                  <td className="px-4 py-2 text-slate-900">{String(profile[column])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* アンケート結果（実際の回答とツインの回答） */}
        <Card
          icon={<ClipboardText size={18} />}
          title="アンケート結果"
          description="SQLite・survey_questions と survey_answers を結合（1=全くそう思わない 〜 5=とてもそう思う）"
          right={
            <button
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium whitespace-nowrap text-white transition-colors duration-150 hover:bg-indigo-500 disabled:opacity-50"
              onClick={handleRun}
              disabled={running}
            >
              <Play size={14} weight="fill" />
              {running ? '回答中...' : 'ツインに回答させて比較'}
            </button>
          }
        >
          {error && <p className="border-b border-slate-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-2">Q</th>
                  <th className="px-4 py-2">質問</th>
                  <th className="px-4 py-2 whitespace-nowrap">実際の回答</th>
                  <th className="px-4 py-2 whitespace-nowrap">RDB版ツイン</th>
                  <th className="px-4 py-2 whitespace-nowrap">オントロジー版ツイン</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {survey.map((q) => (
                  <tr key={q.question_id}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-400">{q.question_id}</td>
                    <td className="px-4 py-2">
                      <p className="text-slate-900">{q.question_text}</p>
                      <p className="text-xs text-slate-500">{q.category}</p>
                    </td>
                    <td className="px-4 py-2">
                      <Score value={q.answer} />
                    </td>
                    <td className="px-4 py-2">
                      <TwinScore value={answers?.rdb[q.question_id]} actual={q.answer} />
                    </td>
                    <td className="px-4 py-2">
                      <TwinScore value={answers?.ontology[q.question_id]} actual={q.answer} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {answers && (
                <tfoot>
                  <tr className="border-t border-slate-200 text-xs text-slate-600">
                    <td className="px-4 py-3" colSpan={3}>
                      精度（MAE は小さいほど良い）
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">{summary('rdb')}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">{summary('ontology')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>

      {/* オントロジー（グラフと関係の一覧） */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        <OntologyGraph graph={graph} />
        <Card
          icon={<TreeStructure size={18} />}
          title="関係の一覧"
          description="Neo4j・顧客から3ホップ以内の関係（ノード -[関係]-> ノード）"
          right={<span className="font-mono text-xs text-slate-400">{graph.edges.length} edges</span>}
        >
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {graph.edges.map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      {nodes[e.source].name}
                      <span className="ml-1.5 text-[11px] text-slate-400">{nodes[e.source].label}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-indigo-600">{e.type}</td>
                    <td className="px-4 py-2">
                      {nodes[e.target].name}
                      <span className="ml-1.5 text-[11px] text-slate-400">{nodes[e.target].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ツインに渡しているプロフィール */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card icon={<FileText size={18} />} title="RDB版ツインへの入力" description="システムプロンプトに埋め込むプロフィール">
          <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {twinProfiles?.rdb}
          </pre>
        </Card>
        <Card icon={<ShareNetwork size={18} />} title="オントロジー版ツインへの入力" description="システムプロンプトに埋め込むプロフィール">
          <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {twinProfiles?.ontology}
          </pre>
        </Card>
      </div>
    </div>
  )
}
