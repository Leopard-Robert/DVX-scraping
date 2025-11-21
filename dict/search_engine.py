import json
import re
from rapidfuzz import fuzz

# ---------------------------
# CONFIGURATION
# ---------------------------

# List of database files to load
DB_FILES = [
    "engine_data.json",
    "engine_codes.json"
]

# Optional: assign specific weight to each file.
DB_WEIGHTS = {
    "engine_data.json": 1.0,
    "engine_codes.json": 0.7
}

# ---------------------------
# HELPER FUNCTIONS
# ---------------------------

def normalize(s):
    """Normalize a string for fuzzy matching: lowercase, remove spaces and hyphens"""
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s.lower())

def load_databases(file_list):
    """
    Load multiple JSON database files.
    Each file has a weight from DB_WEIGHTS, default=1.0.
    Returns a list of tuples: (database_dict, weight)
    """
    engine_dicts = []
    for file in file_list:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
        weight = DB_WEIGHTS.get(file, 1.0)
        engine_dicts.append((data, weight))
    return engine_dicts

def extract_query_tokens(query):
    """
    Extract tokens from user query:
    engine_name, year, engine_type, chassis, model
    """
    query = query.lower()
    engine_name = re.search(r"[nN]\d{2}\s?[A-Z0-9]{2,3}", query)
    engine_name = engine_name.group() if engine_name else ""
    year = re.search(r"\b(19|20)\d{2}\b", query)
    year = year.group() if year else ""
    engine_type = ""
    if "petrol" in query:
        engine_type = "petrol engine"
    elif "diesel" in query:
        engine_type = "diesel engine"
    chassis_match = re.search(r"[fe]\d{2}[a-zA-Z0-9]*", query)
    chassis = chassis_match.group() if chassis_match else ""
    model = query
    for x in [engine_name, engine_type, year, chassis]:
        if x:
            model = model.replace(x.lower(), "")
    model = normalize(model.strip())
    return {
        "engine_name": normalize(engine_name),
        "engine_type": normalize(engine_type),
        "year": year,
        "chassis": normalize(chassis),
        "model": model
    }

def match_chassis(query_chassis, chassis_patterns):
    """Check if query chassis matches any pattern in DB"""
    query = query_chassis.lower()
    for pattern in chassis_patterns:
        if re.fullmatch(pattern, query):
            return True
    return False

def weighted_match_score(query_tokens, entry_tokens, weights=None):
    """Compute weighted match score between query and DB entry"""
    if weights is None:
        weights = {
            "engine_name": 0.05,
            "model": 0.45,
            "year": 0.1,
            "engine_type": 0.25,
            "chassis": 0.15
        }
    score = 0.0
    score += fuzz.token_sort_ratio(query_tokens["engine_name"], entry_tokens["engine_name"]) * weights["engine_name"]
    score += fuzz.token_sort_ratio(query_tokens["engine_type"], entry_tokens["engine_type"]) * weights["engine_type"]
    model_scores = [fuzz.token_sort_ratio(query_tokens["model"], m) for m in entry_tokens["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]
    if query_tokens["year"] in entry_tokens["year"]:
        score += 100 * weights["year"]
    if query_tokens["chassis"] and match_chassis(query_tokens["chassis"], entry_tokens["chassis"]):
        score += 100 * weights["chassis"]
    return score

def search_engine(query, engine_dicts, top_n=5):
    """
    Perform fuzzy search across multiple database files.
    Each file has its own weight applied to score.
    """
    query_tokens = extract_query_tokens(query)
    results = []
    for data, db_weight in engine_dicts:
        for code, entry in data.items():
            score = weighted_match_score(query_tokens, entry["tokens"])
            score *= db_weight
            results.append({
                "engine_code": code,
                "score": score,
                "description": entry["engine_info"]
            })
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]

# ---------------------------
# MAIN PROGRAM
# ---------------------------
if __name__ == "__main__":
    engine_dicts = load_databases(DB_FILES)
    print(f"Loaded {len(engine_dicts)} database files.")

    while True:
        q = input("\nEnter query: ").strip()
        if not q:
            continue
        results = search_engine(q, engine_dicts)
        for r in results:
            print(f"{r['engine_code']} ({r['score']:.1f}%) → {r['description']}")
        print("-" * 60)
