"""Neo4j のオントロジー（知識グラフ）を参照する。

グラフの作り方と構造は data/build_ontology.py を参照してください。
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password")),
)

def run(cypher: str, **params) -> list[dict]:
    """Cypher（Neo4j のクエリ言語）を実行して結果を辞書のリストで返す"""
    records, _, _ = driver.execute_query(cypher, params)
    return [r.data() for r in records]

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
