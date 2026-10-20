-- SQLite のテーブル定義（このファイルがテーブル構成の正式な定義です）
-- data/create_sqlite.py の実行時に読み込まれ、テーブルを作り直します。

DROP TABLE IF EXISTS survey_answers;
DROP TABLE IF EXISTS survey_questions;
DROP TABLE IF EXISTS customers;

-- 顧客（100人）
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
