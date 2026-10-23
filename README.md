# カスタマーデジタルツイン（RDB版 vs オントロジー版）

顧客の属性・趣味嗜好データをもとに、AI で顧客を再現する「カスタマーデジタルツイン」のサンプルです。
同じ顧客データから **2種類のツイン** を作り、対話したり、アンケート回答の精度を比較したりできます。

| ツイン | 顧客情報の渡し方 |
| --- | --- |
| **RDB版** | SQLite の顧客テーブル1行（年齢・趣味・ブランドなど）をそのままプロフィールとして LLM に渡す |
| **オントロジー版** | Neo4j の知識グラフをたどり、「顧客 → キャンプ(趣味) → アウトドア志向(価値観)」のような **関係性と根拠** を LLM に渡す |

LLM・指示文は両方同じで、違いは「顧客情報の表現方法」だけです。

## 技術スタック

| 役割 | 技術 |
| --- | --- |
| バックエンド | FastAPI（Python） |
| フロントエンド | Vite + React + TypeScript + Tailwind CSS + Phosphor Icons |
| データベース | SQLite（顧客100人 + アンケート） |
| オントロジー | Neo4j |
| エージェント | LangChain（`langchain-anthropic`） |
| AI モデル | Anthropic Claude（`.env` の `ANTHROPIC_MODEL` で指定） |

## 全体の流れ

バックエンドは、役割ごとに3つのフォルダに分かれています。

| フォルダ | 役割 | いつ使うか |
| --- | --- | --- |
| `data/` | サンプルデータを作り、SQLite（`data/rdb/`）と Neo4j（`data/graphdb/`）に登録する | 最初に1回（データを作り直す時も） |
| `services/` | データの取得とデジタルツイン本体。API と精度評価の両方から使う | API の起動中ずっと |
| `evaluation/` | 2種類のツインの精度を比較する | 精度を確かめたい時 |

```
【1. データ準備】 data/
  ontology/customer_ontology.yaml・survey_ontology.yaml（顧客とアンケートのオントロジー）→ knowledge.py が読み込む
     │
     ├─▶ rdb/create_sqlite.py       ──▶ SQLite (data/rdb/customers.db)
     │                                        │
     └─▶ graphdb/build_graphdb.py ◀───────────┘ SQLite の顧客データを読む
                │
                ▼
            Neo4j（知識グラフ）

【2. デジタルツイン】 services/
  db.py（SQLite を読む）      ──▶ twins.py の RDB版ツイン          （LangChain + Claude）
  ontology.py（Neo4j を読む） ──▶ twins.py のオントロジー版ツイン  （LangChain + Claude）

【3. 利用】
  main.py (FastAPI) ──▶ frontend (React)     … 画面からツインと対話・実データと見比べる
  evaluation/evaluate.py                     … アンケート回答の精度を比較
```

## ディレクトリ構成

```
.
├── README.md
├── backend/
│   ├── main.py                # FastAPI（API サーバー）のエントリーポイント
│   ├── requirements.txt       # Python の依存パッケージ
│   ├── .env.example           # 環境変数のサンプル（.env にコピーして使う）
│   ├── data/                      # 1. データ準備
│   │   ├── ontology/              #   ── オントロジー（意味の定義。RDB・グラフDB の両方から使う）
│   │   │   ├── customer_ontology.yaml  # 顧客のオントロジー（価値観・趣味・ブランド・都道府県とその関係）
│   │   │   ├── survey_ontology.yaml    # アンケートのオントロジー（質問と、正解データ作成用の重み）
│   │   │   └── knowledge.py       #      上の2つの YAML を読み込み、書き間違いをチェックする
│   │   ├── rdb/                   #   ── RDB（SQLite）
│   │   │   ├── schema.sql         #      テーブル定義（テーブル構成の正式な定義）
│   │   │   ├── create_sqlite.py   #      サンプルデータ(顧客100人 + アンケート)を SQLite に作成
│   │   │   └── customers.db       #      create_sqlite.py で作られる SQLite のファイル（git 管理外）
│   │   └── graphdb/               #   ── グラフDB（Neo4j）
│   │       └── build_graphdb.py   #      オントロジーと SQLite のデータを Neo4j にナレッジグラフとして登録
│   ├── services/              # 2. API と精度評価から使う処理
│   │   ├── db.py              #   SQLite からデータを取得する関数（取得結果の型も定義）
│   │   ├── ontology.py        #   Neo4j からグラフを取得する関数
│   │   └── twins.py           #   2種類のデジタルツイン（LangChain）
│   └── evaluation/            # 3. 精度検証
│       └── evaluate.py        #   アンケート回答の精度比較スクリプト
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts     # Tailwind の設定と、/api をバックエンドへ転送する設定
    └── src/
        ├── main.tsx
        ├── index.css      # Tailwind の読み込みとフォントの設定
        ├── api.ts         # バックエンドとの通信・型定義
        ├── App.tsx        # 画面全体のレイアウト（サイドメニュー＋メイン）とページの切り替え
        ├── pages/
        │   ├── ChatPage.tsx   # 「ツインと対話」ページ
        │   └── DataPage.tsx   # 「実データ確認」ページ（属性・アンケート・オントロジー・ツインへの入力）
        └── components/
            ├── Sidebar.tsx        # 左のサイドメニュー（顧客の検索・選択）
            ├── ProfileCard.tsx    # 顧客の趣味嗜好カード
            ├── OntologyGraph.tsx  # Neo4j のグラフを SVG で描画
            └── ChatPanel.tsx      # ツインとの会話表示
```

