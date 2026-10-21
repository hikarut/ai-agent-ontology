// 左側のサイドメニュー：ページを切り替え、顧客を検索して選ぶ
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChatCircleDots, Fingerprint, MagnifyingGlass, Table } from '@phosphor-icons/react'
import type { CustomerSummary } from '../api'

export type Page = 'chat' | 'data'

// メニューのリンク
const MENU: { page: Page; label: string; icon: ReactNode }[] = [
  { page: 'chat', label: 'ツインと対話', icon: <ChatCircleDots size={18} /> },
  { page: 'data', label: '実データ確認', icon: <Table size={18} /> },
]

type Props = {
  page: Page
  onPageChange: (page: Page) => void
  customers: CustomerSummary[]
  selectedId: number
  onSelect: (id: number) => void
}

export default function Sidebar({ page, onPageChange, customers, selectedId, onSelect }: Props) {
  const [keyword, setKeyword] = useState('')
  // 名前か都道府県にキーワードを含む顧客だけを表示する
  const filtered = customers.filter((c) => (c.name + c.prefecture).includes(keyword))

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col bg-slate-900 text-slate-300">
      {/* ロゴ */}
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <Fingerprint size={20} weight="bold" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-white">Customer Twin</p>
          <p className="text-xs text-slate-500">デジタルツイン管理</p>
        </div>
      </div>

      {/* メニュー */}
      <p className="px-5 pb-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">Menu</p>
      <nav className="space-y-0.5 px-3 pb-4">
        {MENU.map((m) => (
          <button
            key={m.page}
            onClick={() => onPageChange(m.page)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
              page === m.page ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span className={page === m.page ? 'text-indigo-400' : 'text-slate-500'}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </nav>
      <div className="mx-5 mb-4 border-t border-slate-800" />

      {/* 検索 */}
      <div className="px-4 pb-4">
        <label className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 ring-1 ring-slate-700 transition-shadow duration-150 focus-within:ring-indigo-500">
          <MagnifyingGlass size={16} className="text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="名前・都道府県で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
      </div>

      {/* 顧客一覧 */}
      <p className="flex items-center justify-between px-5 pb-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
        Customers
        <span className="font-mono">{filtered.length}</span>
      </p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {filtered.map((c) => {
          const active = c.customer_id === selectedId
          return (
            <button
              key={c.customer_id}
              onClick={() => onSelect(c.customer_id)}
              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-150 ${
                active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {c.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{c.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {c.gender}・{c.age}歳・{c.prefecture}
                </span>
              </span>
              <span className="font-mono text-[11px] text-slate-600">#{c.customer_id}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
