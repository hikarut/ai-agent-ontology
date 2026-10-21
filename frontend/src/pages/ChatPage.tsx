// ツインと対話ページ：同じ質問を2種類のツインに送って、返答を見比べる
import { useEffect, useState } from 'react'
import { Database, PaperPlaneRight, ShareNetwork } from '@phosphor-icons/react'
import { sendChat } from '../api'
import type { Graph, Message, Profile, TwinType } from '../api'
import ChatPanel from '../components/ChatPanel'
import OntologyGraph from '../components/OntologyGraph'
import ProfileCard from '../components/ProfileCard'

export default function ChatPage({ customerId, profile, graph }: { customerId: number; profile: Profile; graph: Graph }) {
  // ツインごとの会話履歴
  const [messages, setMessages] = useState<Record<TwinType, Message[]>>({ rdb: [], ontology: [] })
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')

  // 顧客を切り替えたら会話をリセット
  useEffect(() => {
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
    <div className="space-y-6">
      {/* 顧客の趣味嗜好 */}
      <ProfileCard profile={profile} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        {/* オントロジー */}
        <OntologyGraph graph={graph} />

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
  )
}
