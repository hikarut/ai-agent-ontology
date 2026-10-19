"""SQLite の顧客データを Neo4j にオントロジー（知識グラフ）として登録するスクリプト。

実行: python -m data.build_ontology   （backend/ ディレクトリで実行）

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

from data.knowledge import BRANDS, HOBBIES, PREFECTURES
from services import db
from services.ontology import driver, run


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


if __name__ == "__main__":
    build()
    driver.close()
