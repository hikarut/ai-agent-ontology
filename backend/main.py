"""FastAPI のエントリーポイント。

起動: uvicorn main:app --reload
API ドキュメント: http://localhost:8000/docs
"""

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from services import db, ontology, twins

app = FastAPI(title="Customer Digital Twin API")

@app.get("/api/customers")
def list_customers():
    """顧客一覧"""
    return db.list_customers()

@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int):
    """顧客の詳細（RDB のデータ）と、オントロジーのグラフ"""
    customer = db.get_customer(customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="顧客が見つかりません")
    return {"profile": customer, "graph": ontology.get_customer_graph(customer_id)}

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    customer_id: int
    twin_type: Literal["rdb", "ontology"]
    messages: list[Message]  # これまでの会話履歴（最後がユーザーの発言）

@app.post("/api/chat")
def chat(req: ChatRequest):
    """デジタルツインと対話する"""
    reply = twins.chat(req.customer_id, req.twin_type, [m.model_dump() for m in req.messages])
    return {"reply": reply}