## データ設計

### SQLite（RDB）

テーブルの正式な定義は [`backend/data/rdb/schema.sql`](backend/data/rdb/schema.sql) です。
Python で取得したときのデータの形（カラム名と型）は、[`backend/services/db.py`](backend/services/db.py) の `Customer` / `Question` 型で確認できます。
テーブルを変更するときは、この2つのファイルを合わせて直してください。以下の表は、各カラムの意味と例の説明です。

**customers**（顧客 100 人）

| カラム | 内容 | 例 |
| --- | --- | --- |
| customer_id | 顧客ID | 1 |
| name / name_kana | 氏名 / フリガナ | 山崎 晃 / ヤマザキ アキラ |
| gender / age | 性別 / 年齢 | 男性 / 19 |
| prefecture / city | 住所（都道府県 / 市区町村） | 新潟県 / 長岡市 |
| occupation / annual_income | 職業 / 年収のレンジ | 学生 / 0〜100万円 |
| household / has_children | 家族構成 / 子どもの有無 | 一人暮らし / 0 |
| hobbies | 趣味（カンマ区切り） | ランニング,釣り |
| personal_values | 価値観（カンマ区切り） | アウトドア志向 |
| favorite_brands | 好きなブランド（カンマ区切り） | パタゴニア,スノーピーク |
| shopping_channel | よく使う買い物チャネル | EC中心 |
| monthly_spending | 世帯の月の消費額のレンジ | 10万〜15万円 |

**survey_questions**（アンケートの質問サマリ：10問）

| カラム | 内容 |
| --- | --- |
| question_id | 質問ID |
| category | 質問カテゴリ（購買行動、食生活 など） |
| question_text | 質問文（例: 環境に配慮した商品を優先して買う） |

**survey_answers**（アンケート回答：100人 × 10問 = 1,000件）

| カラム | 内容 |
| --- | --- |
| answer_id | 回答ID |
| customer_id | 顧客ID（customers を参照） |
| question_id | 質問ID（survey_questions を参照） |
| answer | 1=全くそう思わない 〜 5=とてもそう思う |

> アンケート回答はダミーです。`data/rdb/create_sqlite.py` の `make_answer()` で、
> 顧客の趣味・価値観・ブランド・居住エリアなどから「もっともらしい回答」を作り、少しだけランダムな揺らぎを加えています。

### Neo4j（オントロジー）

SQLite では「趣味 = キャンプ」という“値”でしかなかった情報を、**概念どうしの関係** としてグラフで表します。

```
(Customer) -[LIVES_IN]->      (City) -[LOCATED_IN]-> (Prefecture) -[PART_OF]-> (Region)
                                                     (Prefecture) -[HAS_AREA_TYPE]-> (AreaType: 都市部/地方)
(Customer) -[WORKS_AS]->      (Occupation)
(Customer) -[IN_AGE_GROUP]->  (AgeGroup: 30代 など)
(Customer) -[HAS_HOUSEHOLD]-> (Household)
(Customer) -[SHOPS_VIA]->     (Channel)
(Customer) -[ENJOYS]->        (Hobby) -[BELONGS_TO]-> (HobbyCategory)
                              (Hobby) -[SUGGESTS]->   (Value)
(Customer) -[LIKES]->         (Brand) -[IN_CATEGORY]-> (ProductCategory)
                              (Brand) -[REFLECTS]->    (Value)
(Customer) -[HOLDS]->         (Value)
```

オントロジー版ツインには、このグラフに加えて「価値観とその根拠」（例: `アウトドア志向（根拠3件）: 釣り(Hobby)がSUGGESTS, パタゴニア(Brand)がREFLECTS, 本人がHOLDS`）を渡します。

## セットアップと起動手順

### 0. 必要なもの

- Python 3.11 以上
- Node.js 20 以上
- Docker（Neo4j の起動に使用）
- Anthropic の API キー

### 1. Neo4j を起動する（Docker）

```bash
docker run -d --name neo4j-twin \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5
```

起動後、ブラウザで http://localhost:7474 を開くと Neo4j Browser が使えます（ユーザー `neo4j` / パスワード `password`）。
2回目以降は `docker start neo4j-twin` で起動できます。

