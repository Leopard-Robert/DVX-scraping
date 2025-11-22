import subprocess
import sys

# List of required modules
required_modules = [
    "fastapi",
    "uvicorn",
    "pydantic",
    "rapidfuzz"
]

# Install any missing modules
for module in required_modules:
    try:
        __import__(module)
    except ImportError:
        print(f"Installing missing module: {module}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", module])




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
    "engine_data.json",   # High priority
    "engine_codes.json"   # Lower priority
]

DB_WEIGHTS = {
    "engine_data.json": 1.0,
    "engine_codes.json": 0.75
}

BRAND_ALIASES = {
    "volkswagen": "volkswagen",
    "volkswagen": "vw",
    "vw": "vw",
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

ENGINE_TYPE_MAP = {
    "petrol": "petrol",
    "petrol engine": "petrol",
    "gasoline": "petrol",
    "diesel": "diesel",
    "diesel engine": "diesel",
    "hybrid": "hybrid",
    "pluginhybrid": "hybrid",
    "plug-in hybrid": "hybrid",
    "phev": "hybrid"
}

SCORING_WEIGHTS = {
    "model": 0.5,
    "engine_type": 0.3,
    "car_type": 0.2,
    "year": 0.4,
    "engine_name": 0.25,
    "hp": 0.1
}

# -----------------------------------------------
# HELPERS
# -----------------------------------------------

def normalize(s):
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s.lower())

def normalize_brand(q):
    if not q:
        return ""
    q = q.lower()
    return BRAND_ALIASES.get(q, q)

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
# STEP 0: PARSE QUERY
# -----------------------------------------------

def parse_query(query: str):
    parts = [p.strip() for p in query.split("|")]
    while len(parts) < 6:
        parts.append(None)
    brand, model, type_name, engine_name, hp, fuel_type = parts
    return {
        "brand": normalize_brand(brand),
        "model": normalize(model),
        "type_name": normalize(type_name),
        "engine_name": normalize(engine_name),
        "hp": int(hp) if hp and hp.isdigit() else None,
        "engine_type": normalize_engine_type(fuel_type)
    }

# -----------------------------------------------
# STEP 1: BRAND FILTER
# -----------------------------------------------

def step1_brand_filter(query_tokens, engine_dicts):
    filtered_entries = []

    # Brands that must always use DB2
    db2_only_brands = ["vw", "volkswagen", "aston martin", "bentley", "lamborghini"]

    use_db2_only = query_tokens["brand"] in db2_only_brands

    for idx, (data, db_weight) in enumerate(engine_dicts):
        if use_db2_only and idx == 0:  # Skip DB1 if DB2 only brand
            continue

        for code, entry in data.items():
            first_car = entry.get("cars", [{}])[0]
            category = first_car.get("category", "")
            entry_brand = normalize_brand(category.split()[0]) if category else ""

            if query_tokens["brand"] and query_tokens["brand"] != entry_brand:
                continue

            filtered_entries.append((code, entry, db_weight))

    return filtered_entries

# -----------------------------------------------
# STEP 2: WEIGHTED FUZZY SEARCH
# -----------------------------------------------

def weighted_match_score(query, entry, weights):
    score = 0.0

    # Model score
    model_scores = [fuzz.token_sort_ratio(query["model"], m) for m in entry["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]

    # Fuel type score
    fuel_type_entry = entry.get("engine_type") or ""
    score += fuzz.token_sort_ratio(query["engine_type"], fuel_type_entry) * weights["engine_type"]

    # Car type / chassis score
    chassis_list = entry.get("chassis", [])
    chassis_scores = [fuzz.token_sort_ratio(query["type_name"], c) for c in chassis_list]
    if chassis_scores:
        score += max(chassis_scores) * weights["car_type"]

    # Engine name
    score += fuzz.token_sort_ratio(query["engine_name"], entry.get("engine_name", "")) * weights["engine_name"]

    # Year match (from tokens.year)
    if match_year_range(None, None, entry.get("year", [])):
        score += 100 * weights["year"]

    # HP score (if available)
    hp_entry = entry.get("engine_info", {}).get("Horsepower (HP)")
    if query["hp"] and hp_entry:
        hp_score = max(0, 100 - abs(query["hp"] - int(hp_entry)))
        score += hp_score * weights["hp"]

    return score

def step2_fuzzy_search(query_tokens, candidate_entries, top_n=5):
    results = []
    for code, entry, db_weight in candidate_entries:
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
# FULL SEARCH
# -----------------------------------------------

def search_three_step(query, engine_dicts, top_n=5):
    query_tokens = parse_query(query)
    step1_candidates = step1_brand_filter(query_tokens, engine_dicts)
    results = step2_fuzzy_search(query_tokens, step1_candidates, top_n)
    return results

# -----------------------------------------------
# FASTAPI
# -----------------------------------------------

app = FastAPI()
class QueryRequest(BaseModel):
    text: str

engine_dicts = load_databases(DB_FILES)

@app.post("/query_three_step")
def query_three_step_endpoint(request: QueryRequest):
    res = search_three_step(request.text, engine_dicts, top_n=5)
    return {"query": request.text, "results": res}

# -----------------------------------------------
# USAGE EXAMPLE
# -----------------------------------------------

    # Run FastAPI server: uvicorn this_file:app --reload

# if __name__ == "__main__":
#     engine_dicts = load_databases(DB_FILES)
#     print(f"Loaded {len(engine_dicts)} database files.")

#     while True:
#         q = input("\nEnter query: ").strip()
#         if not q:
#             continue

#         results = search_three_step(q, engine_dicts, top_n=10)
#         for r in results:
#             print(f"{r['engine_code']} ({r['score']:.1f}%) → {r['description']}")
#         print("-" * 60)

if __name__ == "__main__":
    print("Loaded databases:", len(engine_dicts))
    uvicorn.run(app, host="172.20.1.146", port=8000)
