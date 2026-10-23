"""ドメイン知識（オントロジー）とアンケートの定義を YAML から読み込む。

定義の本体は、同じディレクトリにある次の YAML ファイルです。内容を変えるときは YAML を編集してください。
- customer_ontology.yaml : 顧客に関わる概念（価値観・趣味・ブランド・都道府県）と、それらの関係
- survey_ontology.yaml   : アンケートの質問と、サンプルの正解データを作るための重み

RDB とオントロジーの両方から使う共通の定義です。
- data/rdb/create_sqlite.py       : サンプルデータ（アンケート回答）を作る時に利用
- data/graphdb/build_graphdb.py   : Neo4j にグラフを作る時に利用
"""

from pathlib import Path

import yaml

def load_yaml(file_name: str) -> dict:
    return yaml.safe_load((Path(__file__).parent / file_name).read_text(encoding="utf-8"))

customer_ontology = load_yaml("customer_ontology.yaml")
survey_ontology = load_yaml("survey_ontology.yaml")

# 各スクリプトで使いやすい形に変換する
# 価値観の一覧と説明
VALUES = [v["name"] for v in customer_ontology["values"]]
VALUE_DESCRIPTIONS = {v["name"]: v["description"] for v in customer_ontology["values"]}
# 趣味 → (趣味カテゴリ, その趣味から推測できる価値観)
HOBBIES = {h["name"]: (h["category"], h["suggests"]) for h in customer_ontology["hobbies"]}
# 好きなブランド → (商品カテゴリ, ブランドが象徴する価値観)
BRANDS = {b["name"]: (b["category"], b["reflects"]) for b in customer_ontology["brands"]}
# 都道府県 → (地方, エリア区分, 市区町村の候補)
PREFECTURES = {p["name"]: (p["region"], p["area_type"], p["cities"]) for p in customer_ontology["prefectures"]}
# アンケートの質問（id, category, text, weights）
SURVEY_QUESTIONS = survey_ontology["questions"]

def validate():
    """YAML の書き間違い（存在しない価値観の参照など）があればエラーにする"""
    for name, (_, values) in {**HOBBIES, **BRANDS}.items():
        for v in values:
            if v not in VALUES:
                raise ValueError(f"customer_ontology.yaml: 「{name}」が参照している価値観「{v}」が values にありません")
    features = VALUES + [f["name"] for f in survey_ontology["features"]]
    for q in SURVEY_QUESTIONS:
        for key in q["weights"]:
            if key not in features:
                raise ValueError(f"survey_ontology.yaml: 質問{q['id']}の weights「{key}」が values にも features にもありません")

validate()
