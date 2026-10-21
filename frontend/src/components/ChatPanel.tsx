// 1つのデジタルツインとの会話を表示する
import { ChatCircleDots } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Message } from '../api'

type Props = { title: string; description: string; icon: ReactNode; messages: Message[]; loading: boolean }

export default function ChatPanel({ title, description, icon, messages, loading }: Props) {
  return (
    <div className="flex h-[520px] min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* まだ会話がないとき */}
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <ChatCircleDots size={28} />
            <p className="text-xs">下の入力欄から質問してみましょう</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}

        {/* 返答待ちのアニメーション */}
        {loading && (
          <div className="flex w-fit gap-1 rounded-xl bg-slate-100 px-3 py-3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  )
}
