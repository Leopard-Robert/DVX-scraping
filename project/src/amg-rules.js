/**
 * Mercedes-AMG CPC Upgrade Detection Logic
 * 
 * AMG models with M177/M178 V8 engines from 2018 onwards require CPC upgrade.
 */

// M177/M178 engine specifications
const AMG_V8_ENGINES = {
  'M177': {
    description: '4.0L V8 Biturbo',
    cpcRequiredFrom: 2018,
    models: [
      'C63', 'C63 S',
      'E63', 'E63 S',
      'AMG GT', 'AMG GT S', 'AMG GT C', 'AMG GT R',
      'GT 4-door', 'GT 53', 'GT 63', 'GT 63 S',
      'S63',
      'GLE63', 'GLE63 S',
      'GLS63',
      'CLS53', 'CLS63'
    ]
  },
  'M178': {
    description: '4.0L V8 Biturbo (AMG GT)',
    cpcRequiredFrom: 2018,
    models: [
      'AMG GT', 'AMG GT S', 'AMG GT C', 'AMG GT R',
      'AMG GT Black Series'
    ]
  }
};

// Model name patterns that indicate M177/M178 engines
const AMG_MODEL_PATTERNS = [
  // C-Class AMG
  { pattern: /C\s*63/i, engine: 'M177', minYear: 2018 },
  
  // E-Class AMG
  { pattern: /E\s*63/i, engine: 'M177', minYear: 2018 },
  
  // S-Class AMG
  { pattern: /S\s*63/i, engine: 'M177', minYear: 2018 },
  
  // AMG GT
  { pattern: /AMG\s*GT(?!\s*4)/i, engine: 'M178', minYear: 2018 }, // GT but not GT 4-door
  { pattern: /GT\s*[RSCB]/i, engine: 'M178', minYear: 2018 },
  { pattern: /GT\s*Black/i, engine: 'M178', minYear: 2018 },
  
  // GT 4-door
  { pattern: /GT\s*4/i, engine: 'M177', minYear: 2018 },
  { pattern: /GT\s*53/i, engine: 'M177', minYear: 2018 },
  { pattern: /GT\s*63/i, engine: 'M177', minYear: 2018 },
  
  // GLE AMG
  { pattern: /GLE\s*63/i, engine: 'M177', minYear: 2018 },
  
  // GLS AMG
  { pattern: /GLS\s*63/i, engine: 'M177', minYear: 2018 },
  
  // G-Class AMG
  { pattern: /G\s*63/i, engine: 'M177', minYear: 2018 },
  
  // CLS AMG
  { pattern: /CLS\s*63/i, engine: 'M177', minYear: 2018 }
];

/**
 * Extract engine code from description
 */
export function extractAMGEngineCode(engineDescription) {
  if (!engineDescription) return null;
  
  // Look for M177 or M178
  const match = engineDescription.match(/M17[78]/i);
  if (match) {
    return match[0].toUpperCase();
  }
  
  return null;
}

/**
 * Infer AMG engine from model name
 */
export function inferAMGEngine(modelName, engineName) {
  if (!modelName) return null;
  
  const combinedName = `${modelName} ${engineName || ''}`.trim();
  
  for (const pattern of AMG_MODEL_PATTERNS) {
    if (pattern.pattern.test(combinedName)) {
      return pattern.engine;
    }
  }
  
  return null;
}

export function parseYearRange(startYear, endYear, judgementYear) {
  
  if (endYear === 'now') {
    endYear = new Date().getFullYear();
  }
  if (startYear === null) {
    return endYear >= judgementYear;
  }
  if (startYear && endYear) {
    return startYear >= judgementYear || endYear >= judgementYear;
  }
}

/**
 * Extract year from type/platform string
 * Examples: "W213 - 2016 -> 2020", "C190 - 2015 -> ..."
 */
export function extractYearFromType(typeString) {
  if (!typeString) return null;
  
  // Look for year patterns like "2018", "2016 -> 2020", "2015 -> ..."
  const yearMatch = typeString.match(/(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1]);
  }
  
  return null;
}

/**
 * Determine if CPC upgrade is required
 */
export function requiresCPCUpgrade(engineData) {
  const { engineCode, modelName, engineName, type, year } = engineData;

  // 1. Check if it's M177 or M178
  if (!engineCode.includes('M 177')  && !engineCode.includes('M 178')) {
    return false;
  }
  
  
  // Try to get year from multiple sources
  let productionYear = year;
  if (!productionYear && type) {
    productionYear = extractYearFromType(type);
  }
  
  // If we have a year, check if it's >= 2018
  if (productionYear) {
    // return productionYear >= engineInfo.cpcRequiredFrom;
    return productionYear >= 2018;
  }
  
  // Conservative approach: if we detected M177/M178 but no year, assume CPC required
  // (most M177/M178 in the wild are 2018+)
  return true;
}

/**
 * Generate CPC upgrade object for AMG
 */
export function generateCPCUpgradeInfo(required = true) {
  if (!required) return null;
  
  return {
    required: true,
    note: 'Alle Mercedes-AMG modellen met M177/M178 V8 motoren (2018 en later) hebben een CPC-upgrade nodig voor optimale prestaties en betrouwbaarheid. Neem contact op voor meer informatie.'
  };
}

/**
 * Check if model name indicates it's an AMG
 */
export function isAMGModel(modelName) {
  if (!modelName) return false;
  
  // Check for AMG indicators
  return /AMG|63|53|GT/i.test(modelName);
}

export default {
  extractAMGEngineCode,
  inferAMGEngine,
  extractYearFromType,
  requiresCPCUpgrade,
  generateCPCUpgradeInfo,
  isAMGModel,
  parseYearRange,
  AMG_V8_ENGINES,
  AMG_MODEL_PATTERNS
};



console.log(requiresCPCUpgrade({
  engineCode: 'M 178',
  modelName: 'AMG GT 4-door Coupé',
  engineName: '43 AMG 367 PK',
  type: "2018 ->...",
  year: 2019
}))
