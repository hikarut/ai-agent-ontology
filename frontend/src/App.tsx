import { useEffect, useState } from 'react'
import { fetchCustomer, fetchCustomers } from './api'
import type { CustomerSummary, Graph, Profile } from './api'
import Sidebar from './components/Sidebar'
import type { Page } from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import DataPage from './pages/DataPage'

const PAGE_TITLES: Record<Page, string> = { chat: 'ツインと対話', data: '実データ確認' }

export default function App() {
  const [page, setPage] = useState<Page>('chat')
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [customerId, setCustomerId] = useState(1)
  const [detail, setDetail] = useState<{ profile: Profile; graph: Graph } | null>(null)

  // 起動時に顧客一覧を取得
  useEffect(() => {
    fetchCustomers().then(setCustomers)
  }, [])

  // 顧客を切り替えたら詳細を取得
  useEffect(() => {
    fetchCustomer(customerId).then(setDetail)
  }, [customerId])

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* 左: サイドメニュー（ページと顧客の選択） */}
      <Sidebar
        page={page}
        onPageChange={setPage}
        customers={customers}
        selectedId={customerId}
        onSelect={setCustomerId}
      />

      {/* 右: メイン画面 */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-slate-200 bg-white/80 px-8 backdrop-blur">
          <div>
            <p className="text-xs text-slate-500">
              {PAGE_TITLES[page]} / <span className="font-mono">#{customerId}</span>
            </p>
            <h1 className="text-base font-semibold tracking-tight">
              {detail?.profile.name ?? '読み込み中...'}
              <span className="ml-2 text-xs font-normal text-slate-500">{detail?.profile.name_kana}</span>
            </h1>
          </div>
        </header>

        {/* ページを切り替えても会話が消えないよう、両方のページを置いて表示だけを切り替える */}
        {detail && (
          <div className="p-8">
            <div className={page === 'chat' ? '' : 'hidden'}>
              <ChatPage customerId={customerId} profile={detail.profile} graph={detail.graph} />
            </div>
            <div className={page === 'data' ? '' : 'hidden'}>
              <DataPage customerId={customerId} profile={detail.profile} graph={detail.graph} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
