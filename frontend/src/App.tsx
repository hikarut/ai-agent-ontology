import { useEffect, useState } from 'react'
import { fetchCustomer, fetchCustomers, sendChat } from './api'
import type { CustomerSummary, Graph, Message, Profile, TwinType } from './api'
import ChatPanel from './components/ChatPanel'
import OntologyGraph from './components/OntologyGraph'
import ProfileCard from './components/ProfileCard'

export default function App() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [customerId, setCustomerId] = useState(1)
  const [detail, setDetail] = useState<{ profile: Profile; graph: Graph } | null>(null)
  // ツインごとの会話履歴
  const [messages, setMessages] = useState<Record<TwinType, Message[]>>({ rdb: [], ontology: [] })
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')

  // 起動時に顧客一覧を取得
  useEffect(() => {
    fetchCustomers().then(setCustomers)
  }, [])

  // 顧客を切り替えたら詳細を取得し、会話をリセット
  useEffect(() => {
    fetchCustomer(customerId).then(setDetail)
    setMessages({ rdb: [], ontology: [] })
  }, [customerId])

  // 同じ質問を2つのツインに同時に送る
  async function handleSend() {
    if (!input.trim() || loading) return
    const userMessage: Message = { role: 'user', content: input }
    const histories = { rdb: [...messages.rdb, userMessage], ontology: [...messages.ontology, userMessage] }
    setMessages(histories)
    setInput('')
    setLoading(true)
    const [rdbReply, ontologyReply] = await Promise.all([
      sendChat(customerId, 'rdb', histories.rdb),
      sendChat(customerId, 'ontology', histories.ontology),
    ])
    setMessages({
      rdb: [...histories.rdb, { role: 'assistant', content: rdbReply }],
      ontology: [...histories.ontology, { role: 'assistant', content: ontologyReply }],
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-4 flex items-center gap-4">
        <h1 className="text-xl font-bold">カスタマーデジタルツイン</h1>
        <select
          className="rounded border bg-white px-2 py-1"
          value={customerId}
          onChange={(e) => setCustomerId(Number(e.target.value))}
        >
          {customers.map((c) => (
            <option key={c.customer_id} value={c.customer_id}>
              #{c.customer_id} {c.name}（{c.gender}・{c.age}歳・{c.prefecture}）
            </option>
          ))}
        </select>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        {/* 左: 顧客の趣味嗜好とオントロジー */}
        <div className="space-y-4">
          {detail && <ProfileCard profile={detail.profile} />}
          {detail && <OntologyGraph graph={detail.graph} />}
        </div>

        {/* 右: 2種類のツインとの対話 */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChatPanel title="RDB版ツイン" description="SQLite の顧客レコードをそのまま参照" messages={messages.rdb} loading={loading} />
            <ChatPanel title="オントロジー版ツイン" description="Neo4j の関係グラフをたどって参照" messages={messages.ontology} loading={loading} />
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              placeholder="例: 休日はどう過ごしていますか？ / この新商品を買いたいと思いますか？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            />
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={handleSend} disabled={loading}>
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
