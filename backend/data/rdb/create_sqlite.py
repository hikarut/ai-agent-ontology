"""サンプルデータ（顧客100人 + アンケート）を SQLite に作成するスクリプト。

実行: python -m data.rdb.create_sqlite   （backend/ ディレクトリで実行）→ backend/data/rdb/customers.db が作られます
"""

import random
import sqlite3
from collections import Counter
from pathlib import Path

from faker import Faker

from data.common.knowledge import BRANDS, HOBBIES, PREFECTURES, SURVEY_QUESTIONS, VALUES
from services.db import DB_PATH

SCHEMA_PATH = Path(__file__).parent / "schema.sql"  # テーブル定義
NUM_CUSTOMERS = 100

random.seed(42)  # 毎回同じデータになるよう乱数を固定
fake = Faker("ja_JP")
Faker.seed(42)

# 年収・月の消費額は、金額そのものではなく「100万〜200万円」のようなレンジで保存する（単位: 万円）
INCOME_RANGES = [0, 100, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000]
SPENDING_RANGES = [0, 5, 10, 15, 20, 25, 30, 40, 50]

# 会社員の平均年収（万円）の目安。国税庁「民間給与実態統計調査」の年齢・性別の傾向を参考にした値
AVERAGE_INCOME = {
    "男性": {20: 270, 25: 400, 30: 470, 35: 530, 40: 580, 45: 620, 50: 660, 55: 680, 60: 500},
    "女性": {20: 250, 25: 320, 30: 320, 35: 320, 40: 320, 45: 330, 50: 330, 55: 310, 60: 250},
}
# 職業ごとの年収の倍率（会社員 = 1.0）
INCOME_RATE = {"会社員": 1.0, "公務員": 1.1, "エンジニア": 1.25, "医療従事者": 1.1, "自営業": 0.9, "経営者": 2.2}

def to_range(value: float, bounds: list[int]) -> str:
    """数値（万円）を「100万〜200万円」のようなレンジの文字列にする"""
    for low, high in zip(bounds, bounds[1:]):
        if value < high:
            return f"0〜{high}万円" if low == 0 else f"{low}万〜{high}万円"
    return f"{bounds[-1]}万円以上"

def choose_occupation(age: int, gender: str, married: bool) -> str:
    """年齢・性別・結婚の有無から、ありそうな職業を選ぶ"""
    if age < 23:
        return random.choices(["学生", "会社員"], weights=[85, 15])[0]
    if age >= 65:
        return random.choices(["退職者", "パート", "自営業", "会社員"], weights=[55, 25, 12, 8])[0]
    if married and gender == "女性" and random.random() < 0.25:
        return "専業主婦・主夫"
    part_weight = 25 if gender == "女性" else 4
    jobs = {"会社員": 50, "公務員": 8, "エンジニア": 10, "医療従事者": 8, "自営業": 8, "パート": part_weight, "経営者": 3}
    return random.choices(list(jobs), weights=list(jobs.values()))[0]

def make_income(age: int, gender: str, occupation: str, married: bool) -> float:
    """年収（万円）を作る"""
    if occupation == "学生":
        return random.uniform(0, 100)        # アルバイト
    if occupation == "専業主婦・主夫":
        return random.uniform(0, 50)
    if occupation == "退職者":
        return random.uniform(150, 260) if gender == "男性" else random.uniform(80, 160)  # 年金
    if occupation == "パート":
        if age >= 65:
            return random.uniform(180, 280)  # パート収入 + 年金
        return random.uniform(80, 150) if married else random.uniform(150, 250)  # 既婚者は扶養の範囲内が多い
    base = AVERAGE_INCOME[gender][min(60, max(20, age // 5 * 5))]
    if age >= 65:
        base *= 0.6
    return base * INCOME_RATE[occupation] * random.lognormvariate(0, 0.25)  # 個人差を加える

def make_spending(age: int, household: str, income: float) -> float:
    """世帯の月の消費額（万円）を作る。総務省「家計調査」の世帯タイプ別の傾向を参考にした値"""
    if household == "親と同居":
        base = 4 if age < 23 else 8      # 親と同居なら本人が使うお金だけ
    elif household == "一人暮らし":
        base = 12 if age < 23 else 16
    elif household == "夫婦のみ":
        base = 26
    else:
        base = 28 + 2 * int(household[-2])  # 夫婦+子どもN人
    # 収入が多いほど消費も多くなる（夫婦世帯は配偶者の収入もあるとみなす）
    income_effect = (max(income, 400 if household.startswith("夫婦") else 100) / 400) ** 0.3
    return base * income_effect * random.lognormvariate(0, 0.15)

def make_customer(customer_id: int) -> dict:
    """顧客1人分のダミーデータを作る"""
    gender = random.choice(["男性", "女性"])
    age = random.randint(18, 79)
    prefecture = random.choice(list(PREFECTURES))
    city = random.choice(PREFECTURES[prefecture][2])

    # 家族構成
    married = age >= 25 and random.random() < 0.6
    has_children = married and 28 <= age <= 60 and random.random() < 0.7
    if has_children:
        household = f"夫婦+子ども{random.randint(1, 3)}人"
    elif married:
        household = "夫婦のみ"
    elif age < 50:
        household = random.choice(["一人暮らし", "一人暮らし", "親と同居"])
    else:
        household = "一人暮らし"

    # 職業・年収・月の消費額
    occupation = choose_occupation(age, gender, married)
    income = make_income(age, gender, occupation, married)
    spending = make_spending(age, household, income)

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
        "annual_income": to_range(income, INCOME_RANGES),
        "household": household,
        "has_children": int(has_children),
        "hobbies": ",".join(hobbies),
        "personal_values": ",".join(values),
        "favorite_brands": ",".join(brands),
        "shopping_channel": channel,
        "monthly_spending": to_range(spending, SPENDING_RANGES),
    }

# 「高収入」とみなす年収レンジ（800万円以上）
HIGH_INCOME_RANGES = [to_range(v, INCOME_RANGES) for v in INCOME_RANGES if v >= 800]

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
    features["高収入"] = customer["annual_income"] in HIGH_INCOME_RANGES
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
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))  # テーブルを作り直す

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
    print(f"{DB_PATH.name} を作成しました（顧客 {NUM_CUSTOMERS} 人 / 質問 {len(SURVEY_QUESTIONS)} 問）")

if __name__ == "__main__":
    main()
