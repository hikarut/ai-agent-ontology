// 顧客のプロフィール（RDB のデータ）を表示する
import type { Profile } from '../api'

function Tags({ items, color }: { items: string; color: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.split(',').map((item) => (
        <span key={item} className={`rounded-full px-2 py-0.5 text-xs ${color}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

export default function ProfileCard({ profile: p }: { profile: Profile }) {
  return (
    <div className="space-y-3 rounded-lg bg-white p-4 shadow">
      <div>
        <h2 className="text-lg font-bold">{p.name}</h2>
        <p className="text-sm text-gray-600">
          {p.gender} / {p.age}歳 / {p.prefecture}
          {p.city} / {p.occupation}
        </p>
        <p className="text-sm text-gray-600">
          年収 {p.annual_income}万円 / {p.household} / 月の消費 {p.monthly_spending.toLocaleString()}円 / {p.shopping_channel}
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-500">趣味</p>
        <Tags items={p.hobbies} color="bg-green-100 text-green-800" />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-500">価値観</p>
        <Tags items={p.personal_values} color="bg-purple-100 text-purple-800" />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-500">好きなブランド</p>
        <Tags items={p.favorite_brands} color="bg-orange-100 text-orange-800" />
      </div>
    </div>
  )
}
