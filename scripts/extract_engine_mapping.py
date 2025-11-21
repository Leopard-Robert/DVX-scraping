import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'project' / 'src' / 'supreme-tuning-master.json'
OUT = ROOT / 'engine_codes_mapping.json'

def load_json(p: Path):
    try:
        return json.loads(p.read_text(encoding='utf8'))
    except Exception as e:
        print('Failed to read JSON:', e)
        raise


def normalize_code(code):
    if code is None:
        return None
    c = str(code).strip()
    if not c or c.upper() == 'UNKNOWN':
        return None
    return c


def build_mapping(data):
    mapping = []
    brands = {b['id']: b['name'] for b in data.get('brands', [])}

    # models by id
    models = {m['id']: m for m in data.get('models', [])}

    # types by model id
    types_by_model = {}
    for t in data.get('types', []):
        types_by_model.setdefault(t['modelId'], []).append(t)

    # engines list
    engines = data.get('engines', [])

    for brand_id, brand_name in brands.items():
        # find models for this brand
        brand_models = [m for m in models.values() if m.get('brandId') == brand_id]
        for model in brand_models:
            model_name = model.get('name')
            for t in types_by_model.get(model['id'], []):
                type_name = t.get('typeName')
                # find engines matching model id and typeName
                matched = [e for e in engines if e.get('modelId') == model['id'] and e.get('typeName') == type_name]
                for e in matched:
                    entry = {
                        'brandName': brand_name,
                        'modelName': model_name,
                        'typeName': type_name,
                        'engineName': e.get('name'),
                        'engineCode': normalize_code(e.get('code')),
                        'startYear': e.get('startYear'),
                        'endYear': e.get('endYear')
                    }
                    mapping.append(entry)

    return mapping


def main():
    data = load_json(SRC)
    mapping = build_mapping(data)
    OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding='utf8')
    total = len(mapping)
    with_code = sum(1 for e in mapping if e['engineCode'])
    missing = total - with_code
    print(f'Wrote {OUT} — total entries: {total}, with engineCode: {with_code}, missing: {missing}')


if __name__ == '__main__':
    main()
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'project' / 'src' / 'supreme-tuning-master.json'
OUT = ROOT / 'engine_codes_mapping.json'

def load_json(p: Path):
    if not p.exists():
        print(f'ERROR: source file not found: {p}', file=sys.stderr)
        sys.exit(2)
    return json.loads(p.read_text(encoding='utf8'))

def main():
    data = load_json(SRC)

    mapping = {}

    models = data.get('models', [])
    types = data.get('types', [])
    engines = data.get('engines', [])

    # group types by modelId
    types_by_model = {}
    for t in types:
        types_by_model.setdefault(t.get('modelId'), []).append(t)

    # group engines by (modelId, typeName)
    engines_by_key = {}
    for e in engines:
        key = (e.get('modelId'), e.get('typeName'))
        engines_by_key.setdefault(key, []).append({
            'id': e.get('id'),
            'name': e.get('name'),
            'code': None if e.get('code') in (None, '', 'UNKNOWN') else e.get('code'),
            'startYear': e.get('startYear'),
            'endYear': e.get('endYear')
        })

    for brand in data.get('brands', []):
        brand_name = brand.get('name')
        mapping[brand_name] = {}

        brand_models = [m for m in models if m.get('brandId') == brand.get('id')]
        for m in brand_models:
            model_name = m.get('name')
            mapping[brand_name][model_name] = {}

            for t in types_by_model.get(m.get('id'), []):
                type_name = t.get('typeName')
                key = (m.get('id'), type_name)
                mapping[brand_name][model_name][type_name] = engines_by_key.get(key, [])

    OUT.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding='utf8')
    print('Wrote', OUT)

if __name__ == '__main__':
    main()
