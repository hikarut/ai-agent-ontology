// 1つのデジタルツインとの会話を表示する
import type { Message } from '../api'

type Props = { title: string; description: string; messages: Message[]; loading: boolean }

export default function ChatPanel({ title, description, messages, loading }: Props) {
  return (
    <div className="flex h-[600px] flex-col rounded-lg bg-white shadow">
      <div className="border-b p-3">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-sm text-gray-400">考え中...</p>}
      </div>
    </div>
  )
}
