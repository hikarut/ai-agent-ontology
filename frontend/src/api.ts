// バックエンド(FastAPI)との通信と、データの型定義

export type TwinType = 'rdb' | 'ontology'

export type CustomerSummary = {
  customer_id: number
  name: string
  name_kana: string // フリガナ
  gender: string
  age: number
  prefecture: string
}

export type Profile = CustomerSummary & {
  city: string
  occupation: string
  annual_income: string // 例: 300万〜400万円
  household: string
  hobbies: string
  personal_values: string
  favorite_brands: string
  shopping_channel: string
  monthly_spending: string // 例: 20万〜25万円
  has_children: number // 1=あり, 0=なし
}

export type GraphNode = { id: string; label: string; name: string }
export type GraphEdge = { source: string; target: string; type: string }
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] }

export type Message = { role: 'user' | 'assistant'; content: string }

// アンケートの質問と、実際の回答（1〜5）
export type SurveyRow = { question_id: number; category: string; question_text: string; answer: number }

export async function fetchCustomers(): Promise<CustomerSummary[]> {
  const res = await fetch('/api/customers')
  return res.json()
}

export async function fetchCustomer(id: number): Promise<{ profile: Profile; graph: Graph }> {
  const res = await fetch(`/api/customers/${id}`)
  return res.json()
}

export async function sendChat(customerId: number, twinType: TwinType, messages: Message[]): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: customerId, twin_type: twinType, messages }),
  })
  if (!res.ok) return '（エラーが発生しました）'
  return (await res.json()).reply
}

export async function fetchSurvey(id: number): Promise<SurveyRow[]> {
  const res = await fetch(`/api/customers/${id}/survey`)
  return res.json()
}

// 各ツインに渡しているプロフィールの文章
export async function fetchTwinProfiles(id: number): Promise<Record<TwinType, string>> {
  const res = await fetch(`/api/customers/${id}/twin-profiles`)
  return res.json()
}

// ツインにアンケートへ回答させる（{ question_id: answer } が返る）。失敗したら null
export async function runTwinSurvey(id: number, twinType: TwinType): Promise<Record<number, number> | null> {
  const res = await fetch(`/api/customers/${id}/twin-survey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ twin_type: twinType }),
  })
  return res.ok ? res.json() : null
}
