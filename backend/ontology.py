"""Neo4j でオントロジー（知識グラフ）を構築・参照する。

実行: python ontology.py  → SQLite の顧客データを Neo4j にグラフとして登録します

グラフの構造（ノード -[リレーション]-> ノード）:
    (Customer) -[LIVES_IN]->        (City) -[LOCATED_IN]-> (Prefecture) -[PART_OF]-> (Region)
                                                           (Prefecture) -[HAS_AREA_TYPE]-> (AreaType)
    (Customer) -[WORKS_AS]->        (Occupation)
    (Customer) -[IN_AGE_GROUP]->    (AgeGroup)
    (Customer) -[HAS_HOUSEHOLD]->   (Household)
    (Customer) -[SHOPS_VIA]->       (Channel)
    (Customer) -[ENJOYS]->          (Hobby) -[BELONGS_TO]-> (HobbyCategory)
                                    (Hobby) -[SUGGESTS]->   (Value)
    (Customer) -[LIKES]->           (Brand) -[IN_CATEGORY]-> (ProductCategory)
                                    (Brand) -[REFLECTS]->    (Value)
    (Customer) -[HOLDS]->           (Value)
"""

import os

from dotenv import load_dotenv
from neo4j import GraphDatabase

import db
from knowledge import BRANDS, HOBBIES, PREFECTURES

load_dotenv()
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password")),
)


def run(cypher: str, **params) -> list[dict]:
    """Cypher（Neo4j のクエリ言語）を実行して結果を辞書のリストで返す"""
    records, _, _ = driver.execute_query(cypher, params)
    return [r.data() for r in records]


def build():
    """SQLite のデータから Neo4j にグラフを作る"""
    run("MATCH (n) DETACH DELETE n")  # 既存データを削除して作り直す

    # 1. ドメイン知識（概念どうしの関係）を登録
    for pref, (region, area, _) in PREFECTURES.items():
        run("""
            MERGE (p:Prefecture {name: $pref})
            MERGE (r:Region {name: $region})
            MERGE (a:AreaType {name: $area})
            MERGE (p)-[:PART_OF]->(r)
            MERGE (p)-[:HAS_AREA_TYPE]->(a)
        """, pref=pref, region=region, area=area)

    for hobby, (category, values) in HOBBIES.items():
        run("""
            MERGE (h:Hobby {name: $hobby})
            MERGE (c:HobbyCategory {name: $category})
            MERGE (h)-[:BELONGS_TO]->(c)
            WITH h UNWIND $values AS v
            MERGE (val:Value {name: v})
            MERGE (h)-[:SUGGESTS]->(val)
        """, hobby=hobby, category=category, values=values)

    for brand, (category, values) in BRANDS.items():
        run("""
            MERGE (b:Brand {name: $brand})
            MERGE (c:ProductCategory {name: $category})
            MERGE (b)-[:IN_CATEGORY]->(c)
            WITH b UNWIND $values AS v
            MERGE (val:Value {name: v})
            MERGE (b)-[:REFLECTS]->(val)
        """, brand=brand, category=category, values=values)

    # 2. 顧客ごとのデータを登録し、概念ノードとつなぐ
    for c in db.query("SELECT * FROM customers"):
        run("""
            CREATE (c:Customer {id: $id, name: $name, gender: $gender, age: $age,
                                annual_income: $income, monthly_spending: $spending})
            MERGE (city:City {name: $city})
            MERGE (pref:Prefecture {name: $pref})
            MERGE (city)-[:LOCATED_IN]->(pref)
            MERGE (o:Occupation {name: $occupation})
            MERGE (ag:AgeGroup {name: $age_group})
            MERGE (hh:Household {name: $household})
            MERGE (ch:Channel {name: $channel})
            CREATE (c)-[:LIVES_IN]->(city), (c)-[:WORKS_AS]->(o), (c)-[:IN_AGE_GROUP]->(ag),
                   (c)-[:HAS_HOUSEHOLD]->(hh), (c)-[:SHOPS_VIA]->(ch)
            WITH c
            UNWIND $hobbies AS hobby  MATCH (h:Hobby {name: hobby})  CREATE (c)-[:ENJOYS]->(h)
            WITH DISTINCT c
            UNWIND $brands AS brand   MATCH (b:Brand {name: brand})  CREATE (c)-[:LIKES]->(b)
            WITH DISTINCT c
            UNWIND $values AS value   MATCH (v:Value {name: value})  CREATE (c)-[:HOLDS]->(v)
        """,
            id=c["customer_id"], name=c["name"], gender=c["gender"], age=c["age"],
            income=c["annual_income"], spending=c["monthly_spending"],
            city=c["city"], pref=c["prefecture"], occupation=c["occupation"],
            age_group=f"{c['age'] // 10 * 10}代", household=c["household"], channel=c["shopping_channel"],
            hobbies=c["hobbies"].split(","), brands=c["favorite_brands"].split(","),
            values=c["personal_values"].split(","),
        )
    print("Neo4j にオントロジーを登録しました")


def get_customer_graph(customer_id: int) -> dict:
    """顧客を起点に3ホップ先までのグラフ（ノードとエッジ）を取得する"""
    rows = run("""
        MATCH (c:Customer {id: $id})-[rels*1..3]->()
        UNWIND rels AS r
        WITH DISTINCT r
        RETURN startNode(r) AS s, labels(startNode(r))[0] AS s_label,
               type(r) AS rel,
               endNode(r) AS e, labels(endNode(r))[0] AS e_label
    """, id=customer_id)

    nodes, edges = {}, []
    for row in rows:
        s_id, e_id = f"{row['s_label']}:{row['s']['name']}", f"{row['e_label']}:{row['e']['name']}"
        nodes[s_id] = {**row["s"], "id": s_id, "label": row["s_label"]}  # ノードのプロパティ + id/label
        nodes[e_id] = {**row["e"], "id": e_id, "label": row["e_label"]}
        edges.append({"source": s_id, "target": e_id, "type": row["rel"]})
    return {"nodes": list(nodes.values()), "edges": edges}


if __name__ == "__main__":
    build()
    driver.close()
