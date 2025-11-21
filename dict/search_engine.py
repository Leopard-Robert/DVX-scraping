import json
import re
from rapidfuzz import fuzz

DICT_FILE = "engine_data.json"


def normalize(s):
    if not s: return ""
    return re.sub(r"[\s\-]+", "", s.lower())


def load_engine_dict():
    with open(DICT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def weighted_match_score(query_tokens, entry_tokens, weights=None):
    if weights is None:
        weights = {"engine_name": 0.4, "model": 0.3, "year": 0.2, "engine_type": 0.1}

    score = 0.0

    # engine_name
    score += fuzz.token_sort_ratio(query_tokens["engine_name"], entry_tokens["engine_name"]) * weights["engine_name"]

    # engine_type
    score += fuzz.token_sort_ratio(query_tokens["engine_type"], entry_tokens["engine_type"]) * weights["engine_type"]

    # model (take best matching model)
    model_scores = [fuzz.token_sort_ratio(query_tokens["model"], m) for m in entry_tokens["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]

    # year (simple exact match)
    if query_tokens["year"] in entry_tokens["year"]:
        score += 100 * weights["year"]

    return score


def extract_query_tokens(query):
    """
    Very simple extraction: user input like:
    "BMW 116i E81 2008 N45 B16 A petrol"
    """
    query = query.lower()
    engine_name = re.search(r"[nN]\d{2}\s?[A-Z0-9]{2,3}", query)
    engine_name = engine_name.group() if engine_name else ""

    # Extract year
    year = re.search(r"\b(19|20)\d{2}\b", query)
    year = year.group() if year else ""

    # Extract engine type keywords
    engine_type = ""
    if "petrol" in query:
        engine_type = "petrol engine"
    elif "diesel" in query:
        engine_type = "diesel engine"

    # Model is everything else except engine name/type/year
    model = query
    for x in [engine_name, engine_type, year]:
        if x:
            model = model.replace(x.lower(), "")

    model = normalize(model.strip())

    return {
        "engine_name": normalize(engine_name),
        "engine_type": normalize(engine_type),
        "year": year,
        "model": model
    }


def search_engine(query, engine_dict, top_n=3):
    query_tokens = extract_query_tokens(query)
    results = []

    for code, data in engine_dict.items():
        score = weighted_match_score(query_tokens, data["tokens"])
        results.append({
            "engine_code": code,
            "score": score,
            "description": data["engine_info"]
        })

    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


if __name__ == "__main__":
    engine_dict = load_engine_dict()

    while True:
        q = input("\nEnter query: ").strip()
        if not q:
            continue

        results = search_engine(q, engine_dict)
        for r in results:
            print(f"{r['engine_code']} ({r['score']:.1f}%) → {r['description']}")
        print("-" * 60)
