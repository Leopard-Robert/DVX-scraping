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

BRAND_ALIASES = {
    "volkswagen" : "vw",
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
# HELPER FUNCTIONS
# ---------------------------

def normalize(s):
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s.lower())

def normalize_brand(q):
    """Normalize brand words in query using alias map."""
    q = q.lower()
    for b in BRAND_ALIASES:
        if b in q:
            q = q.replace(b, BRAND_ALIASES[b])
    return q


def load_databases(file_list):
    engine_dicts = []
    for file in file_list:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
        weight = DB_WEIGHTS.get(file, 1.0)
        engine_dicts.append((data, weight))
    return engine_dicts


# ---------------------------
# YEAR RANGE PARSING
# ---------------------------

def parse_year(text):
    """Extract a single year (int) or return None."""
    m = re.search(r"(19|20)\d{2}", text)
    return int(m.group()) if m else None


def parse_year_range(text):
    """
    Convert things like:
    "2015 -> 2019"
    "... -> 2017"
    "2018 -> ..."
    "2015"
    into (start, end)
    """
    text = text.replace("...", "").strip()

    # Range format: "YYYY -> YYYY"
    if "->" in text:
        left, right = text.split("->")
        left = left.strip()
        right = right.strip()

        start = parse_year(left)
        end = parse_year(right)

        return start, end

    # Single year
    y = parse_year(text)
    if y:
        return (y, y)

    return (None, None)


def match_year_range(query_start, query_end, db_year_list):
    """
    Safe overlap check between query year range and DB year ranges.
    Handles None safely (NO crashes).
    """
    if not db_year_list:
        return False

    # No query year in input
    if query_start is None and query_end is None:
        return False

    q_start = query_start
    q_end = query_end

    for y_str in db_year_list:
        db_start, db_end = parse_year_range(y_str)

        if db_start is None and db_end is None:
            continue

        # Convert single year
        if db_start is None:
            db_start = db_end
        if db_end is None:
            db_end = db_start

        # ---- Overlap logic ----

        # Case: ... -> Y  (query_end only)
        if q_start is None and q_end is not None:
            if db_start <= q_end:
                return True

        # Case: Y -> ...  (query_start only)
        if q_end is None and q_start is not None:
            if db_end >= q_start:
                return True

        # Full range given: Y1 -> Y2
        if q_start is not None and q_end is not None:
            # check overlap
            if not (q_end < db_start or q_start > db_end):
                return True

    return False


# ---------------------------
# QUERY TOKEN EXTRACTION
# ---------------------------

def extract_query_tokens(query):
    q = normalize_brand(query.lower())

    # Engine name (BMW style)
    engine_name = re.search(r"[nN]\d{2}\s?[A-Z0-9]{2,3}", q)
    engine_name = engine_name.group() if engine_name else ""

    # Year range patterns
    # Example: "2015 -> 2019" or "2015-2019" or "2015~2019"
    range_match = re.search(r"(19|20)\d{2}\s*[-~>]+\s*(19|20)\d{2}", q)
    query_start = None
    query_end = None
    if range_match:
        yr1 = int(range_match.group(1) + query[range_match.start():range_match.end()][2:4])
        yr2 = int(range_match.group(2) + query[range_match.start():range_match.end()][-2:])
        query_start = yr1
        query_end = yr2

    # Single year
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

    # Remove detected tokens from model text
    model = q
    for x in [engine_name, str(year) if year else "", chassis]:
        if x:
            model = model.replace(x.lower(), "")
    model = normalize(model.strip())

    return {
        "engine_name": normalize(engine_name),
        "engine_type": normalize(engine_type),
        "year_start": query_start,
        "year_end": query_end,
        "chassis": normalize(chassis),
        "model": model
    }


def match_chassis(query_chassis, chassis_patterns):
    q = query_chassis.lower()
    for pattern in chassis_patterns:
        if re.fullmatch(pattern, q):
            return True
    return False


# ---------------------------
# SCORING (UNCHANGED)
# ---------------------------

def weighted_match_score(query_tokens, entry_tokens, weights=None):
    if weights is None:
        weights = {
            "engine_name": 0.05,
            "model": 0.8,
            "year": 0.2,
            "engine_type": 0.25,
        }

    score = 0.0

    score += fuzz.token_sort_ratio(query_tokens["engine_name"], entry_tokens["engine_name"]) * weights["engine_name"]
    score += fuzz.token_sort_ratio(query_tokens["engine_type"], entry_tokens["engine_type"]) * weights["engine_type"]

    # Model fuzzy
    model_scores = [fuzz.token_sort_ratio(query_tokens["model"], m) for m in entry_tokens["model"]]
    if model_scores:
        score += max(model_scores) * weights["model"]

    # Year-range match
    if match_year_range(query_tokens["year_start"], query_tokens["year_end"], entry_tokens["year"]):
        score += 100 * weights["year"]

    return score


# ---------------------------
# SEARCH ENGINE
# ---------------------------

def search_engine(query, engine_dicts, top_n=5):
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