### 2. バックエンドの準備

```bash
cd backend

# 仮想環境を作って依存パッケージをインストール
python -m venv .venv
source .venv/bin/activate        # Windows の場合: .venv\Scripts\activate
pip install -r requirements.txt

# 環境変数を設定（.env を開いて ANTHROPIC_API_KEY を書き換える。ANTHROPIC_MODEL も必須）
cp .env.example .env

# サンプルデータを SQLite に作成 → data/rdb/customers.db ができる
python -m data.rdb.create_sqlite

# SQLite のデータを Neo4j にオントロジーとして登録
python -m data.graphdb.build_graphdb

# API サーバーを起動
uvicorn main:app --reload

# 必要なパッケージがインストール済みの場合は以下コマンドだけで起動
source .venv/bin/activate && uvicorn main:app --reload
```

> Python のコマンドは、すべて `backend/` ディレクトリで実行します。
> `python -m data.rdb.create_sqlite` は「`data/rdb/create_sqlite.py` を実行する」という意味です（フォルダの区切り `/` を `.` で書きます）。
> `-m` を付けて実行すると、`data/` や `services/` のファイルどうしを `from services import db` のように読み込めます。

http://localhost:8000/docs を開くと API を試せます。

| API | 内容 |
| --- | --- |
| `GET /api/customers` | 顧客一覧 |
| `GET /api/customers/{id}` | 顧客の詳細（RDB データ）と Neo4j のグラフ |
| `GET /api/customers/{id}/survey` | アンケートの質問と、その顧客の実際の回答 |
| `GET /api/customers/{id}/twin-profiles` | 各ツインに渡しているプロフィールの文章 |
| `POST /api/customers/{id}/twin-survey` | ツインにアンケートへ回答させる（`twin_type` を指定。Claude API を呼ぶ） |
| `POST /api/chat` | ツインと対話（`twin_type` に `rdb` または `ontology` を指定） |

### 3. フロントエンドの起動

別のターミナルで実行します。

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 を開きます。

左のサイドメニューで、ページと顧客を選びます。

- **ツインと対話**: 顧客の **趣味・価値観・好きなブランド** と **オントロジーのグラフ** が表示されます。入力欄から質問を送ると、**RDB版とオントロジー版の両方のツインが同時に回答** するので、答え方の違いを比べられます
- **実データ確認**: ツインが本人を正しく再現できているかを、実データと照らし合わせて確認するページです
  - **属性**: SQLite の customers テーブルの1行（カラム名つき）
  - **アンケート結果**: 実際の回答。「ツインに回答させて比較」を押すと、2つのツインに同じアンケートを回答させ、実際の回答とのズレ（一致数・MAE）を表示します
  - **オントロジー**: Neo4j のグラフと、関係（ノード -[関係]-> ノード）の一覧
  - **ツインへの入力**: 各ツインのシステムプロンプトに埋め込んでいるプロフィールの文章

### 4. 精度を比較する

```bash
cd backend
python -m evaluation.evaluate --limit 10     # 先頭10人で評価（100人全員なら --limit 100）
```

各ツインにアンケート（10問）へ回答させ、SQLite の実際の回答と比べて次の指標を出します。

| 指標 | 意味 |
| --- | --- |
| 完全一致率 | 予測した回答が実際の回答とぴったり一致した割合（高いほど良い） |
| ±1以内の一致率 | 予測と実際の差が1以内だった割合（高いほど良い） |
| 平均絶対誤差(MAE) | 予測と実際の差の平均（低いほど良い） |

> 1人あたり各ツイン1回ずつ API を呼び出します（`--limit 100` で計200回）。料金に注意してください。

## オントロジーを Neo4j Browser で見る

http://localhost:7474 で次の Cypher を実行すると、顧客1人の関係をグラフで確認できます。

```cypher
// 顧客ID=1 の人から3ホップ先までの関係
MATCH p = (c:Customer {id: 1})-[*1..3]->()
RETURN p
```

```cypher
// 「アウトドア志向」につながる趣味・ブランドを持つ顧客
MATCH (c:Customer)-[:ENJOYS|LIKES]->(x)-[:SUGGESTS|REFLECTS]->(:Value {name: "アウトドア志向"})
RETURN c.name, collect(x.name) AS 根拠
```

## カスタマイズのヒント

- **モデルの変更**: `.env` の `ANTHROPIC_MODEL` を変更（例: `claude-sonnet-5-5` にすると安く速くなる）
- **概念の関係を増やす**: `data/ontology/customer_ontology.yaml` の `hobbies` / `brands` などを編集し、`python -m data.rdb.create_sqlite && python -m data.graphdb.build_graphdb` を再実行（存在しない価値観を参照するとエラーで教えてくれます）
- **質問を増やす**: `data/ontology/survey_ontology.yaml` の `questions` に追加し、同様に再実行
