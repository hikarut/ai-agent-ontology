"""2種類のデジタルツインの精度を比較するスクリプト。

各ツインにアンケートへ回答させ、SQLite に入っている実際の回答と比べます。
実行: python -m evaluation.evaluate --limit 10   （backend/ で実行。--limit で評価する顧客数を指定。最大100）
"""

import argparse

from services import db, twins


def evaluate(twin_type: str, customer_ids: list[int], questions: list[dict]) -> dict:
    predictions = twins.answer_surveys(customer_ids, twin_type, questions)
    errors = []  # |予測 - 実際| のリスト
    for cid, predicted in zip(customer_ids, predictions):
        actual = db.get_answers(cid)
        errors += [abs(predicted.get(qid, 3) - ans) for qid, ans in actual.items()]
    return {
        "完全一致率": sum(e == 0 for e in errors) / len(errors),
        "±1以内の一致率": sum(e <= 1 for e in errors) / len(errors),
        "平均絶対誤差(MAE)": sum(errors) / len(errors),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="評価する顧客数")
    args = parser.parse_args()

    customer_ids = [c["customer_id"] for c in db.list_customers()][: args.limit]
    questions = db.get_questions()
    print(f"顧客 {len(customer_ids)} 人 × 質問 {len(questions)} 問で評価します...\n")

    results = {name: evaluate(name, customer_ids, questions) for name in ["rdb", "ontology"]}

    print(f"{'指標':<16}{'RDB版':>10}{'オントロジー版':>14}")
    for metric in results["rdb"]:
        print(f"{metric:<16}{results['rdb'][metric]:>10.3f}{results['ontology'][metric]:>14.3f}")
    print("\n※ 一致率は高いほど、MAE は低いほど精度が良い")


if __name__ == "__main__":
    main()
