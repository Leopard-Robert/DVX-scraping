import json
import re
from rapidfuzz import fuzz

# ---------------------------
# CONFIGURATION
# ---------------------------

DB_FILES = [
    "engine_data.json",
    "engine_codes.json"
]

DB_WEIGHTS = {
    "engine_data.json": 1.0,
    "engine_codes.json": 0.75
}

# Brand aliases for query normalization
BRAND_ALIASES = {
    "volkswagen": "volkswagen",
    "volkswagen": "vw",
    "vw": "vw",
    "bmw": "bmw",
    "mercedes": "mercedes",
    "mercedes-benz": "mercedes",
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

# ---------------------------
# SCORING WEIGHTS
# You can adjust these to prioritize model/engine_type/car_type/year
# ---------------------------
SCORING_WEIGHTS = {
    "model": 0.5,          # Highest priority
    "engine_type": 0.2,
    "car_type": 0.15,      # New: type of the car
    "year": 0.15,
    "engine_name": 0.05
}

# ---------------------------
# HELPER FUNCTIONS
# ---------------------------

def normalize(s):
    """Normalize string for fuzzy matching: lowercase, remove spaces and hyphens"""
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s.lower())

def normalize_brand(q):
    """Replace brand names in query with aliases"""
    q = q.lower()
    for b in BRAND_ALIASES:
        if b in q:
            q = q.replace(b, BRAND_ALIASES[b])
    return q

def load_databases(file_list):
    """Load multiple JSON files, each with a weight"""
    engine_dicts = []
    for file in file_list:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
        weight = DB_WEIGHTS.get(file, 1.0)
        engine_dicts.append((data, weight))
    return engine_dicts

# ---------------------------
# YEAR RANGE FUNCTIONS
# ---------------------------

def parse_year(text):
    m = re.search(r"(19|20)\d{2}", text)
    return int(m.group()) if m else None

def parse_year_range(text):
    text = text.replace("...", "").strip()
    if "->" in text:
        left, right = text.split("->")
        start = parse_year(left.strip())
        end = parse_year(right.strip())
        return start, end
    y = parse_year(text)
    return (y, y) if y else (None, None)

def match_year_range(query_start, query_end, db_year_list):
    if not db_year_list:
        return False

    for y_str in db_year_list:
        db_start, db_end = parse_year_range(y_str)
        if db_start is None and db_end is None:
            continue
        if db_start is None:
            db_start = db_end
        if db_end is None:
            db_end = db_start

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

# ---------------------------
# QUERY TOKEN EXTRACTION
# ---------------------------

def extract_query_tokens(query):
    q = normalize_brand(query)

    # Engine name
    engine_name = re.search(r"[nN]\d{2}\s?[A-Z0-9]{2,3}", q)
    engine_name = engine_name.group() if engine_name else ""

    # Year ranges
    range_match = re.search(r"(19|20)\d{2}\s*[-~>]+\s*(19|20)\d{2}", q)
    query_start = None
    query_end = None
    if range_match:
        start, end = parse_year_range(range_match.group())
        query_start = start
        query_end = end

    year = parse_year(q)
    if year and query_start is None:
        query_start = year
        query_end = year

    # Engine type
    engine_type = ""
    if "petrol" in q:
        engine_type = "petrol engine"
    elif "diesel" in q:
        engine_type = "diesel engine"

    # Chassis
    chassis_match = re.search(r"[fe]\d{2}[a-zA-Z0-9]*", q)
    chassis = chassis_match.group() if chassis_match else ""

    # Car type (optional in query)
    car_type_match = re.search(r"(sedan|hatchback|coupe|suv|cabriolet|convertible|lc|lci|tourer|wagon|estate)", q)
    car_type = car_type_match.group() if car_type_match else ""

    # Model
    model = q
    for x in [engine_name, str(year) if year else "", chassis, car_type]:
        if x:
            model = model.replace(x.lower(), "")
    model = normalize(model.strip())

    return {
        "engine_name": normalize(engine_name),
        "engine_type": normalize(engine_type),
        "year_start": query_start,
        "year_end": query_end,
        "chassis": normalize(chassis),
        "model": model,
        "car_type": normalize(car_type)
    }

def match_chassis(query_chassis, chassis_patterns):
    q = query_chassis.lower()
    for pattern in chassis_patterns:
        if re.fullmatch(pattern, q):
            return True
    return False

# ---------------------------
# SCORING
# ---------------------------

def weighted_match_score(query_tokens, entry_tokens, weights=None):
    if weights is None:
        weights = SCORING_WEIGHTS

    score = 0.0

    # Model first
    model_scores = [fuzz.token_sort_ratio(query_tokens["model"], m) for m in entry_tokens["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]

    # Engine type
    score += fuzz.token_sort_ratio(query_tokens["engine_type"], entry_tokens["engine_type"]) * weights["engine_type"]

    # Car type
    if "car_type" in entry_tokens:
        score += fuzz.token_sort_ratio(query_tokens["car_type"], entry_tokens.get("car_type", "")) * weights["car_type"]

    # Year
    if match_year_range(query_tokens["year_start"], query_tokens["year_end"], entry_tokens["year"]):
        score += 100 * weights["year"]

    # Engine code
    score += fuzz.token_sort_ratio(query_tokens["engine_name"], entry_tokens["engine_name"]) * weights.get("engine_name", 0)

    return score

# ---------------------------
# SEARCH ENGINE
# ---------------------------

def search_engine(query, engine_dicts, top_n=5):
    query_tokens = extract_query_tokens(query)
    results = []

    for data, db_weight in engine_dicts:
        for code, entry in data.items():
            score = weighted_match_score(query_tokens, entry["tokens"], SCORING_WEIGHTS)
            score *= db_weight
            results.append({
                "engine_code": code,
                "score": score,
                "description": entry["engine_info"]
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]

# ---------------------------
# MAIN
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
