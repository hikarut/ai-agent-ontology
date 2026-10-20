"""2種類のカスタマーデジタルツイン（LangChain + Anthropic）

- rdb      : SQLite の顧客レコード（1行）をそのままプロフィールとして渡す
- ontology : Neo4j のグラフから「顧客 → 趣味 → 価値観」のような関係性をたどって渡す

どちらも同じ LLM・同じ指示文を使い、違いは「顧客情報の渡し方」だけにしています。
"""

import os
from collections import defaultdict

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field

from services import db, ontology

load_dotenv()
llm = ChatAnthropic(model=os.getenv("ANTHROPIC_MODEL", "claude-opus-5-5"), max_tokens=16000)

SYSTEM_PROMPT = """あなたは、以下のデータで表される実在の顧客本人です（カスタマーデジタルツイン）。
- 常にこの顧客として、一人称で、年齢・性別・暮らしぶりに合った自然な口調で答えてください。
- データに直接書かれていないことも、人物像から自然に推測して答えてください。
- 自分が AI であることには触れないでください。

# 顧客データ
{profile}"""

# SQLite のカラム名 → 日本語ラベル
COLUMN_LABELS = {
    "name": "氏名", "gender": "性別", "age": "年齢", "prefecture": "都道府県", "city": "市区町村",
    "occupation": "職業", "annual_income": "年収(万円)", "household": "家族構成",
    "hobbies": "趣味", "personal_values": "価値観", "favorite_brands": "好きなブランド",
    "shopping_channel": "よく使う買い物チャネル", "monthly_spending": "月の消費額(円)",
}

def rdb_profile(customer_id: int) -> str:
    """RDB 版: 顧客テーブルの1行を「項目: 値」のテキストにする"""
    customer = db.get_customer(customer_id)
    return "\n".join(f"- {label}: {customer[col]}" for col, label in COLUMN_LABELS.items())

def ontology_profile(customer_id: int) -> str:
    """オントロジー版: グラフの関係（トリプル）と、価値観に至る根拠をテキストにする"""
    graph = ontology.get_customer_graph(customer_id)
    nodes = {n["id"]: n for n in graph["nodes"]}

    def label(node_id: str) -> str:
        return f"{nodes[node_id]['name']}({nodes[node_id]['label']})"

    customer = next(n for n in graph["nodes"] if n["label"] == "Customer")
    lines = [f"## 本人\n- {customer['name']} / {customer['gender']} / {customer['age']}歳 / "
             f"年収{customer['annual_income']}万円 / 月の消費額{customer['monthly_spending']}円",
             "\n## 関係グラフ（ノード -[関係]-> ノード）"]
    lines += [f"- {label(e['source'])} -[{e['type']}]-> {label(e['target'])}" for e in graph["edges"]]

    # 価値観(Value)ノードに入ってくる関係を集めると「なぜその価値観を持つか」がわかる
    evidence = defaultdict(list)
    for e in graph["edges"]:
        if nodes[e["target"]]["label"] == "Value":
            evidence[nodes[e["target"]]["name"]].append(f"{label(e['source'])}が{e['type']}")
    lines.append("\n## 価値観とその根拠（根拠が多いほど強い傾向）")
    for value, reasons in sorted(evidence.items(), key=lambda x: -len(x[1])):
        lines.append(f"- {value}（根拠{len(reasons)}件）: {', '.join(reasons)}")
    return "\n".join(lines)

def system_prompt(customer_id: int, twin_type: str) -> str:
    profile = rdb_profile(customer_id) if twin_type == "rdb" else ontology_profile(customer_id)
    return SYSTEM_PROMPT.format(profile=profile)

def chat(customer_id: int, twin_type: str, messages: list[dict]) -> str:
    """会話履歴 messages（[{"role": "user"|"assistant", "content": "..."}]）に続けて返答する"""
    response = llm.invoke([{"role": "system", "content": system_prompt(customer_id, twin_type)}, *messages])
    return response.text

# ---- アンケート回答（精度評価用） ----

class Answer(BaseModel):
    question_id: int
    answer: int = Field(description="1=全くそう思わない, 2=あまりそう思わない, 3=どちらともいえない, 4=ややそう思う, 5=とてもそう思う")

class SurveyResult(BaseModel):
    answers: list[Answer]

survey_llm = llm.with_structured_output(SurveyResult, method="json_schema")

def survey_input(customer_id: int, twin_type: str, questions: list[dict]) -> list[dict]:
    """アンケートに回答させるための入力メッセージを作る"""
    question_text = "\n".join(f"Q{q['question_id']}. {q['question_text']}" for q in questions)
    return [
        {"role": "system", "content": system_prompt(customer_id, twin_type)},
        {"role": "user", "content": "次のアンケートに、あなた自身として1〜5の5段階で回答してください。\n"
                                    "(1=全くそう思わない, 2=あまりそう思わない, 3=どちらともいえない, 4=ややそう思う, 5=とてもそう思う)\n\n"
                                    + question_text},
    ]

def answer_surveys(customer_ids: list[int], twin_type: str, questions: list[dict]) -> list[dict[int, int]]:
    """複数の顧客にまとめてアンケート回答させる（並列実行）。顧客ごとに {question_id: answer} を返す"""
    inputs = [survey_input(cid, twin_type, questions) for cid in customer_ids]
    results = survey_llm.batch(inputs, config={"max_concurrency": 5})
    return [{a.question_id: a.answer for a in r.answers} for r in results]
