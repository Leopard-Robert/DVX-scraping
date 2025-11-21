const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'project', 'src', 'supreme-tuning-master.json');
const outPath = path.join(__dirname, '..', 'engine_codes_mapping.json');

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error('Failed to read/parse JSON:', err.message);
    process.exit(1);
  }
}

const data = loadJson(srcPath);

// Build convenient lookups
const modelsById = new Map(data.models.map(m => [m.id, m]));

// Group types by model id
const typesByModel = new Map();
for (const t of data.types || []) {
  if (!typesByModel.has(t.modelId)) typesByModel.set(t.modelId, []);
  typesByModel.get(t.modelId).push(t);
}

// Group engines by modelId + typeName key
const enginesByKey = new Map();
for (const e of data.engines || []) {
  const key = `${e.modelId}:::${e.typeName}`;
  if (!enginesByKey.has(key)) enginesByKey.set(key, []);
  enginesByKey.get(key).push(e);
}

const mapping = {};

for (const brand of data.brands || []) {
  mapping[brand.name] = {};

  // find models for this brand
  const brandModels = (data.models || []).filter(m => m.brandId === brand.id);
  for (const model of brandModels) {
    const modelName = model.name;
    mapping[brand.name][modelName] = {};

    const types = typesByModel.get(model.id) || [];
    for (const type of types) {
      const typeName = type.typeName;
      const key = `${model.id}:::${typeName}`;
      const engines = (enginesByKey.get(key) || []).map(e => ({
        id: e.id,
        name: e.name,
        code: e.code || null,
        startYear: e.startYear || null,
        endYear: e.endYear || null
      }));

      mapping[brand.name][modelName][typeName] = engines;
    }
  }
}

fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
console.log('Wrote mapping to', outPath);
