"""サンプルデータ（顧客100人 + アンケート）を SQLite に作成するスクリプト。

実行: python create_sqlite.py  → backend/customers.db が作られます
"""

import random
import sqlite3
from collections import Counter

from faker import Faker

from knowledge import BRANDS, HOBBIES, PREFECTURES, SURVEY_QUESTIONS, VALUES

DB_PATH = "customers.db"
NUM_CUSTOMERS = 100

random.seed(42)  # 毎回同じデータになるよう乱数を固定
fake = Faker("ja_JP")
Faker.seed(42)


def make_customer(customer_id: int) -> dict:
    """顧客1人分のダミーデータを作る"""
    gender = random.choice(["男性", "女性"])
    age = random.randint(18, 79)
    prefecture = random.choice(list(PREFECTURES))
    city = random.choice(PREFECTURES[prefecture][2])

    # 職業と年収（万円）は年齢に合わせて決める
    if age < 23:
        occupation, income = "学生", random.randint(0, 120)
    elif age >= 65:
        occupation = random.choice(["退職者", "退職者", "パート", "自営業"])
        income = random.randint(150, 450)
    else:
        occupation = random.choice(["会社員", "会社員", "会社員", "公務員", "エンジニア", "医療従事者", "自営業", "パート", "専業主婦・主夫", "経営者"])
        income = {"パート": (80, 200), "専業主婦・主夫": (0, 50), "経営者": (800, 2000)}.get(occupation, (300, 1000))
        income = random.randint(*income)

    # 家族構成
    married = age >= 25 and random.random() < 0.6
    has_children = married and 28 <= age <= 60 and random.random() < 0.7
    if has_children:
        household = f"夫婦+子ども{random.randint(1, 3)}人"
    elif married:
        household = "夫婦のみ"
    else:
        household = random.choice(["一人暮らし", "一人暮らし", "親と同居"])

    # 趣味（2〜3個）
    hobbies = random.sample(list(HOBBIES), k=random.randint(2, 3))

    # 価値観（1〜2個）: 趣味から推測できる価値観が選ばれやすいように重み付け
    hint = Counter(v for h in hobbies for v in HOBBIES[h][1])
    values = []
    while len(values) < random.randint(1, 2):
        v = random.choices(VALUES, weights=[1 + 3 * hint[v] for v in VALUES])[0]
        if v not in values:
            values.append(v)

    # 好きなブランド（2個）: 価値観に合うブランドが選ばれやすいように重み付け
    brand_weights = [1 + 3 * len(set(BRANDS[b][1]) & set(values)) for b in BRANDS]
    brands = []
    while len(brands) < 2:
        b = random.choices(list(BRANDS), weights=brand_weights)[0]
        if b not in brands:
            brands.append(b)

    # よく使う買い物チャネル
    ec_weight = 3 if ("デジタル志向" in values or age < 40) else 1
    channel = random.choices(["EC中心", "店舗中心", "EC・店舗半々"], weights=[ec_weight, 2, 2])[0]

    return {
        "customer_id": customer_id,
        "name": fake.name_male() if gender == "男性" else fake.name_female(),
        "gender": gender,
        "age": age,
        "prefecture": prefecture,
        "city": city,
        "occupation": occupation,
        "annual_income": income,
        "household": household,
        "has_children": int(has_children),
        "hobbies": ",".join(hobbies),
        "personal_values": ",".join(values),
        "favorite_brands": ",".join(brands),
        "shopping_channel": channel,
        "monthly_spending": max(10000, income * 60 + random.randint(-20000, 20000)),
    }


def make_answer(customer: dict, question: dict) -> int:
    """顧客の特徴から、もっともらしいアンケート回答(1〜5)を作る（= 精度評価用の“正解データ”）"""
    hobbies = customer["hobbies"].split(",")
    features = Counter()
    for h in hobbies:
        for v in HOBBIES[h][1]:
            features[v] += 0.7
    for v in customer["personal_values"].split(","):
        features[v] += 1.5
    for b in customer["favorite_brands"].split(","):
        for v in BRANDS[b][1]:
            features[v] += 0.5
    features["地方在住"] = PREFECTURES[customer["prefecture"]][1] == "地方"
    features["高収入"] = customer["annual_income"] >= 800
    features["EC派"] = customer["shopping_channel"] == "EC中心"
    features["シニア"] = customer["age"] >= 60
    features["若年層"] = customer["age"] < 30
    features["子育て世帯"] = customer["has_children"]
    features["料理好き"] = "料理" in hobbies

    score = sum(w * features[k] for k, w in question["weights"].items())
    answer = round(2 + score + random.gauss(0, 0.5))  # 少しだけランダムな揺らぎを入れる
    return min(5, max(1, answer))


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        DROP TABLE IF EXISTS survey_answers;
        DROP TABLE IF EXISTS survey_questions;
        DROP TABLE IF EXISTS customers;

        CREATE TABLE customers (
            customer_id      INTEGER PRIMARY KEY,
            name             TEXT,    -- 氏名
            gender           TEXT,    -- 性別
            age              INTEGER, -- 年齢
            prefecture       TEXT,    -- 都道府県
            city             TEXT,    -- 市区町村
            occupation       TEXT,    -- 職業
            annual_income    INTEGER, -- 年収(万円)
            household        TEXT,    -- 家族構成
            has_children     INTEGER, -- 子どもの有無(1/0)
            hobbies          TEXT,    -- 趣味(カンマ区切り)
            personal_values  TEXT,    -- 価値観(カンマ区切り)
            favorite_brands  TEXT,    -- 好きなブランド(カンマ区切り)
            shopping_channel TEXT,    -- よく使う買い物チャネル
            monthly_spending INTEGER  -- 月の消費額(円)
        );

        -- アンケートの質問サマリ
        CREATE TABLE survey_questions (
            question_id   INTEGER PRIMARY KEY,
            category      TEXT, -- 質問カテゴリ
            question_text TEXT  -- 質問文（回答は1〜5の5段階）
        );

        -- アンケートの回答（顧客 × 質問）
        CREATE TABLE survey_answers (
            answer_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER REFERENCES customers(customer_id),
            question_id INTEGER REFERENCES survey_questions(question_id),
            answer      INTEGER -- 1=全くそう思わない 〜 5=とてもそう思う
        );
    """)

    customers = [make_customer(i) for i in range(1, NUM_CUSTOMERS + 1)]
    conn.executemany(
        f"INSERT INTO customers VALUES ({','.join(':' + k for k in customers[0])})", customers
    )
    conn.executemany(
        "INSERT INTO survey_questions VALUES (:id, :category, :text)", SURVEY_QUESTIONS
    )
    conn.executemany(
        "INSERT INTO survey_answers (customer_id, question_id, answer) VALUES (?, ?, ?)",
        [(c["customer_id"], q["id"], make_answer(c, q)) for c in customers for q in SURVEY_QUESTIONS],
    )
    conn.commit()
    conn.close()
    print(f"{DB_PATH} を作成しました（顧客 {NUM_CUSTOMERS} 人 / 質問 {len(SURVEY_QUESTIONS)} 問）")


if __name__ == "__main__":
    main()
