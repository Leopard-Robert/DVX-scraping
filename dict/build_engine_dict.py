import os
import json
import re

INPUT_DIR = "../ma"
OUTPUT_FILE = "engine_data.json"


def normalize(s):
    """Lowercase, remove extra spaces and dashes"""
    if not s: return ""
    return re.sub(r"[\s\-]+", "", s.lower())


def build_engine_dict(directory):
    engine_dict = {}

    for filename in os.listdir(directory):
        if not filename.endswith(".json"):
            continue

        path = os.path.join(directory, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Invalid JSON in {filename}: {e}")
            continue

        for item in data:
            engine_info = item.get("engine_info", {})
            cars = item.get("cars", [])
            code = engine_info.get("Enginecode")
            if not code:
                continue

            code = code.strip()
            engine_type = engine_info.get("Motortype", "").strip()
            engine_name = engine_info.get("Enginecode", "").strip()

            # Extract car models and years
            models = [c.get("model", "").strip() for c in cars if c.get("model")]
            years = [c.get("years", "").strip() for c in cars if c.get("years")]

            # Store normalized tokens for search
            tokens = {
                "model": [normalize(m) for m in models],
                "year": years,
                "engine_type": normalize(engine_type),
                "engine_name": normalize(engine_name)
            }

            # Save entry
            engine_dict[code] = {
                "engine_info": engine_info,
                "cars": cars,
                "tokens": tokens
            }

    return engine_dict


def main():
    engine_dict = build_engine_dict(INPUT_DIR)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(engine_dict, f, indent=4, ensure_ascii=False)
    print(f"Saved engine dictionary: {len(engine_dict)} entries.")


if __name__ == "__main__":
    main()
