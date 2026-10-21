"""SQLite（RDB）からデータを取得する関数

テーブルの正式な定義は data/rdb/schema.sql を参照してください。
下の TypedDict は、各関数が返す1行分のデータの形（カラム名と型）を表しています。
"""

import sqlite3
from pathlib import Path
from typing import TypedDict

# SQLite のファイルは data/rdb/create_sqlite.py で作成される
DB_PATH = Path(__file__).parent.parent / "data" / "rdb" / "customers.db"

class CustomerSummary(TypedDict):
    """customers テーブルの一部（顧客一覧用）"""
    customer_id: int
    name: str              # 氏名
    name_kana: str         # 氏名のフリガナ
    gender: str            # 性別
    age: int               # 年齢
    prefecture: str        # 都道府県

class Customer(CustomerSummary):
    """customers テーブルの1行（CustomerSummary の項目 + 以下の項目）"""
    city: str              # 市区町村
    occupation: str        # 職業
    annual_income: str     # 年収のレンジ(例: 300万〜400万円)
    household: str         # 家族構成
    has_children: int      # 子どもの有無(1/0)
    hobbies: str           # 趣味(カンマ区切り)
    personal_values: str   # 価値観(カンマ区切り)
    favorite_brands: str   # 好きなブランド(カンマ区切り)
    shopping_channel: str  # よく使う買い物チャネル
    monthly_spending: str  # 世帯の月の消費額のレンジ(例: 20万〜25万円)

class Question(TypedDict):
    """survey_questions テーブルの1行"""
    question_id: int
    category: str          # 質問カテゴリ
    question_text: str     # 質問文（回答は1〜5の5段階）

class SurveyRow(Question):
    """質問と、その顧客の実際の回答（survey_questions と survey_answers を結合したもの）"""
    answer: int            # 1〜5

def query(sql: str, params: tuple = ()) -> list[dict]:
    """SQL を実行して、結果を辞書のリストで返す"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    conn.close()
    return rows

def list_customers() -> list[CustomerSummary]:
    return query("SELECT customer_id, name, name_kana, gender, age, prefecture FROM customers ORDER BY customer_id")

def get_customer(customer_id: int) -> Customer | None:
    rows = query("SELECT * FROM customers WHERE customer_id = ?", (customer_id,))
    return rows[0] if rows else None

def get_questions() -> list[Question]:
    return query("SELECT * FROM survey_questions ORDER BY question_id")

def get_answers(customer_id: int) -> dict[int, int]:
    """survey_answers テーブルから、実際のアンケート回答を {question_id: answer} で返す"""
    rows = query("SELECT question_id, answer FROM survey_answers WHERE customer_id = ?", (customer_id,))
    return {r["question_id"]: r["answer"] for r in rows}

def get_survey(customer_id: int) -> list[SurveyRow]:
    """質問文と実際の回答を、質問ごとに1行で返す"""
    return query(
        """SELECT q.question_id, q.category, q.question_text, a.answer
           FROM survey_questions q JOIN survey_answers a ON a.question_id = q.question_id
           WHERE a.customer_id = ? ORDER BY q.question_id""",
        (customer_id,),
    )
