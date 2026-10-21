import { useEffect, useState } from 'react'
import { Database, PaperPlaneRight, ShareNetwork } from '@phosphor-icons/react'
import { fetchCustomer, fetchCustomers, sendChat } from './api'
import type { CustomerSummary, Graph, Message, Profile, TwinType } from './api'
import ChatPanel from './components/ChatPanel'
import OntologyGraph from './components/OntologyGraph'
import ProfileCard from './components/ProfileCard'
import Sidebar from './components/Sidebar'

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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* 左: サイドメニュー（顧客の選択） */}
      <Sidebar customers={customers} selectedId={customerId} onSelect={setCustomerId} />

      {/* 右: メイン画面 */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-slate-200 bg-white/80 px-8 backdrop-blur">
          <div>
            <p className="text-xs text-slate-500">
              Customers / <span className="font-mono">#{customerId}</span>
            </p>
            <h1 className="text-base font-semibold tracking-tight">{detail?.profile.name ?? '読み込み中...'}</h1>
          </div>
        </header>

        <div className="space-y-6 p-8">
          {/* 顧客の趣味嗜好 */}
          {detail && <ProfileCard profile={detail.profile} />}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
            {/* オントロジー */}
            {detail && <OntologyGraph graph={detail.graph} />}

            {/* 2種類のツインとの対話 */}
            <section className="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="grid flex-1 grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
                <ChatPanel
                  title="RDB版ツイン"
                  description="SQLite の顧客レコードをそのまま参照"
                  icon={<Database size={18} />}
                  messages={messages.rdb}
                  loading={loading}
                />
                <ChatPanel
                  title="オントロジー版ツイン"
                  description="Neo4j の関係グラフをたどって参照"
                  icon={<ShareNetwork size={18} />}
                  messages={messages.ontology}
                  loading={loading}
                />
              </div>
              {/* 入力欄（同じ質問を両方のツインに送る） */}
              <div className="border-t border-slate-200 p-4">
                <div className="flex items-center gap-2 rounded-lg bg-white p-1.5 ring-1 ring-slate-200 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-indigo-500">
                  <input
                    className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
                    placeholder="例: 休日はどう過ごしていますか？ / この新商品を買いたいと思いますか？"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                  />
                  <button
                    className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-500 disabled:opacity-50"
                    onClick={handleSend}
                    disabled={loading}
                  >
                    <PaperPlaneRight size={16} weight="fill" />
                    送信
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
