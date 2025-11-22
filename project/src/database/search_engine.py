import json
import re
from rapidfuzz import fuzz
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# -----------------------------------------------
# CONFIGURATION
# -----------------------------------------------

DATA_DIR = "./database"

DB_FILES = [
    "engine_data.json",
    "engine_codes.json"
]

DB_WEIGHTS = {
    "engine_data.json": 1.0,
    "engine_codes.json": 0.75
}

# Brand normalization
BRAND_ALIASES = {
    "volkswagen": "volkswagen",
    "volkswagen": "vw",
    "vw": "vw",
    "volkswagon": "vw",
    "bmw": "bmw",
    "mercedes": "mercedes",
    "mercedes-benz": "mercedes",
    "mb": "mercedes",
    "audi": "audi",
    "porsche": "porsche",
    "cupra": "cupra",
    "skoda": "skoda",
    "seat": "seat",
    "mini": "mini",
    "lamborghini": "lamborghini",
    "bentley": "bentley",
    "aston martin": "aston martin"
}

# NEW — Normalize engine fuel types
ENGINE_TYPE_MAP = {
    "petrol": "petrol",
    "petrol engine": "petrol",
    "gasoline": "petrol",

    "diesel": "diesel",
    "diesel engine": "diesel",

    "hybrid": "hybrid",
    "pluginhybrid": "hybrid",
    "plug-in hybrid": "hybrid",
    "phev": "hybrid",
}

SCORING_WEIGHTS = {
    "model": 0.50,
    "engine_type": 0.20,
    "car_type": 0.15,
    "year": 0.15,
    "engine_name": 0.05
}

# -----------------------------------------------
# HELPERS
# -----------------------------------------------

def normalize(s):
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s.lower())

def normalize_brand(q):
    q = q.lower()
    for key, alias in BRAND_ALIASES.items():
        if key in q:
            q = q.replace(key, alias)
    return q

def normalize_engine_type(t):
    if not t:
        return ""
    t = t.lower().strip()
    for key, val in ENGINE_TYPE_MAP.items():
        if key in t:
            return val
    return t

def load_databases(file_list):
    result = []
    for file in file_list:
        with open(f"{DATA_DIR}/{file}", "r", encoding="utf-8") as f:
            data = json.load(f)
        weight = DB_WEIGHTS.get(file, 1.0)
        result.append((data, weight))
    return result

def parse_year(text):
    m = re.search(r"(19|20)\d{2}", text)
    return int(m.group()) if m else None

def parse_year_range(text):
    text = text.replace("...", "").strip()
    if "->" in text:
        left, right = text.split("->")
        return parse_year(left.strip()), parse_year(right.strip())
    y = parse_year(text)
    return (y, y) if y else (None, None)

def match_year_range(query_start, query_end, db_year_list):
    if not db_year_list:
        return False
    for y_str in db_year_list:
        db_start, db_end = parse_year_range(y_str)
        if db_start is None and db_end is None:
            continue
        if db_start is None: db_start = db_end
        if db_end is None: db_end = db_start
        # Overlap check
        if query_start is None and query_end is not None:
            if db_start <= query_end:
                return True
        elif query_end is None and query_start is not None:
            if db_end >= query_start:
                return True
        elif query_start is not None and query_end is not None:
            if not (query_end < db_start or query_start > db_end):
                return True
    return False

# -----------------------------------------------
# QUERY PARSER (UPDATED)
# -----------------------------------------------

def extract_query_tokens(query):
    q = normalize_brand(query)

    # Extract engine code-like patterns
    engine_name = re.search(r"[MN]\d{2,3}\s?[A-Z0-9]{2,3}", q)
    engine_name = engine_name.group() if engine_name else ""

    # Extract HP
    hp_match = re.search(r"(\d{2,4})\s?(hp|ps|pk|bhp)", q)
    hp = int(hp_match.group(1)) if hp_match else None

    # Year and range
    range_match = re.search(r"(19|20)\d{2}\s*[-~>]+\s*(19|20)\d{2}", q)
    qs, qe = (None, None)
    if range_match:
        qs, qe = parse_year_range(range_match.group())
    year = parse_year(q)
    if year and qs is None:
        qs = qe = year

    # Fuel type — normalized
    detected_type = ""
    if "petrol" in q or "gasoline" in q:
        detected_type = "petrol"
    elif "diesel" in q:
        detected_type = "diesel"
    elif "hybrid" in q or "phev" in q:
        detected_type = "hybrid"

    detected_type = normalize_engine_type(detected_type)

    # Car type
    car_type_match = re.search(
        r"(sedan|hatchback|coupe|suv|cabriolet|convertible|tourer|wagon|estate)",
        q
    )
    car_type = car_type_match.group() if car_type_match else ""

    # Model = leftover
    model = normalize(q)

    return {
        "brand": extract_brand_from_query(q),
        "engine_name": normalize(engine_name),
        "engine_type": normalize_engine_type(detected_type),
        "year_start": qs,
        "year_end": qe,
        "hp": hp,
        "model": model,
        "car_type": normalize(car_type)
    }

def extract_brand_from_query(text):
    for key, alias in BRAND_ALIASES.items():
        if key in text:
            return alias
    return ""

# -----------------------------------------------
# SCORING
# -----------------------------------------------

def weighted_match_score(query, entry, weights):
    score = 0.0

    # Model score
    model_scores = [fuzz.token_sort_ratio(query["model"], m) for m in entry["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]

    # Fuel type match
    score += fuzz.token_sort_ratio(query["engine_type"], entry["engine_type"]) * weights["engine_type"]

    # Car type match
    score += fuzz.token_sort_ratio(query["car_type"], entry.get("car_type", "")) * weights["car_type"]

    # Year match
    if match_year_range(query["year_start"], query["year_end"], entry["year"]):
        score += 100 * weights["year"]

    # Engine code match
    score += fuzz.token_sort_ratio(query["engine_name"], entry["engine_name"]) * weights["engine_name"]

    return score

# -----------------------------------------------
# TWO-STEP SEARCH ENGINE
# -----------------------------------------------

def search_engine(query, engine_dicts, top_n=5):
    query_tokens = extract_query_tokens(query)
    brand = query_tokens["brand"]

    # ---------------- Step 1: Brand Filter ----------------
    filtered_entries = []
    for data, db_weight in engine_dicts:
        for code, entry in data.items():
            entry_brand = entry["tokens"].get("brand", "")
            if brand and entry_brand != brand:
                continue
            filtered_entries.append((code, entry, db_weight))

    # If nothing matches brand → fallback to all
    if not filtered_entries:
        filtered_entries = [
            (code, entry, db_weight)
            for data, db_weight in engine_dicts
            for code, entry in data.items()
        ]

    # ---------------- Step 2: Weighted Fuzzy Ranking ----------------
    results = []
    for code, entry, db_weight in filtered_entries:
        s = weighted_match_score(query_tokens, entry["tokens"], SCORING_WEIGHTS)
        s *= db_weight
        results.append({
            "engine_code": code,
            "score": s,
            "description": entry["engine_info"]
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]

# -----------------------------------------------
# FASTAPI
# -----------------------------------------------

app = FastAPI()

class QueryRequest(BaseModel):
    text: str

engine_dicts = load_databases(DB_FILES)

@app.post("/query")
def query_endpoint(request: QueryRequest):
    res = search_engine(request.text, engine_dicts, top_n=5)
    return {"query": request.text, "results": res}


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

# if __name__ == "__main__":
#     print("Loaded databases:", len(engine_dicts))
#     uvicorn.run(app, host="127.0.0.1", port=8000)
