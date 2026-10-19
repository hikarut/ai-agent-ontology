"""SQLite（RDB）からデータを取得する関数"""

import sqlite3
from pathlib import Path

# SQLite のファイルは data/create_sqlite.py で作成される
DB_PATH = Path(__file__).parent.parent / "data" / "customers.db"


def query(sql: str, params: tuple = ()) -> list[dict]:
    """SQL を実行して、結果を辞書のリストで返す"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    conn.close()
    return rows


def list_customers() -> list[dict]:
    return query("SELECT customer_id, name, gender, age, prefecture FROM customers ORDER BY customer_id")


def get_customer(customer_id: int) -> dict | None:
    rows = query("SELECT * FROM customers WHERE customer_id = ?", (customer_id,))
    return rows[0] if rows else None


def get_questions() -> list[dict]:
    return query("SELECT * FROM survey_questions ORDER BY question_id")


def get_answers(customer_id: int) -> dict[int, int]:
    """実際のアンケート回答を {question_id: answer} で返す"""
    rows = query("SELECT question_id, answer FROM survey_answers WHERE customer_id = ?", (customer_id,))
    return {r["question_id"]: r["answer"] for r in rows}
