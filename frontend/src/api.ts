// バックエンド(FastAPI)との通信と、データの型定義

export type TwinType = 'rdb' | 'ontology'

export type CustomerSummary = {
  customer_id: number
  name: string
  gender: string
  age: number
  prefecture: string
}

export type Profile = CustomerSummary & {
  city: string
  occupation: string
  annual_income: number
  household: string
  hobbies: string
  personal_values: string
  favorite_brands: string
  shopping_channel: string
  monthly_spending: number
}

export type GraphNode = { id: string; label: string; name: string }
export type GraphEdge = { source: string; target: string; type: string }
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] }

export type Message = { role: 'user' | 'assistant'; content: string }

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
