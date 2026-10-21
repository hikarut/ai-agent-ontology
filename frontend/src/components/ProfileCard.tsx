// 顧客のプロフィール（RDB のデータ）を表示する
import { Heart, MapPin, Sparkle, Tag } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Profile } from '../api'

// カンマ区切りの文字列をタグとして並べる
function Tags({ title, icon, items }: { title: string; icon: ReactNode; items: string }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon}
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.split(',').map((item) => (
          <span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ラベルと値の組（mono=true のときは数字用の等幅フォントにする）
function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-medium text-slate-900 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
    </div>
  )
}

export default function ProfileCard({ profile: p }: { profile: Profile }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-600">
          {p.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{p.name}</h2>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin size={14} />
            {p.prefecture}
            {p.city}・{p.gender}・{p.age}歳・{p.occupation}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="年収" value={p.annual_income} mono />
        <Stat label="世帯の月の消費額" value={p.monthly_spending} mono />
        <Stat label="家族構成" value={p.household} />
        <Stat label="よく使うチャネル" value={p.shopping_channel} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Tags title="趣味" icon={<Sparkle size={14} />} items={p.hobbies} />
        <Tags title="価値観" icon={<Heart size={14} />} items={p.personal_values} />
        <Tags title="好きなブランド" icon={<Tag size={14} />} items={p.favorite_brands} />
      </div>
    </section>
  )
}
